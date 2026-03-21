import { batch, observable, observe } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import type { AuthSession } from "lib/auth/types";
import {
    createOrResumeAudit,
    fetchAuditSession,
    PlayspaceAuditApiError,
    saveAuditDraft,
    submitAudit,
} from "lib/audit/api";
import { getSectionNote, getSectionResponses } from "lib/audit/selectors";
import { readPersistedAuditState, clearPersistedAuditState } from "lib/audit/storage";
import type {
    AuditDraftPatch,
    AuditPreAuditValues,
    AuditSectionState,
    AuditSession,
    DirtyPreAudit,
    DirtySections,
    PersistedAuditState,
} from "lib/audit/types";
import { persistedAuditStateSchema } from "lib/audit/types";
import { t } from "lib/i18n";
import { BASE_PLAYSPACE_INSTRUMENT } from "lib/instrument";
import { mmkvStorage } from "lib/storage/mmkv";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
 * Public surface exposed by the compatibility hook. Mirrors the old Zustand
 * store interface so existing selectors and `.getState()` callers keep working.
 */
interface PlayspaceAuditStoreState {
    readonly instrument: typeof BASE_PLAYSPACE_INSTRUMENT;
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
    readonly dirtySections: DirtySections;
    readonly dirtyPreAudit: DirtyPreAudit;

    hydrate: (accountId?: string | null) => Promise<void>;
    clearStoredState: (accountId?: string | null) => Promise<void>;
    ensurePlaceAudit: (
        session: AuthSession,
        placeId: string,
        executionMode?: "audit" | "survey" | "both",
    ) => Promise<AuditSession>;
    refreshAudit: (session: AuthSession, auditId: string) => Promise<AuditSession>;
    applyLocalQuestionAnswer: (
        placeId: string,
        sectionKey: string,
        questionKey: string,
        answers: Record<string, string>,
    ) => void;
    applyLocalSectionNote: (placeId: string, sectionKey: string, note: string) => void;
    applyLocalPreAudit: (placeId: string, values: Record<string, string | string[]>) => void;
    flushPendingChanges: (session: AuthSession) => Promise<FlushPendingChangesResult>;
    submitAuditSession: (session: AuthSession, auditId: string) => Promise<AuditSession>;
    clearError: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERSIST_DEBOUNCE_MS = 500;
const MMKV_KEY_PREFIX = "audit.state.v3";

// ---------------------------------------------------------------------------
// Observable state
// ---------------------------------------------------------------------------

/** Persistent audit data — auto-saved to MMKV via an observer. */
const auditData$ = observable({
    sessions_by_audit_id: {} as Record<string, AuditSession>,
    sessions_by_place_id: {} as Record<string, AuditSession>,
    dirty_sections: {} as DirtySections,
    dirty_pre_audit: {} as DirtyPreAudit,
    local_change_counter: 0,
    last_successful_sync_at: null as string | null,
});

/** Transient UI state — not persisted across restarts. */
const auditUI$ = observable({
    currentUserId: null as string | null,
    isHydrated: false,
    isLoadingAudit: false,
    isSavingDraft: false,
    isSyncing: false,
    errorMessage: null as string | null,
    lastSyncError: null as string | null,
});

// ---------------------------------------------------------------------------
// Module-level bookkeeping
// ---------------------------------------------------------------------------

let autoSaveDisposer: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let hydrateRequestCounter = 0;

// ---------------------------------------------------------------------------
// MMKV persistence infrastructure
// ---------------------------------------------------------------------------

function getStorageKey(userId: string): string {
    return `${MMKV_KEY_PREFIX}.${encodeURIComponent(userId)}`;
}

/**
 * Set up a debounced auto-save observer that writes the audit data
 * observable to MMKV whenever any tracked field changes.
 */
function setupAutoSave(userId: string): void {
    teardownAutoSave();
    const storageKey = getStorageKey(userId);

    autoSaveDisposer = observe(() => {
        const snapshot = auditData$.get();

        if (saveTimer !== null) {
            clearTimeout(saveTimer);
        }
        saveTimer = setTimeout(() => {
            try {
                mmkvStorage.set(storageKey, JSON.stringify(snapshot));
            } catch (err) {
                console.error("[audit-store] auto-save failed", err);
            }
            saveTimer = null;
        }, PERSIST_DEBOUNCE_MS);
    });
}

function teardownAutoSave(): void {
    if (autoSaveDisposer !== null) {
        autoSaveDisposer();
        autoSaveDisposer = null;
    }
    if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
}

/**
 * Flush the current observable state to MMKV immediately, bypassing debounce.
 * Used after sync operations where durability matters.
 */
function saveNow(): void {
    if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    const userId = auditUI$.currentUserId.peek();
    if (userId === null) {
        return;
    }
    try {
        mmkvStorage.set(getStorageKey(userId), JSON.stringify(auditData$.peek()));
    } catch (err) {
        console.error("[audit-store] immediate save failed", err);
    }
}

/**
 * Attempt to parse a raw MMKV string into validated audit data.
 */
function parseStoredAuditData(
    raw: string,
): Pick<
    PersistedAuditState,
    | "sessions_by_audit_id"
    | "sessions_by_place_id"
    | "dirty_sections"
    | "dirty_pre_audit"
    | "local_change_counter"
    | "last_successful_sync_at"
> | null {
    try {
        const parsed = persistedAuditStateSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}

/**
 * Apply a persisted data snapshot into the audit data observable in a
 * single batch to avoid multiple observer fires.
 */
function applyPersistedDataBatch(
    data: Pick<
        PersistedAuditState,
        | "sessions_by_audit_id"
        | "sessions_by_place_id"
        | "dirty_sections"
        | "dirty_pre_audit"
        | "local_change_counter"
        | "last_successful_sync_at"
    >,
): void {
    batch(() => {
        auditData$.sessions_by_audit_id.set(data.sessions_by_audit_id);
        auditData$.sessions_by_place_id.set(data.sessions_by_place_id);
        auditData$.dirty_sections.set(data.dirty_sections);
        auditData$.dirty_pre_audit.set(data.dirty_pre_audit);
        auditData$.local_change_counter.set(data.local_change_counter);
        auditData$.last_successful_sync_at.set(data.last_successful_sync_at);
    });
}

// ---------------------------------------------------------------------------
// Pure domain helpers (ported from the previous Zustand store)
// ---------------------------------------------------------------------------

function normalizeOptionalUserId(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function getDirtyAuditIds(dirtySections: DirtySections, dirtyPreAudit: DirtyPreAudit): string[] {
    const ids = new Set<string>([...Object.keys(dirtySections), ...Object.keys(dirtyPreAudit)]);
    return [...ids];
}

function markSectionDirty(
    current: DirtySections,
    auditId: string,
    sectionKey: string,
    version: number,
): DirtySections {
    const existing = current[auditId] ?? {};
    return {
        ...current,
        [auditId]: { ...existing, [sectionKey]: version },
    };
}

function markPreAuditDirty(
    current: DirtyPreAudit,
    auditId: string,
    version: number,
): DirtyPreAudit {
    return { ...current, [auditId]: version };
}

function cloneSectionResponses(
    value: Record<string, Record<string, string>> | undefined,
): Record<string, Record<string, string>> {
    if (value === undefined) {
        return {};
    }
    const next: Record<string, Record<string, string>> = {};
    for (const [qKey, qVal] of Object.entries(value)) {
        next[qKey] = { ...qVal };
    }
    return next;
}

function cloneSectionState(
    section: AuditSectionState | undefined,
    sectionKey: string,
): AuditSectionState {
    return {
        section_key: section?.section_key ?? sectionKey,
        responses: cloneSectionResponses(section?.responses),
        note: section?.note ?? null,
    };
}

function clonePreAuditValues(value: AuditPreAuditValues): AuditPreAuditValues {
    return {
        season: value.season,
        weather_conditions: [...value.weather_conditions],
        users_present: [...value.users_present],
        user_count: value.user_count,
        age_groups: [...value.age_groups],
        place_size: value.place_size,
    };
}

function applyQuestionAnswerToSession(
    session: AuditSession,
    sectionKey: string,
    questionKey: string,
    answers: Record<string, string>,
): AuditSession {
    const section = cloneSectionState(session.sections[sectionKey], sectionKey);
    const responses = cloneSectionResponses(section.responses);
    responses[questionKey] = { ...answers };

    return {
        ...session,
        sections: {
            ...session.sections,
            [sectionKey]: { ...section, responses },
        },
    };
}

function applySectionNoteToSession(
    session: AuditSession,
    sectionKey: string,
    note: string,
): AuditSession {
    const section = cloneSectionState(session.sections[sectionKey], sectionKey);
    return {
        ...session,
        sections: {
            ...session.sections,
            [sectionKey]: { ...section, note },
        },
    };
}

function applyPreAuditToSession(
    session: AuditSession,
    values: Record<string, string | string[] | null>,
): AuditSession {
    const cur = clonePreAuditValues(session.pre_audit);
    cur.season = readNullableStringValue(values["season"], cur.season);
    cur.weather_conditions = readStringArrayValue(
        values["weather_conditions"],
        cur.weather_conditions,
    );
    cur.users_present = readStringArrayValue(values["users_present"], cur.users_present);
    cur.user_count = readNullableStringValue(values["user_count"], cur.user_count);
    cur.age_groups = readStringArrayValue(values["age_groups"], cur.age_groups);
    cur.place_size = readNullableStringValue(values["place_size"], cur.place_size);
    return { ...session, pre_audit: cur };
}

function applySectionResponsesToSession(
    session: AuditSession,
    sectionKey: string,
    responses: Record<string, Record<string, string>>,
): AuditSession {
    const section = cloneSectionState(session.sections[sectionKey], sectionKey);
    return {
        ...session,
        sections: {
            ...session.sections,
            [sectionKey]: { ...section, responses: cloneSectionResponses(responses) },
        },
    };
}

function copySectionDraftFromSession(
    source: AuditSession,
    target: AuditSession,
    sectionKey: string,
): AuditSession {
    const sourceSection = cloneSectionState(source.sections[sectionKey], sectionKey);
    const sourceResponses = cloneSectionResponses(sourceSection.responses);
    let next = applySectionResponsesToSession(target, sectionKey, sourceResponses);
    next = applySectionNoteToSession(next, sectionKey, sourceSection.note ?? "");
    return next;
}

function copyPreAuditDraftFromSession(source: AuditSession, target: AuditSession): AuditSession {
    const preAudit = clonePreAuditValues(source.pre_audit);
    return applyPreAuditToSession(target, preAudit);
}

function mergeDirtyLocalDraftIntoServerSession(
    sessionsById: Record<string, AuditSession>,
    sessionsByPlace: Record<string, AuditSession>,
    dirtySections: DirtySections,
    dirtyPreAudit: DirtyPreAudit,
    nextSession: AuditSession,
): AuditSession {
    const localSession =
        sessionsById[nextSession.audit_id] ?? sessionsByPlace[nextSession.place_id];
    if (localSession === undefined) {
        return nextSession;
    }

    let merged = nextSession;
    const dirtySectionVersions = dirtySections[nextSession.audit_id] ?? {};
    for (const sectionKey of Object.keys(dirtySectionVersions)) {
        merged = copySectionDraftFromSession(localSession, merged, sectionKey);
    }

    if (dirtyPreAudit[nextSession.audit_id] !== undefined) {
        merged = copyPreAuditDraftFromSession(localSession, merged);
    }
    return merged;
}

function clearAcknowledgedDirtySections(
    current: DirtySections,
    patchSnapshot: PendingAuditPatchSnapshot,
): DirtySections {
    const existing = current[patchSnapshot.auditId];
    if (existing === undefined) {
        return current;
    }

    const remaining: Record<string, number> = {};
    for (const [sectionKey, version] of Object.entries(existing)) {
        const acked = patchSnapshot.sectionVersions[sectionKey];
        if (acked === undefined || version > acked) {
            remaining[sectionKey] = version;
        }
    }

    if (Object.keys(remaining).length === 0) {
        const next = { ...current };
        delete next[patchSnapshot.auditId];
        return next;
    }
    return { ...current, [patchSnapshot.auditId]: remaining };
}

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
    const next = { ...current };
    delete next[patchSnapshot.auditId];
    return next;
}

function buildPatchFromDirtyState(
    dirtySections: DirtySections,
    dirtyPreAudit: DirtyPreAudit,
    auditId: string,
    session: AuditSession,
): PendingAuditPatchSnapshot | null {
    const sectionVersions = dirtySections[auditId] ?? {};
    const dirtySectionKeys = Object.keys(sectionVersions);
    const preAuditVersion = dirtyPreAudit[auditId] ?? null;
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
        patch.pre_audit = {
            season: session.pre_audit.season,
            weather_conditions: [...session.pre_audit.weather_conditions],
            users_present: [...session.pre_audit.users_present],
            user_count: session.pre_audit.user_count,
            age_groups: [...session.pre_audit.age_groups],
            place_size: session.pre_audit.place_size,
        };
    }

    return {
        auditId,
        patch,
        sectionVersions: dirtySectionKeys.reduce<Record<string, number>>((result, key) => {
            result[key] = sectionVersions[key] ?? 0;
            return result;
        }, {}),
        preAuditVersion,
    };
}

function readNullableStringValue(value: unknown, fallback: string | null): string | null {
    if (typeof value !== "string") {
        return fallback;
    }
    return value.trim().length > 0 ? value : null;
}

function readStringArrayValue(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
        return [...fallback];
    }
    return value.filter((entry): entry is string => typeof entry === "string");
}

function formatAuditErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof PlayspaceAuditApiError) {
        const detailsSuffix =
            typeof error.details === "string" && error.details.trim().length > 0
                ? ` ${t("audit:errors.detailsLabel", { details: error.details.trim() })}`
                : "";

        if (error.statusCode === 403) {
            return `${t("audit:errors.accessDenied403")}${detailsSuffix}`;
        }
        if (error.statusCode === 0) {
            return t("audit:errors.offlineChangesSaved", { message: fallbackMessage });
        }
        if (error.statusCode > 0) {
            return `${t("audit:errors.httpFallback", {
                message: fallbackMessage,
                statusCode: error.statusCode,
            })}${detailsSuffix}`;
        }
        return `${t("audit:errors.networkFallback", { message: fallbackMessage })}${detailsSuffix}`;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return `${fallbackMessage} ${error.message.trim()}`;
    }
    return fallbackMessage;
}

// ---------------------------------------------------------------------------
// Action functions
// ---------------------------------------------------------------------------

/**
 * Hydrate the audit observable for an authenticated user. Reads from MMKV
 * first, falling back to legacy Secure Store for one-time migration.
 */
async function hydrate(accountId?: string | null): Promise<void> {
    const targetUserId = normalizeOptionalUserId(accountId);
    const currentUserId = auditUI$.currentUserId.peek();
    const alreadyHydrated = auditUI$.isHydrated.peek();
    if (alreadyHydrated && currentUserId === targetUserId) {
        return;
    }

    teardownAutoSave();
    const requestId = ++hydrateRequestCounter;

    batch(() => {
        auditData$.set({
            sessions_by_audit_id: {},
            sessions_by_place_id: {},
            dirty_sections: {},
            dirty_pre_audit: {},
            local_change_counter: 0,
            last_successful_sync_at: null,
        });
        auditUI$.set({
            currentUserId: targetUserId,
            isHydrated: false,
            isLoadingAudit: false,
            isSavingDraft: false,
            isSyncing: false,
            errorMessage: null,
            lastSyncError: null,
        });
    });

    if (targetUserId === null) {
        auditUI$.isHydrated.set(true);
        return;
    }

    const storageKey = getStorageKey(targetUserId);
    const rawMmkv = mmkvStorage.getString(storageKey);

    if (rawMmkv === undefined) {
        const legacyState = await readPersistedAuditState(targetUserId);
        if (requestId !== hydrateRequestCounter) return;
        if (legacyState !== null) {
            applyPersistedDataBatch(legacyState);
            saveNow();
            await clearPersistedAuditState(targetUserId);
        }
    } else {
        if (requestId !== hydrateRequestCounter) return;
        const data = parseStoredAuditData(rawMmkv);
        if (data !== null) {
            applyPersistedDataBatch(data);
        }
    }

    if (requestId !== hydrateRequestCounter) return;
    setupAutoSave(targetUserId);
    auditUI$.isHydrated.set(true);
}

async function clearStoredState(accountId?: string | null): Promise<void> {
    teardownAutoSave();
    hydrateRequestCounter += 1;
    const targetUserId = normalizeOptionalUserId(accountId) ?? auditUI$.currentUserId.peek();
    if (targetUserId !== null) {
        mmkvStorage.remove(getStorageKey(targetUserId));
    }
    batch(() => {
        auditData$.set({
            sessions_by_audit_id: {},
            sessions_by_place_id: {},
            dirty_sections: {},
            dirty_pre_audit: {},
            local_change_counter: 0,
            last_successful_sync_at: null,
        });
        auditUI$.set({
            currentUserId: null,
            isHydrated: true,
            isLoadingAudit: false,
            isSavingDraft: false,
            isSyncing: false,
            errorMessage: null,
            lastSyncError: null,
        });
    });
}

async function ensurePlaceAudit(
    session: AuthSession,
    placeId: string,
    executionMode?: "audit" | "survey" | "both",
): Promise<AuditSession> {
    batch(() => {
        auditUI$.isLoadingAudit.set(true);
        auditUI$.errorMessage.set(null);
    });

    try {
        const nextSession = await createOrResumeAudit(session, placeId, executionMode);
        const data = auditData$.peek();
        const merged = mergeDirtyLocalDraftIntoServerSession(
            data.sessions_by_audit_id,
            data.sessions_by_place_id,
            data.dirty_sections,
            data.dirty_pre_audit,
            nextSession,
        );
        batch(() => {
            auditData$.sessions_by_audit_id[merged.audit_id]?.set(merged);
            auditData$.sessions_by_place_id[merged.place_id]?.set(merged);
            auditUI$.isLoadingAudit.set(false);
            auditUI$.errorMessage.set(null);
        });
        saveNow();
        return merged;
    } catch (error) {
        const message = formatAuditErrorMessage(error, t("audit:errors.openFallback"));
        batch(() => {
            auditUI$.isLoadingAudit.set(false);
            auditUI$.errorMessage.set(message);
        });
        throw error;
    }
}

async function refreshAudit(session: AuthSession, auditId: string): Promise<AuditSession> {
    batch(() => {
        auditUI$.isLoadingAudit.set(true);
        auditUI$.errorMessage.set(null);
    });

    try {
        const nextSession = await fetchAuditSession(session, auditId);
        const data = auditData$.peek();
        const merged = mergeDirtyLocalDraftIntoServerSession(
            data.sessions_by_audit_id,
            data.sessions_by_place_id,
            data.dirty_sections,
            data.dirty_pre_audit,
            nextSession,
        );
        batch(() => {
            auditData$.sessions_by_audit_id[merged.audit_id]?.set(merged);
            auditData$.sessions_by_place_id[merged.place_id]?.set(merged);
            auditUI$.isLoadingAudit.set(false);
            auditUI$.errorMessage.set(null);
        });
        saveNow();
        return merged;
    } catch (error) {
        const message = formatAuditErrorMessage(error, t("audit:errors.refreshFallback"));
        batch(() => {
            auditUI$.isLoadingAudit.set(false);
            auditUI$.errorMessage.set(message);
        });
        throw error;
    }
}

function applyLocalQuestionAnswer(
    placeId: string,
    sectionKey: string,
    questionKey: string,
    answers: Record<string, string>,
): void {
    const session: AuditSession | undefined = auditData$.sessions_by_place_id[placeId]?.peek();
    if (session === undefined) {
        return;
    }

    const updated = applyQuestionAnswerToSession(session, sectionKey, questionKey, answers);
    const nextVersion = auditData$.local_change_counter.peek() + 1;
    const nextDirty = markSectionDirty(
        auditData$.dirty_sections.peek(),
        session.audit_id,
        sectionKey,
        nextVersion,
    );

    batch(() => {
        auditData$.sessions_by_audit_id[session.audit_id]?.set(updated);
        auditData$.sessions_by_place_id[placeId]?.set(updated);
        auditData$.dirty_sections.set(nextDirty);
        auditData$.local_change_counter.set(nextVersion);
    });
}

function applyLocalSectionNote(placeId: string, sectionKey: string, note: string): void {
    const session: AuditSession | undefined = auditData$.sessions_by_place_id[placeId]?.peek();
    if (session === undefined) {
        return;
    }

    const updated = applySectionNoteToSession(session, sectionKey, note);
    const nextVersion = auditData$.local_change_counter.peek() + 1;
    const nextDirty = markSectionDirty(
        auditData$.dirty_sections.peek(),
        session.audit_id,
        sectionKey,
        nextVersion,
    );

    batch(() => {
        auditData$.sessions_by_audit_id[session.audit_id]?.set(updated);
        auditData$.sessions_by_place_id[placeId]?.set(updated);
        auditData$.dirty_sections.set(nextDirty);
        auditData$.local_change_counter.set(nextVersion);
    });
}

function applyLocalPreAudit(placeId: string, values: Record<string, string | string[]>): void {
    const session: AuditSession | undefined = auditData$.sessions_by_place_id[placeId]?.peek();
    if (session === undefined) {
        return;
    }

    const updated = applyPreAuditToSession(session, values);
    const nextVersion = auditData$.local_change_counter.peek() + 1;
    const nextDirtyPreAudit = markPreAuditDirty(
        auditData$.dirty_pre_audit.peek(),
        session.audit_id,
        nextVersion,
    );

    batch(() => {
        auditData$.sessions_by_audit_id[session.audit_id]?.set(updated);
        auditData$.sessions_by_place_id[placeId]?.set(updated);
        auditData$.dirty_pre_audit.set(nextDirtyPreAudit);
        auditData$.local_change_counter.set(nextVersion);
    });
}

async function flushPendingChanges(session: AuthSession): Promise<FlushPendingChangesResult> {
    if (auditUI$.isSyncing.peek()) {
        return {
            attemptedAuditIds: [],
            failedAuditIds: [],
            remainingDirtyAuditIds: getDirtyAuditIds(
                auditData$.dirty_sections.peek(),
                auditData$.dirty_pre_audit.peek(),
            ),
        };
    }

    const allDirtyAuditIds = getDirtyAuditIds(
        auditData$.dirty_sections.peek(),
        auditData$.dirty_pre_audit.peek(),
    );
    if (allDirtyAuditIds.length === 0) {
        return { attemptedAuditIds: [], failedAuditIds: [], remainingDirtyAuditIds: [] };
    }

    batch(() => {
        auditUI$.isSyncing.set(true);
        auditUI$.lastSyncError.set(null);
    });
    const failedAuditIds: string[] = [];

    for (const auditId of allDirtyAuditIds) {
        const auditSession: AuditSession | undefined =
            auditData$.sessions_by_audit_id[auditId]?.peek();
        if (auditSession === undefined) {
            continue;
        }

        const patchSnapshot = buildPatchFromDirtyState(
            auditData$.dirty_sections.peek(),
            auditData$.dirty_pre_audit.peek(),
            auditId,
            auditSession,
        );
        if (patchSnapshot === null) {
            continue;
        }

        try {
            const updatedSession = await saveAuditDraft(session, auditId, patchSnapshot.patch);
            const data = auditData$.peek();
            const merged = mergeDirtyLocalDraftIntoServerSession(
                data.sessions_by_audit_id,
                data.sessions_by_place_id,
                data.dirty_sections,
                data.dirty_pre_audit,
                updatedSession,
            );
            const nextDirtySections = clearAcknowledgedDirtySections(
                auditData$.dirty_sections.peek(),
                patchSnapshot,
            );
            const nextDirtyPreAudit = clearAcknowledgedDirtyPreAudit(
                auditData$.dirty_pre_audit.peek(),
                patchSnapshot,
            );

            batch(() => {
                auditData$.sessions_by_audit_id[merged.audit_id]?.set(merged);
                auditData$.sessions_by_place_id[merged.place_id]?.set(merged);
                auditData$.dirty_sections.set(nextDirtySections);
                auditData$.dirty_pre_audit.set(nextDirtyPreAudit);
                auditUI$.lastSyncError.set(null);
                auditData$.last_successful_sync_at.set(new Date().toISOString());
            });
        } catch (error) {
            console.error("[audit-store] sync failed", error);
            const message = formatAuditErrorMessage(error, t("audit:errors.syncFallback"));
            auditUI$.lastSyncError.set(message);
            failedAuditIds.push(auditId);
        }
    }

    auditUI$.isSyncing.set(false);
    saveNow();

    return {
        attemptedAuditIds: allDirtyAuditIds,
        failedAuditIds,
        remainingDirtyAuditIds: getDirtyAuditIds(
            auditData$.dirty_sections.peek(),
            auditData$.dirty_pre_audit.peek(),
        ),
    };
}

async function submitAuditSession(session: AuthSession, auditId: string): Promise<AuditSession> {
    auditUI$.isSavingDraft.set(true);
    auditUI$.errorMessage.set(null);

    const auditSession: AuditSession | undefined = auditData$.sessions_by_audit_id[auditId]?.peek();
    if (auditSession !== undefined) {
        const flushResult = await flushPendingChanges(session);
        const hasFailedDraftSync = flushResult.failedAuditIds.includes(auditId);
        const hasRemainingDirtyChanges = flushResult.remainingDirtyAuditIds.includes(auditId);
        if (hasFailedDraftSync || hasRemainingDirtyChanges) {
            const message = t("audit:errors.submitNeedsUploadedDraft");
            batch(() => {
                auditUI$.isSavingDraft.set(false);
                auditUI$.errorMessage.set(message);
            });
            throw new Error(message);
        }
    }

    try {
        const nextSession = await submitAudit(session, auditId);
        batch(() => {
            auditData$.sessions_by_audit_id[nextSession.audit_id]?.set(nextSession);
            auditData$.sessions_by_place_id[nextSession.place_id]?.set(nextSession);
            auditUI$.isSavingDraft.set(false);
            auditUI$.errorMessage.set(null);
        });
        saveNow();
        return nextSession;
    } catch (error) {
        const message = formatAuditErrorMessage(error, t("audit:errors.submitFallback"));
        batch(() => {
            auditUI$.isSavingDraft.set(false);
            auditUI$.errorMessage.set(message);
        });
        throw error;
    }
}

function clearError(): void {
    auditUI$.errorMessage.set(null);
}

// ---------------------------------------------------------------------------
// Compatibility hook
// ---------------------------------------------------------------------------

/**
 * Action map returned by the compatibility hook. Stable references so
 * selectors that pick a single action don't cause extra re-renders.
 */
const actions = {
    hydrate,
    clearStoredState,
    ensurePlaceAudit,
    refreshAudit,
    applyLocalQuestionAnswer,
    applyLocalSectionNote,
    applyLocalPreAudit,
    flushPendingChanges,
    submitAuditSession,
    clearError,
} as const;

/**
 * Data property getters that call `.get()` so Legend State can track them
 * inside a `useSelector` callback. Each selector only accesses the
 * properties it actually reads, preserving fine-grained reactivity.
 */
const dataGetters: Record<string, () => unknown> = {
    instrument: () => BASE_PLAYSPACE_INSTRUMENT,
    sessionsByAuditId: () => auditData$.sessions_by_audit_id.get(),
    sessionsByPlaceId: () => auditData$.sessions_by_place_id.get(),
    currentUserId: () => auditUI$.currentUserId.get(),
    isHydrated: () => auditUI$.isHydrated.get(),
    isLoadingAudit: () => auditUI$.isLoadingAudit.get(),
    isSavingDraft: () => auditUI$.isSavingDraft.get(),
    isSyncing: () => auditUI$.isSyncing.get(),
    errorMessage: () => auditUI$.errorMessage.get(),
    lastSyncError: () => auditUI$.lastSyncError.get(),
    lastSuccessfulSyncAt: () => auditData$.last_successful_sync_at.get(),
    localChangeCounter: () => auditData$.local_change_counter.get(),
    dirtySections: () => auditData$.dirty_sections.get(),
    dirtyPreAudit: () => auditData$.dirty_pre_audit.get(),
};

/**
 * Proxy that lazily resolves observable values only when the selector
 * actually accesses them, so Legend State's tracking stays fine-grained.
 */
function createLazyState(): PlayspaceAuditStoreState {
    return new Proxy({} as PlayspaceAuditStoreState, {
        get(_target, prop: string | symbol): unknown {
            if (typeof prop === "symbol") {
                return undefined;
            }
            if (prop in actions) {
                return (actions as Record<string, unknown>)[prop];
            }
            const getter = dataGetters[prop];
            if (getter !== undefined) {
                return getter();
            }
            return undefined;
        },
    });
}

/**
 * Eagerly build a full state snapshot for non-React callers (`.getState()`).
 * Uses `.peek()` to read without tracking.
 */
function buildEagerState(): PlayspaceAuditStoreState {
    return {
        instrument: BASE_PLAYSPACE_INSTRUMENT,
        sessionsByAuditId: auditData$.sessions_by_audit_id.peek(),
        sessionsByPlaceId: auditData$.sessions_by_place_id.peek(),
        currentUserId: auditUI$.currentUserId.peek(),
        isHydrated: auditUI$.isHydrated.peek(),
        isLoadingAudit: auditUI$.isLoadingAudit.peek(),
        isSavingDraft: auditUI$.isSavingDraft.peek(),
        isSyncing: auditUI$.isSyncing.peek(),
        errorMessage: auditUI$.errorMessage.peek(),
        lastSyncError: auditUI$.lastSyncError.peek(),
        lastSuccessfulSyncAt: auditData$.last_successful_sync_at.peek(),
        localChangeCounter: auditData$.local_change_counter.peek(),
        dirtySections: auditData$.dirty_sections.peek(),
        dirtyPreAudit: auditData$.dirty_pre_audit.peek(),
        ...actions,
    };
}

/**
 * Zustand-compatible hook backed by Legend State observables.
 *
 * Usage is identical to the previous Zustand store:
 * ```
 * const session = usePlayspaceAuditStore(s => s.sessionsByPlaceId[placeId]);
 * const hydrate = usePlayspaceAuditStore(s => s.hydrate);
 * ```
 *
 * The Proxy-based lazy state ensures that only the observables accessed
 * inside the selector are tracked for re-render, matching Zustand's
 * fine-grained subscription behaviour.
 */
function usePlayspaceAuditStoreHook<T>(selector: (state: PlayspaceAuditStoreState) => T): T {
    return useSelector(() => selector(createLazyState()));
}

usePlayspaceAuditStoreHook.getState = buildEagerState;

export const usePlayspaceAuditStore = usePlayspaceAuditStoreHook;
