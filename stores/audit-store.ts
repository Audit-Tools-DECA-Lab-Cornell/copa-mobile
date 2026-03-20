import { create } from "zustand";
import type { AuthSession } from "lib/auth/types";
import {
    createOrResumeAudit,
    fetchAuditSession,
    PlayspaceAuditApiError,
    saveAuditDraft,
    submitAudit,
} from "lib/audit/api";
import { getSectionNote, getSectionResponses } from "lib/audit/selectors";
import {
    clearPersistedAuditState,
    readPersistedAuditState,
    savePersistedAuditState,
} from "lib/audit/storage";
import type {
    AuditDraftPatch,
    AuditSession,
    DirtyPreAudit,
    DirtySections,
    PersistedAuditState,
} from "lib/audit/types";
import i18n from "lib/i18n";
import { PLAYSPACE_INSTRUMENT } from "lib/instrument";

/** Debounce interval for disk persistence after local edits (ms). */
const PERSIST_DEBOUNCE_MS = 500;

let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let hydrateRequestCounter = 0;

interface PlayspaceAuditStoreState {
    readonly instrument: typeof PLAYSPACE_INSTRUMENT;
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly sessionsByPlaceId: Record<string, AuditSession>;
    readonly currentUserId: string | null;
    readonly isHydrated: boolean;
    readonly isLoadingAudit: boolean;
    readonly isSavingDraft: boolean;
    readonly isSyncing: boolean;
    readonly errorMessage: string | null;
    readonly lastSyncError: string | null;
    readonly lastSuccessfulSyncAt: string | null;
    readonly localChangeCounter: number;

    /**
     * Tracks which sections have locally-modified answers that have not yet
     * been pushed to the backend. Keyed by audit_id → section_key → version.
     */
    readonly dirtySections: DirtySections;

    /**
     * Audit IDs whose pre-audit data has been locally modified but not yet
     * pushed to the backend. Keyed by audit_id → version.
     */
    readonly dirtyPreAudit: DirtyPreAudit;

    hydrate: (accountId?: string | null) => Promise<void>;
    clearStoredState: (accountId?: string | null) => Promise<void>;

    ensurePlaceAudit: (
        session: AuthSession,
        placeId: string,
        executionMode?: "audit" | "survey" | "both",
    ) => Promise<AuditSession>;

    refreshAudit: (session: AuthSession, auditId: string) => Promise<AuditSession>;

    /**
     * Apply one question's processed answer map locally.
     * Updates `responses_json` in the in-memory session, marks the section as
     * dirty, and schedules a debounced disk persist.
     */
    applyLocalQuestionAnswer: (
        placeId: string,
        sectionKey: string,
        questionKey: string,
        answers: Record<string, string>,
    ) => void;

    /**
     * Apply a section note locally with the same offline-first semantics.
     */
    applyLocalSectionNote: (placeId: string, sectionKey: string, note: string) => void;

    /**
     * Apply pre-audit values locally with the same offline-first semantics.
     */
    applyLocalPreAudit: (placeId: string, values: Record<string, string | string[]>) => void;

    /**
     * Flush all dirty audits to the backend.  Silently swallows network
     * errors so the call can be retried later by the next sync trigger.
     */
    flushPendingChanges: (session: AuthSession) => Promise<FlushPendingChangesResult>;

    submitAuditSession: (session: AuthSession, auditId: string) => Promise<AuditSession>;
    clearError: () => void;
}

interface FlushPendingChangesResult {
    readonly attemptedAuditIds: string[];
    readonly failedAuditIds: string[];
    readonly remainingDirtyAuditIds: string[];
}

interface PendingAuditPatchSnapshot {
    readonly auditId: string;
    readonly patch: AuditDraftPatch;
    readonly sectionVersions: Record<string, number>;
    readonly preAuditVersion: number | null;
}

/**
 * Playspace audit store with offline-first local persistence and background sync.
 */
export const usePlayspaceAuditStore = create<PlayspaceAuditStoreState>((set, get) => ({
    instrument: PLAYSPACE_INSTRUMENT,
    sessionsByAuditId: {},
    sessionsByPlaceId: {},
    currentUserId: null,
    isHydrated: false,
    isLoadingAudit: false,
    isSavingDraft: false,
    isSyncing: false,
    errorMessage: null,
    lastSyncError: null,
    lastSuccessfulSyncAt: null,
    localChangeCounter: 0,
    dirtySections: {},
    dirtyPreAudit: {},

    hydrate: async (accountId) => {
        const targetUserId = normalizeOptionalUserId(accountId);
        const state = get();
        if (state.isHydrated && state.currentUserId === targetUserId) {
            return;
        }

        clearPersistDebounceTimer();
        const requestId = ++hydrateRequestCounter;
        set(() => ({
            instrument: PLAYSPACE_INSTRUMENT,
            sessionsByAuditId: {},
            sessionsByPlaceId: {},
            currentUserId: targetUserId,
            isHydrated: false,
            errorMessage: null,
            lastSyncError: null,
            dirtySections: {},
            dirtyPreAudit: {},
            lastSuccessfulSyncAt: null,
            localChangeCounter: 0,
        }));

        if (targetUserId === null) {
            set(() => ({ isHydrated: true }));
            return;
        }

        const persistedState = await readPersistedAuditState(targetUserId);
        if (requestId !== hydrateRequestCounter) {
            return;
        }
        if (persistedState === null) {
            set(() => ({
                currentUserId: targetUserId,
                isHydrated: true,
            }));
            return;
        }

        set(() => ({
            instrument: persistedState.instrument ?? PLAYSPACE_INSTRUMENT,
            sessionsByAuditId: persistedState.sessions_by_audit_id,
            sessionsByPlaceId: persistedState.sessions_by_place_id,
            currentUserId: targetUserId,
            dirtySections: persistedState.dirty_sections,
            dirtyPreAudit: persistedState.dirty_pre_audit,
            lastSuccessfulSyncAt: persistedState.last_successful_sync_at,
            localChangeCounter: persistedState.local_change_counter,
            isHydrated: true,
        }));
    },

    clearStoredState: async (accountId) => {
        clearPersistDebounceTimer();
        hydrateRequestCounter += 1;
        const targetUserId = normalizeOptionalUserId(accountId) ?? get().currentUserId;
        if (targetUserId !== null) {
            await clearPersistedAuditState(targetUserId);
        }
        set(() => ({
            instrument: PLAYSPACE_INSTRUMENT,
            sessionsByAuditId: {},
            sessionsByPlaceId: {},
            currentUserId: null,
            dirtySections: {},
            dirtyPreAudit: {},
            isHydrated: true,
            errorMessage: null,
            lastSyncError: null,
            lastSuccessfulSyncAt: null,
            localChangeCounter: 0,
        }));
    },

    ensurePlaceAudit: async (
        session: AuthSession,
        placeId: string,
        executionMode?: "audit" | "survey" | "both",
    ) => {
        set(() => ({ isLoadingAudit: true, errorMessage: null }));

        try {
            const nextSession = await createOrResumeAudit(session, placeId, executionMode);
            const mergedSession = mergeDirtyLocalDraftIntoServerSession(get(), nextSession);
            set((state) =>
                buildTrackedSessionState(state, mergedSession, {
                    isLoadingAudit: false,
                    errorMessage: null,
                }),
            );
            await persistSnapshotNow(get());
            return mergedSession;
        } catch (error) {
            const message = formatAuditErrorMessage(error, i18n.t("audit:errors.openFallback"));
            set(() => ({ isLoadingAudit: false, errorMessage: message }));
            throw error;
        }
    },

    refreshAudit: async (session: AuthSession, auditId: string) => {
        set(() => ({ isLoadingAudit: true, errorMessage: null }));

        try {
            const nextSession = await fetchAuditSession(session, auditId);
            const mergedSession = mergeDirtyLocalDraftIntoServerSession(get(), nextSession);
            set((state) =>
                buildTrackedSessionState(state, mergedSession, {
                    isLoadingAudit: false,
                    errorMessage: null,
                }),
            );
            await persistSnapshotNow(get());
            return mergedSession;
        } catch (error) {
            const message = formatAuditErrorMessage(error, i18n.t("audit:errors.refreshFallback"));
            set(() => ({ isLoadingAudit: false, errorMessage: message }));
            throw error;
        }
    },

    applyLocalQuestionAnswer: (
        placeId: string,
        sectionKey: string,
        questionKey: string,
        answers: Record<string, string>,
    ) => {
        const state = get();
        const session = state.sessionsByPlaceId[placeId];
        if (session === undefined) {
            return;
        }

        const updatedSession = applyQuestionAnswerToSession(
            session,
            sectionKey,
            questionKey,
            answers,
        );
        const nextVersion = state.localChangeCounter + 1;
        const nextDirty = markSectionDirty(
            state.dirtySections,
            session.audit_id,
            sectionKey,
            nextVersion,
        );

        set(() => ({
            sessionsByAuditId: { ...state.sessionsByAuditId, [session.audit_id]: updatedSession },
            sessionsByPlaceId: { ...state.sessionsByPlaceId, [placeId]: updatedSession },
            dirtySections: nextDirty,
            localChangeCounter: nextVersion,
        }));

        scheduleDebouncedPersist(get);
    },

    applyLocalSectionNote: (placeId: string, sectionKey: string, note: string) => {
        const state = get();
        const session = state.sessionsByPlaceId[placeId];
        if (session === undefined) {
            return;
        }

        const updatedSession = applySectionNoteToSession(session, sectionKey, note);
        const nextVersion = state.localChangeCounter + 1;
        const nextDirty = markSectionDirty(
            state.dirtySections,
            session.audit_id,
            sectionKey,
            nextVersion,
        );

        set(() => ({
            sessionsByAuditId: { ...state.sessionsByAuditId, [session.audit_id]: updatedSession },
            sessionsByPlaceId: { ...state.sessionsByPlaceId, [placeId]: updatedSession },
            dirtySections: nextDirty,
            localChangeCounter: nextVersion,
        }));

        scheduleDebouncedPersist(get);
    },

    applyLocalPreAudit: (placeId: string, values: Record<string, string | string[]>) => {
        const state = get();
        const session = state.sessionsByPlaceId[placeId];
        if (session === undefined) {
            return;
        }

        const updatedSession = applyPreAuditToSession(session, values);
        const nextVersion = state.localChangeCounter + 1;
        const nextDirtyPreAudit = markPreAuditDirty(
            state.dirtyPreAudit,
            session.audit_id,
            nextVersion,
        );

        set(() => ({
            sessionsByAuditId: { ...state.sessionsByAuditId, [session.audit_id]: updatedSession },
            sessionsByPlaceId: { ...state.sessionsByPlaceId, [placeId]: updatedSession },
            dirtyPreAudit: nextDirtyPreAudit,
            localChangeCounter: nextVersion,
        }));

        scheduleDebouncedPersist(get);
    },

    flushPendingChanges: async (session: AuthSession) => {
        const state = get();
        if (state.isSyncing) {
            return {
                attemptedAuditIds: [],
                failedAuditIds: [],
                remainingDirtyAuditIds: getDirtyAuditIds(state),
            };
        }

        const allDirtyAuditIds = getDirtyAuditIds(state);
        if (allDirtyAuditIds.length === 0) {
            return {
                attemptedAuditIds: [],
                failedAuditIds: [],
                remainingDirtyAuditIds: [],
            };
        }

        set(() => ({ isSyncing: true, lastSyncError: null }));
        const failedAuditIds: string[] = [];

        for (const auditId of allDirtyAuditIds) {
            const currentState = get();
            const auditSession = currentState.sessionsByAuditId[auditId];
            if (auditSession === undefined) {
                continue;
            }

            const patchSnapshot = buildPatchFromDirtyState(currentState, auditId, auditSession);
            if (patchSnapshot === null) {
                continue;
            }

            try {
                const updatedSession = await saveAuditDraft(session, auditId, patchSnapshot.patch);

                set((latestState) =>
                    applySyncedAuditPatchState(latestState, updatedSession, patchSnapshot),
                );
            } catch (error) {
                const message = formatAuditErrorMessage(error, i18n.t("audit:errors.syncFallback"));
                set(() => ({ lastSyncError: message }));
                failedAuditIds.push(auditId);
            }
        }

        set(() => ({ isSyncing: false }));
        await persistSnapshotNow(get());
        const latestState = get();
        return {
            attemptedAuditIds: allDirtyAuditIds,
            failedAuditIds,
            remainingDirtyAuditIds: getDirtyAuditIds(latestState),
        };
    },

    submitAuditSession: async (session: AuthSession, auditId: string) => {
        const state = get();
        set(() => ({ isSavingDraft: true, errorMessage: null }));

        const auditSession = state.sessionsByAuditId[auditId];
        if (auditSession !== undefined) {
            const flushResult = await get().flushPendingChanges(session);
            const hasFailedDraftSync = flushResult.failedAuditIds.includes(auditId);
            const hasRemainingDirtyChanges = flushResult.remainingDirtyAuditIds.includes(auditId);
            if (hasFailedDraftSync || hasRemainingDirtyChanges) {
                const message = i18n.t("audit:errors.submitNeedsUploadedDraft");
                set(() => ({
                    isSavingDraft: false,
                    errorMessage: message,
                }));
                throw new Error(message);
            }
        }

        try {
            const nextSession = await submitAudit(session, auditId);
            set((s) =>
                buildTrackedSessionState(s, nextSession, {
                    isSavingDraft: false,
                    errorMessage: null,
                }),
            );
            await persistSnapshotNow(get());
            return nextSession;
        } catch (error) {
            const message = formatAuditErrorMessage(error, i18n.t("audit:errors.submitFallback"));
            set(() => ({ isSavingDraft: false, errorMessage: message }));
            throw error;
        }
    },

    clearError: () => {
        set(() => ({ errorMessage: null }));
    },
}));

type PartialStoreState = Partial<PlayspaceAuditStoreState>;

/**
 * Track one updated session in both audit-id and place-id indexes.
 *
 * @param state Current store state.
 * @param auditSession Newly returned audit session.
 * @param extraFields Additional state fields to merge.
 * @returns Next partial store state.
 */
function buildTrackedSessionState(
    state: PlayspaceAuditStoreState,
    auditSession: AuditSession,
    extraFields: PartialStoreState,
): PartialStoreState {
    return {
        ...extraFields,
        sessionsByAuditId: {
            ...state.sessionsByAuditId,
            [auditSession.audit_id]: auditSession,
        },
        sessionsByPlaceId: {
            ...state.sessionsByPlaceId,
            [auditSession.place_id]: auditSession,
        },
    };
}

/**
 * Persist the complete store snapshot to disk immediately (non-debounced).
 *
 * @param state Current store snapshot.
 */
async function persistSnapshotNow(state: PlayspaceAuditStoreState): Promise<void> {
    if (state.currentUserId === null) {
        return;
    }

    const snapshot: PersistedAuditState = {
        storage_user_id: state.currentUserId,
        instrument: state.instrument,
        sessions_by_audit_id: state.sessionsByAuditId,
        sessions_by_place_id: state.sessionsByPlaceId,
        dirty_sections: state.dirtySections,
        dirty_pre_audit: state.dirtyPreAudit,
        local_change_counter: state.localChangeCounter,
        last_successful_sync_at: state.lastSuccessfulSyncAt,
    };
    await savePersistedAuditState(state.currentUserId, snapshot);
}

/**
 * Schedule a debounced disk persist so rapid answer taps coalesce into one
 * write.  The get() call is deferred to the timer callback to capture the
 * latest state at flush time.
 *
 * @param getState Zustand getter.
 */
function scheduleDebouncedPersist(getState: () => PlayspaceAuditStoreState): void {
    clearPersistDebounceTimer();
    persistDebounceTimer = setTimeout(() => {
        void persistSnapshotNow(getState());
        persistDebounceTimer = null;
    }, PERSIST_DEBOUNCE_MS);
}

/**
 * Clear any pending debounced persist timer.
 */
function clearPersistDebounceTimer(): void {
    if (persistDebounceTimer !== null) {
        clearTimeout(persistDebounceTimer);
        persistDebounceTimer = null;
    }
}

/**
 * Normalize optional user IDs to either a trimmed string or null.
 *
 * @param value Raw optional user identifier.
 * @returns Trimmed user identifier or null.
 */
function normalizeOptionalUserId(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

/**
 * Return all audit IDs with pending local work.
 *
 * @param state Current store state.
 * @returns Unique audit IDs with dirty sections or pre-audit data.
 */
function getDirtyAuditIds(
    state: Pick<PlayspaceAuditStoreState, "dirtySections" | "dirtyPreAudit">,
): string[] {
    const auditIds = new Set<string>([
        ...Object.keys(state.dirtySections),
        ...Object.keys(state.dirtyPreAudit),
    ]);
    return [...auditIds];
}

/**
 * Mark a section as dirty for one audit, returning the next versioned record.
 *
 * @param current Current dirty sections record.
 * @param auditId Audit identifier.
 * @param sectionKey Section that was modified.
 * @param version Monotonic local change version.
 * @returns Updated dirty sections record.
 */
function markSectionDirty(
    current: DirtySections,
    auditId: string,
    sectionKey: string,
    version: number,
): DirtySections {
    const existing = current[auditId] ?? {};
    return {
        ...current,
        [auditId]: {
            ...existing,
            [sectionKey]: version,
        },
    };
}

/**
 * Mark pre-audit data as dirty for one audit, returning the next version map.
 *
 * @param current Current dirty pre-audit record.
 * @param auditId Audit identifier.
 * @param version Monotonic local change version.
 * @returns Updated dirty pre-audit record.
 */
function markPreAuditDirty(
    current: DirtyPreAudit,
    auditId: string,
    version: number,
): DirtyPreAudit {
    return {
        ...current,
        [auditId]: version,
    };
}

/**
 * Shallow-clone an unknown nested value into a plain `Record<string, unknown>`.
 *
 * @param value Unknown JSON-like value.
 * @returns Shallow clone or empty record.
 */
function cloneRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null) {
        return {};
    }
    const clone: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        clone[key] = entry;
    }
    return clone;
}

/**
 * Deep-clone a nested question-to-answer record while keeping only strings.
 *
 * @param value Unknown nested response payload.
 * @returns Cloned nested string record.
 */
function cloneNestedStringRecord(value: unknown): Record<string, Record<string, string>> {
    if (typeof value !== "object" || value === null) {
        return {};
    }

    const nextRecord: Record<string, Record<string, string>> = {};
    for (const [questionKey, questionValue] of Object.entries(value)) {
        nextRecord[questionKey] = {};
        if (typeof questionValue !== "object" || questionValue === null) {
            continue;
        }

        for (const [scaleKey, scaleValue] of Object.entries(questionValue)) {
            if (typeof scaleValue === "string") {
                nextRecord[questionKey][scaleKey] = scaleValue;
            }
        }
    }
    return nextRecord;
}

/**
 * Clone persisted pre-audit values while preserving only string primitives and
 * string arrays.
 *
 * @param value Unknown pre-audit payload.
 * @returns Cloned pre-audit values.
 */
function clonePreAuditValues(value: unknown): Record<string, string | string[]> {
    if (typeof value !== "object" || value === null) {
        return {};
    }

    const nextValues: Record<string, string | string[]> = {};
    for (const [fieldKey, fieldValue] of Object.entries(value)) {
        if (typeof fieldValue === "string") {
            nextValues[fieldKey] = fieldValue;
            continue;
        }

        if (Array.isArray(fieldValue)) {
            nextValues[fieldKey] = fieldValue.filter(
                (entry): entry is string => typeof entry === "string",
            );
        }
    }
    return nextValues;
}

/**
 * Create a new AuditSession with one question's answers merged into
 * `responses_json.sections[sectionKey].responses[questionKey]`.
 *
 * @param session Current audit session.
 * @param sectionKey Target section.
 * @param questionKey Target question.
 * @param answers Processed scale→option answer map.
 * @returns Cloned session with updated responses.
 */
function applyQuestionAnswerToSession(
    session: AuditSession,
    sectionKey: string,
    questionKey: string,
    answers: Record<string, string>,
): AuditSession {
    const sections = cloneRecord(session.responses_json["sections"]);
    const section = cloneRecord(sections[sectionKey]);
    const responses = cloneRecord(section["responses"]);

    responses[questionKey] = answers;
    section["responses"] = responses;
    sections[sectionKey] = section;

    return {
        ...session,
        responses_json: { ...session.responses_json, sections },
    };
}

/**
 * Create a new AuditSession with a section note merged into
 * `responses_json.sections[sectionKey].note`.
 *
 * @param session Current audit session.
 * @param sectionKey Target section.
 * @param note New note text.
 * @returns Cloned session with updated note.
 */
function applySectionNoteToSession(
    session: AuditSession,
    sectionKey: string,
    note: string,
): AuditSession {
    const sections = cloneRecord(session.responses_json["sections"]);
    const section = cloneRecord(sections[sectionKey]);

    section["note"] = note;
    sections[sectionKey] = section;

    return {
        ...session,
        responses_json: { ...session.responses_json, sections },
    };
}

/**
 * Create a new AuditSession with pre-audit values merged into
 * `responses_json.pre_audit`.
 *
 * @param session Current audit session.
 * @param values Pre-audit form values.
 * @returns Cloned session with updated pre-audit data.
 */
function applyPreAuditToSession(
    session: AuditSession,
    values: Record<string, string | string[]>,
): AuditSession {
    const currentPreAudit = cloneRecord(session.responses_json["pre_audit"]);
    for (const [key, value] of Object.entries(values)) {
        currentPreAudit[key] = value;
    }

    return {
        ...session,
        responses_json: { ...session.responses_json, pre_audit: currentPreAudit },
    };
}

/**
 * Merge the current local dirty fields into a freshly loaded server session so
 * unsynced device edits remain visible after refresh or reopen.
 *
 * @param state Current store state.
 * @param nextSession Newly loaded server session.
 * @returns Server session with local dirty draft fields re-applied.
 */
function mergeDirtyLocalDraftIntoServerSession(
    state: PlayspaceAuditStoreState,
    nextSession: AuditSession,
): AuditSession {
    const localSession =
        state.sessionsByAuditId[nextSession.audit_id] ??
        state.sessionsByPlaceId[nextSession.place_id];
    if (localSession === undefined) {
        return nextSession;
    }

    let mergedSession = nextSession;
    const dirtySectionVersions = state.dirtySections[nextSession.audit_id] ?? {};
    for (const sectionKey of Object.keys(dirtySectionVersions)) {
        mergedSession = copySectionDraftFromSession(localSession, mergedSession, sectionKey);
    }

    if (state.dirtyPreAudit[nextSession.audit_id] !== undefined) {
        mergedSession = copyPreAuditDraftFromSession(localSession, mergedSession);
    }

    return mergedSession;
}

/**
 * Apply a successful draft-sync response while preserving any new edits that
 * landed during the in-flight request.
 *
 * @param state Latest store state.
 * @param updatedSession Server-confirmed audit session.
 * @param patchSnapshot Versioned patch metadata used for the request.
 * @returns Next partial store state.
 */
function applySyncedAuditPatchState(
    state: PlayspaceAuditStoreState,
    updatedSession: AuditSession,
    patchSnapshot: PendingAuditPatchSnapshot,
): PartialStoreState {
    const mergedSession = mergeDirtyLocalDraftIntoServerSession(state, updatedSession);
    const nextDirtySections = clearAcknowledgedDirtySections(state.dirtySections, patchSnapshot);
    const nextDirtyPreAudit = clearAcknowledgedDirtyPreAudit(state.dirtyPreAudit, patchSnapshot);

    return {
        ...buildTrackedSessionState(state, mergedSession, {}),
        dirtySections: nextDirtySections,
        dirtyPreAudit: nextDirtyPreAudit,
        lastSyncError: null,
        lastSuccessfulSyncAt: new Date().toISOString(),
    };
}

/**
 * Clear dirty section markers only for the versions acknowledged by the
 * current request. Newer local edits remain dirty.
 *
 * @param current Current dirty sections record.
 * @param patchSnapshot Versioned patch metadata used for the request.
 * @returns Updated dirty sections record.
 */
function clearAcknowledgedDirtySections(
    current: DirtySections,
    patchSnapshot: PendingAuditPatchSnapshot,
): DirtySections {
    const existingSections = current[patchSnapshot.auditId];
    if (existingSections === undefined) {
        return current;
    }

    const nextAuditSections: Record<string, number> = {};
    for (const [sectionKey, version] of Object.entries(existingSections)) {
        const acknowledgedVersion = patchSnapshot.sectionVersions[sectionKey];
        if (acknowledgedVersion === undefined || version > acknowledgedVersion) {
            nextAuditSections[sectionKey] = version;
        }
    }

    if (Object.keys(nextAuditSections).length === 0) {
        const remainingSections = { ...current };
        delete remainingSections[patchSnapshot.auditId];
        return remainingSections;
    }

    return {
        ...current,
        [patchSnapshot.auditId]: nextAuditSections,
    };
}

/**
 * Clear a dirty pre-audit marker only when the acknowledged version matches
 * the current store state.
 *
 * @param current Current dirty pre-audit record.
 * @param patchSnapshot Versioned patch metadata used for the request.
 * @returns Updated dirty pre-audit record.
 */
function clearAcknowledgedDirtyPreAudit(
    current: DirtyPreAudit,
    patchSnapshot: PendingAuditPatchSnapshot,
): DirtyPreAudit {
    if (patchSnapshot.preAuditVersion === null) {
        return current;
    }

    const currentVersion = current[patchSnapshot.auditId];
    if (currentVersion === undefined || currentVersion > patchSnapshot.preAuditVersion) {
        return current;
    }

    const remainingPreAudit = { ...current };
    delete remainingPreAudit[patchSnapshot.auditId];
    return remainingPreAudit;
}

/**
 * Copy one section's local draft from one session into another session.
 *
 * @param sourceSession Current local session with unsynced answers.
 * @param targetSession Fresh server session.
 * @param sectionKey Section to copy.
 * @returns Target session with the local section draft applied.
 */
function copySectionDraftFromSession(
    sourceSession: AuditSession,
    targetSession: AuditSession,
    sectionKey: string,
): AuditSession {
    const sections = cloneRecord(sourceSession.responses_json["sections"]);
    const sourceSection = cloneRecord(sections[sectionKey]);
    const sourceResponses = cloneNestedStringRecord(sourceSection["responses"]);
    const sourceNote = typeof sourceSection["note"] === "string" ? sourceSection["note"] : null;

    let nextSession = applySectionResponsesToSession(targetSession, sectionKey, sourceResponses);
    nextSession = applySectionNoteToSession(nextSession, sectionKey, sourceNote ?? "");
    return nextSession;
}

/**
 * Copy the local pre-audit draft from one session into another session.
 *
 * @param sourceSession Current local session with unsynced pre-audit values.
 * @param targetSession Fresh server session.
 * @returns Target session with the local pre-audit draft applied.
 */
function copyPreAuditDraftFromSession(
    sourceSession: AuditSession,
    targetSession: AuditSession,
): AuditSession {
    const preAudit = clonePreAuditValues(sourceSession.responses_json["pre_audit"]);
    return applyPreAuditToSession(targetSession, preAudit);
}

/**
 * Create a new AuditSession with one section's full responses map replaced.
 *
 * @param session Current audit session.
 * @param sectionKey Target section.
 * @param responses Section response payload.
 * @returns Cloned session with updated section responses.
 */
function applySectionResponsesToSession(
    session: AuditSession,
    sectionKey: string,
    responses: Record<string, Record<string, string>>,
): AuditSession {
    const sections = cloneRecord(session.responses_json["sections"]);
    const section = cloneRecord(sections[sectionKey]);
    section["responses"] = responses;
    sections[sectionKey] = section;

    return {
        ...session,
        responses_json: { ...session.responses_json, sections },
    };
}

/**
 * Build an `AuditDraftPatch` and capture the dirty versions included in the
 * request so only acknowledged edits are cleared afterwards.
 *
 * @param state Current store state.
 * @param auditId Target audit.
 * @param session Current audit session payload.
 * @returns Patch snapshot to send, or null when nothing is dirty.
 */
function buildPatchFromDirtyState(
    state: PlayspaceAuditStoreState,
    auditId: string,
    session: AuditSession,
): PendingAuditPatchSnapshot | null {
    const dirtySectionVersions = state.dirtySections[auditId] ?? {};
    const dirtySectionKeys = Object.keys(dirtySectionVersions);
    const preAuditVersion = state.dirtyPreAudit[auditId] ?? null;
    const hasPreAudit = preAuditVersion !== null;

    if (dirtySectionKeys.length === 0 && !hasPreAudit) {
        return null;
    }

    const sections: Record<
        string,
        { responses: Record<string, Record<string, string>>; note: string | null }
    > = {};
    for (const sectionKey of dirtySectionKeys) {
        const responses = getSectionResponses(session, sectionKey);
        const note = getSectionNote(session, sectionKey);
        sections[sectionKey] = { responses, note: note.length > 0 ? note : null };
    }

    const patch: AuditDraftPatch = { sections };

    if (hasPreAudit) {
        const preAuditRaw = cloneRecord(session.responses_json["pre_audit"]);
        patch.pre_audit = {
            season: typeof preAuditRaw["season"] === "string" ? preAuditRaw["season"] : null,
            weather_conditions: toStringArray(preAuditRaw["weather_conditions"]),
            users_present: toStringArray(preAuditRaw["users_present"]),
            user_count:
                typeof preAuditRaw["user_count"] === "string" ? preAuditRaw["user_count"] : null,
            age_groups: toStringArray(preAuditRaw["age_groups"]),
            place_size:
                typeof preAuditRaw["place_size"] === "string" ? preAuditRaw["place_size"] : null,
        };
    }

    return {
        auditId,
        patch,
        sectionVersions: dirtySectionKeys.reduce<Record<string, number>>((result, sectionKey) => {
            result[sectionKey] = dirtySectionVersions[sectionKey] ?? 0;
            return result;
        }, {}),
        preAuditVersion,
    };
}

/**
 * Safely coerce an unknown value into a string array.
 *
 * @param value Unknown value from responses_json.
 * @returns Filtered string array.
 */
function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((entry): entry is string => typeof entry === "string");
}

/**
 * Convert raw API/store errors into a user-visible, debug-friendly message.
 *
 * @param error Unknown thrown value.
 * @param fallbackMessage Generic fallback message.
 * @returns Readable error message including status and details when available.
 */
function formatAuditErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof PlayspaceAuditApiError) {
        const detailsSuffix =
            typeof error.details === "string" && error.details.trim().length > 0
                ? ` ${i18n.t("audit:errors.detailsLabel", {
                      details: error.details.trim(),
                  })}`
                : "";

        if (error.statusCode === 403) {
            return `${i18n.t("audit:errors.accessDenied403")}${detailsSuffix}`;
        }

        if (error.statusCode === 0) {
            return i18n.t("audit:errors.offlineChangesSaved", {
                message: fallbackMessage,
            });
        }

        if (error.statusCode > 0) {
            return `${i18n.t("audit:errors.httpFallback", {
                message: fallbackMessage,
                statusCode: error.statusCode,
            })}${detailsSuffix}`;
        }

        return `${i18n.t("audit:errors.networkFallback", {
            message: fallbackMessage,
        })}${detailsSuffix}`;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return `${fallbackMessage} ${error.message.trim()}`;
    }

    return fallbackMessage;
}
