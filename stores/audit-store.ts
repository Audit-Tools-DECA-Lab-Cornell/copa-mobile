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
import type { AuditDraftPatch, AuditSession, PersistedAuditState } from "lib/audit/types";
import { PLAYSPACE_INSTRUMENT } from "lib/instrument";

/** Debounce interval for disk persistence after local edits (ms). */
const PERSIST_DEBOUNCE_MS = 500;

let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

interface PlayspaceAuditStoreState {
    readonly instrument: typeof PLAYSPACE_INSTRUMENT;
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly sessionsByPlaceId: Record<string, AuditSession>;
    readonly isHydrated: boolean;
    readonly isLoadingAudit: boolean;
    readonly isSavingDraft: boolean;
    readonly isSyncing: boolean;
    readonly errorMessage: string | null;
    readonly lastSyncError: string | null;

    /**
     * Tracks which sections have locally-modified answers that have not yet
     * been pushed to the backend.  Keyed by audit_id → list of section_keys.
     */
    readonly dirtySections: Record<string, string[]>;

    /**
     * Audit IDs whose pre-audit data has been locally modified but not yet
     * pushed to the backend.
     */
    readonly dirtyPreAudit: string[];

    hydrate: () => Promise<void>;
    clearStoredState: () => Promise<void>;

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
     * errors so the call can be retried later by the sync timer.
     */
    flushPendingChanges: (session: AuthSession) => Promise<void>;

    submitAuditSession: (session: AuthSession, auditId: string) => Promise<AuditSession>;
    clearError: () => void;
}

/**
 * Playspace audit store with offline-first local persistence and background sync.
 */
export const usePlayspaceAuditStore = create<PlayspaceAuditStoreState>((set, get) => ({
    instrument: PLAYSPACE_INSTRUMENT,
    sessionsByAuditId: {},
    sessionsByPlaceId: {},
    isHydrated: false,
    isLoadingAudit: false,
    isSavingDraft: false,
    isSyncing: false,
    errorMessage: null,
    lastSyncError: null,
    dirtySections: {},
    dirtyPreAudit: [],

    hydrate: async () => {
        if (get().isHydrated) {
            return;
        }

        const persistedState = await readPersistedAuditState();
        if (persistedState === null) {
            set(() => ({ isHydrated: true }));
            return;
        }

        set(() => ({
            sessionsByAuditId: persistedState.sessions_by_audit_id,
            sessionsByPlaceId: persistedState.sessions_by_place_id,
            dirtySections: persistedState.dirty_sections,
            dirtyPreAudit: persistedState.dirty_pre_audit,
            isHydrated: true,
        }));
    },

    clearStoredState: async () => {
        await clearPersistedAuditState();
        set(() => ({
            sessionsByAuditId: {},
            sessionsByPlaceId: {},
            dirtySections: {},
            dirtyPreAudit: [],
            isHydrated: true,
            errorMessage: null,
            lastSyncError: null,
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
            set((state) =>
                buildTrackedSessionState(state, nextSession, {
                    isLoadingAudit: false,
                    errorMessage: null,
                }),
            );
            await persistSnapshotNow(get());
            return nextSession;
        } catch (error) {
            const message = formatAuditErrorMessage(error, "Unable to open audit.");
            set(() => ({ isLoadingAudit: false, errorMessage: message }));
            throw error;
        }
    },

    refreshAudit: async (session: AuthSession, auditId: string) => {
        set(() => ({ isLoadingAudit: true, errorMessage: null }));

        try {
            const nextSession = await fetchAuditSession(session, auditId);
            set((state) =>
                buildTrackedSessionState(state, nextSession, {
                    isLoadingAudit: false,
                    errorMessage: null,
                }),
            );
            await persistSnapshotNow(get());
            return nextSession;
        } catch (error) {
            const message = formatAuditErrorMessage(error, "Unable to refresh audit.");
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
        const nextDirty = markSectionDirty(state.dirtySections, session.audit_id, sectionKey);

        set(() => ({
            sessionsByAuditId: { ...state.sessionsByAuditId, [session.audit_id]: updatedSession },
            sessionsByPlaceId: { ...state.sessionsByPlaceId, [placeId]: updatedSession },
            dirtySections: nextDirty,
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
        const nextDirty = markSectionDirty(state.dirtySections, session.audit_id, sectionKey);

        set(() => ({
            sessionsByAuditId: { ...state.sessionsByAuditId, [session.audit_id]: updatedSession },
            sessionsByPlaceId: { ...state.sessionsByPlaceId, [placeId]: updatedSession },
            dirtySections: nextDirty,
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
        const nextDirtyPreAudit = state.dirtyPreAudit.includes(session.audit_id)
            ? state.dirtyPreAudit
            : [...state.dirtyPreAudit, session.audit_id];

        set(() => ({
            sessionsByAuditId: { ...state.sessionsByAuditId, [session.audit_id]: updatedSession },
            sessionsByPlaceId: { ...state.sessionsByPlaceId, [placeId]: updatedSession },
            dirtyPreAudit: nextDirtyPreAudit,
        }));

        scheduleDebouncedPersist(get);
    },

    flushPendingChanges: async (session: AuthSession) => {
        const state = get();
        if (state.isSyncing) {
            return;
        }

        const allDirtyAuditIds = new Set([
            ...Object.keys(state.dirtySections),
            ...state.dirtyPreAudit,
        ]);
        if (allDirtyAuditIds.size === 0) {
            return;
        }

        set(() => ({ isSyncing: true, lastSyncError: null }));

        for (const auditId of allDirtyAuditIds) {
            const auditSession = state.sessionsByAuditId[auditId];
            if (auditSession === undefined) {
                continue;
            }

            const patch = buildPatchFromDirtyState(state, auditId, auditSession);
            if (patch === null) {
                continue;
            }

            try {
                const updatedSession = await saveAuditDraft(session, auditId, patch);

                set((currentState) => {
                    const nextDirtySections = { ...currentState.dirtySections };
                    delete nextDirtySections[auditId];
                    const nextDirtyPreAudit = currentState.dirtyPreAudit.filter(
                        (id) => id !== auditId,
                    );

                    return {
                        ...buildTrackedSessionState(currentState, updatedSession, {}),
                        dirtySections: nextDirtySections,
                        dirtyPreAudit: nextDirtyPreAudit,
                    };
                });
            } catch (error) {
                const message = formatAuditErrorMessage(error, "Background sync failed.");
                set(() => ({ lastSyncError: message }));
            }
        }

        set(() => ({ isSyncing: false }));
        await persistSnapshotNow(get());
    },

    submitAuditSession: async (session: AuthSession, auditId: string) => {
        const state = get();
        set(() => ({ isSavingDraft: true, errorMessage: null }));

        const auditSession = state.sessionsByAuditId[auditId];
        if (auditSession !== undefined) {
            const patch = buildPatchFromDirtyState(state, auditId, auditSession);
            if (patch !== null) {
                try {
                    await saveAuditDraft(session, auditId, patch);
                    set((s) => {
                        const nextDirtySections = { ...s.dirtySections };
                        delete nextDirtySections[auditId];
                        return {
                            dirtySections: nextDirtySections,
                            dirtyPreAudit: s.dirtyPreAudit.filter((id) => id !== auditId),
                        };
                    });
                } catch {
                    /* submit attempt follows regardless */
                }
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
            const message = formatAuditErrorMessage(error, "Unable to submit audit.");
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
    const snapshot: PersistedAuditState = {
        instrument: state.instrument,
        sessions_by_audit_id: state.sessionsByAuditId,
        sessions_by_place_id: state.sessionsByPlaceId,
        dirty_sections: state.dirtySections,
        dirty_pre_audit: state.dirtyPreAudit,
    };
    await savePersistedAuditState(snapshot);
}

/**
 * Schedule a debounced disk persist so rapid answer taps coalesce into one
 * write.  The get() call is deferred to the timer callback to capture the
 * latest state at flush time.
 *
 * @param getState Zustand getter.
 */
function scheduleDebouncedPersist(getState: () => PlayspaceAuditStoreState): void {
    if (persistDebounceTimer !== null) {
        clearTimeout(persistDebounceTimer);
    }
    persistDebounceTimer = setTimeout(() => {
        void persistSnapshotNow(getState());
    }, PERSIST_DEBOUNCE_MS);
}

/**
 * Mark a section as dirty for one audit, returning the next dirty-sections map.
 *
 * @param current Current dirty sections record.
 * @param auditId Audit identifier.
 * @param sectionKey Section that was modified.
 * @returns Updated dirty sections record.
 */
function markSectionDirty(
    current: Record<string, string[]>,
    auditId: string,
    sectionKey: string,
): Record<string, string[]> {
    const existing = current[auditId] ?? [];
    if (existing.includes(sectionKey)) {
        return current;
    }
    return { ...current, [auditId]: [...existing, sectionKey] };
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
 * Build an `AuditDraftPatch` from the current session state for only the
 * sections and pre-audit data marked as dirty.
 *
 * @param state Current store state.
 * @param auditId Target audit.
 * @param session Current audit session payload.
 * @returns Patch to send, or null when nothing is dirty.
 */
function buildPatchFromDirtyState(
    state: PlayspaceAuditStoreState,
    auditId: string,
    session: AuditSession,
): AuditDraftPatch | null {
    const dirtySectionKeys = state.dirtySections[auditId] ?? [];
    const hasPreAudit = state.dirtyPreAudit.includes(auditId);

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

    return patch;
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
                ? ` Details: ${error.details.trim()}`
                : "";

        if (error.statusCode === 403) {
            return `Access denied (403): you are not allowed to access this place or audit.${detailsSuffix}`;
        }

        if (error.statusCode === 0) {
            return `${fallbackMessage} You appear to be offline — changes are saved locally and will sync when you reconnect.`;
        }

        if (error.statusCode > 0) {
            return `${fallbackMessage} (HTTP ${error.statusCode}).${detailsSuffix}`;
        }

        return `${fallbackMessage} (network error).${detailsSuffix}`;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return `${fallbackMessage} ${error.message.trim()}`;
    }

    return fallbackMessage;
}
