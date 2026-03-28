import { batch, observable, observe } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import type { AuthSession } from "lib/auth/types";
import {
    applyFetchedSessionSnapshot,
    applyLocalExecutionModeChange,
    applyLocalPreAuditChange,
    applyLocalQuestionAnswerChange,
    applyLocalSectionNoteChange,
    applySaveAcknowledgement,
    buildDraftPatchSnapshot,
    buildSyncableAuditIds,
    canEditAuditInputs,
    canonicalizeSessionsByAuditIdForHydrate,
    clearAcknowledgedDirtyState,
    createKeyedSingleFlightRunner,
    deriveGlobalSyncFeedback,
    finishSubmitResolution,
    getOwnedAuditSessionForResponse,
    listPendingSubmitResolutionAuditIds,
    phaseForSaveConflictRecovery,
    phaseForSubmitConflictAction,
    pruneCanonicalSubmittedAuditState,
    pruneAuditStateForAudit,
    resolveSaveConflict,
    resolveSubmitConflict,
    restorePersistedSyncState,
    shouldAttemptAutomaticSync,
    shouldReopenOnAutomaticSyncTrigger,
    shouldRetrySubmitResolution,
    shouldRetrySubmitResolutionOnTrigger,
    transitionPhaseOnExplicitSubmitRetry,
    type PendingAuditPatchSnapshot,
    type AutomaticSyncTrigger,
    transitionPhaseOnLocalEdit,
    transitionPhaseOnManualRetry,
    upsertAuditSessionMaps,
} from "lib/audit/store-sync-core";
import {
    createOrResumeAudit,
    fetchAuditSession,
    PlayspaceAuditApiError,
    saveAuditDraft,
    submitAudit,
} from "lib/audit/api";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import type {
    AuditDraftSave,
    AuditSession,
    AuditSyncStateByAuditId,
    DirtyMeta,
    DirtyPreAudit,
    DirtySections,
    ExecutionMode,
    PlayspaceInstrument,
    PersistedAuditState,
    QuestionResponsePayload,
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

interface FlushSingleAuditResult {
    readonly auditId: string;
    readonly failed: boolean;
}

/**
 * Public surface exposed by the compatibility hook. Mirrors the old Zustand
 * store interface so existing selectors and `.getState()` callers keep working.
 */
interface PlayspaceAuditStoreState {
    readonly instrument: PlayspaceInstrument;
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly sessionsByPairKey: Record<string, AuditSession>;
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
    readonly dirtyMeta: DirtyMeta;
    readonly syncStateByAuditId: AuditSyncStateByAuditId;

    hydrate: (accountId?: string | null) => Promise<void>;
    clearStoredState: (accountId?: string | null) => Promise<void>;
    ensurePlaceAudit: (
        session: AuthSession,
        projectId: string,
        placeId: string,
        executionMode?: "audit" | "survey" | "both",
    ) => Promise<AuditSession>;
    refreshAudit: (session: AuthSession, auditId: string) => Promise<AuditSession>;
    applyLocalExecutionMode: (pairKey: string, executionMode: ExecutionMode) => void;
    applyLocalQuestionAnswer: (
        pairKey: string,
        sectionKey: string,
        questionKey: string,
        answers: QuestionResponsePayload,
    ) => void;
    applyLocalSectionNote: (pairKey: string, sectionKey: string, note: string) => void;
    applyLocalPreAudit: (pairKey: string, values: Record<string, string | string[]>) => void;
    prepareAutomaticSyncAudits: (trigger: AutomaticSyncTrigger) => string[];
    flushPendingChanges: (session: AuthSession) => Promise<FlushPendingChangesResult>;
    submitAuditSession: (session: AuthSession, auditId: string) => Promise<AuditSession>;
    clearError: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERSIST_DEBOUNCE_MS = 500;
const MMKV_KEY_PREFIX = "audit.state.v4";

type PersistedAuditDataSnapshot = Pick<
    PersistedAuditState,
    | "instrument"
    | "sessions_by_audit_id"
    | "sessions_by_pair_key"
    | "dirty_sections"
    | "dirty_pre_audit"
    | "dirty_meta"
    | "sync_state_by_audit_id"
    | "local_change_counter"
    | "last_successful_sync_at"
>;

// ---------------------------------------------------------------------------
// Observable state
// ---------------------------------------------------------------------------

/** Persistent audit data — auto-saved to MMKV via an observer. */
const auditData$ = observable({
    instrument: BASE_PLAYSPACE_INSTRUMENT,
    sessions_by_audit_id: {} as Record<string, AuditSession>,
    sessions_by_pair_key: {} as Record<string, AuditSession>,
    dirty_sections: {} as DirtySections,
    dirty_pre_audit: {} as DirtyPreAudit,
    dirty_meta: {} as DirtyMeta,
    sync_state_by_audit_id: {} as AuditSyncStateByAuditId,
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
function parseStoredAuditData(raw: string): PersistedAuditDataSnapshot | null {
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
function applyPersistedDataBatch(data: PersistedAuditDataSnapshot): void {
    batch(() => {
        auditData$.instrument.set(data.instrument ?? BASE_PLAYSPACE_INSTRUMENT);
        auditData$.sessions_by_audit_id.set(data.sessions_by_audit_id);
        auditData$.sessions_by_pair_key.set(data.sessions_by_pair_key);
        auditData$.dirty_sections.set(data.dirty_sections);
        auditData$.dirty_pre_audit.set(data.dirty_pre_audit);
        auditData$.dirty_meta.set(data.dirty_meta);
        auditData$.sync_state_by_audit_id.set(data.sync_state_by_audit_id);
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

/**
 * Determine whether one audit still has any pending dirty fragments.
 *
 * @param auditId Audit under evaluation.
 * @param dirtyMeta Current dirty meta map.
 * @param dirtyPreAudit Current dirty pre-audit map.
 * @param dirtySections Current dirty section map.
 * @returns True when at least one fragment remains dirty.
 */
function hasDirtyFragmentsForAudit(
    auditId: string,
    dirtyMeta: DirtyMeta,
    dirtyPreAudit: DirtyPreAudit,
    dirtySections: DirtySections,
): boolean {
    return (
        dirtyMeta[auditId] !== undefined ||
        dirtyPreAudit[auditId] !== undefined ||
        Object.keys(dirtySections[auditId] ?? {}).length > 0
    );
}

/**
 * Read the effective sync phase for one audit, defaulting dirty fragments
 * without an explicit phase entry back to `dirty`.
 *
 * @param auditId Audit under evaluation.
 * @param syncStateByAuditId Current persisted per-audit sync map.
 * @param dirtyMeta Current dirty meta map.
 * @param dirtyPreAudit Current dirty pre-audit map.
 * @param dirtySections Current dirty section map.
 * @returns Effective phase for selection and transition decisions.
 */
function readEffectiveAuditSyncPhase(
    auditId: string,
    syncStateByAuditId: AuditSyncStateByAuditId,
    dirtyMeta: DirtyMeta,
    dirtyPreAudit: DirtyPreAudit,
    dirtySections: DirtySections,
): "idle" | "dirty" | (typeof syncStateByAuditId)[string]["phase"] {
    const syncState = syncStateByAuditId[auditId];
    if (syncState !== undefined) {
        return syncState.phase;
    }

    return hasDirtyFragmentsForAudit(auditId, dirtyMeta, dirtyPreAudit, dirtySections)
        ? "dirty"
        : "idle";
}

/**
 * Build the current set of audits eligible for automatic save sync attempts.
 *
 * @returns Syncable audit ids whose effective phase is `dirty`.
 */
function buildCurrentAutomaticSyncAuditIds(): string[] {
    const data = auditData$.peek();
    return buildSyncableAuditIds({
        sessionsByAuditId: data.sessions_by_audit_id,
        dirtySections: data.dirty_sections,
        dirtyPreAudit: data.dirty_pre_audit,
        dirtyMeta: data.dirty_meta,
    }).filter((auditId) =>
        shouldAttemptAutomaticSync(
            readEffectiveAuditSyncPhase(
                auditId,
                data.sync_state_by_audit_id,
                data.dirty_meta,
                data.dirty_pre_audit,
                data.dirty_sections,
            ),
        ),
    );
}

/**
 * Create a stable sync-state record for one audit.
 *
 * @param currentSyncStateByAuditId Existing per-audit sync map.
 * @param auditId Audit to update.
 * @param nextPhase Next phase to persist.
 * @param updatedAt ISO timestamp for the transition.
 * @param detail Optional detail message for blocked or review states.
 * @returns Updated sync-state map.
 */
function writeAuditSyncState(
    currentSyncStateByAuditId: AuditSyncStateByAuditId,
    auditId: string,
    nextPhase: AuditSyncStateByAuditId[string]["phase"],
    updatedAt: string,
    detail: string | null = null,
): AuditSyncStateByAuditId {
    return {
        ...currentSyncStateByAuditId,
        [auditId]: {
            phase: nextPhase,
            detail,
            updated_at: updatedAt,
        },
    };
}

/**
 * Map a failed sync request onto the approved blocked phase machine.
 *
 * @param error Thrown sync error.
 * @returns Per-audit blocked phase for the failure.
 */
function deriveBlockedPhaseFromError(error: unknown): AuditSyncStateByAuditId[string]["phase"] {
    if (error instanceof PlayspaceAuditApiError) {
        if (error.statusCode === 0) {
            return "blocked_network";
        }
        if (error.statusCode === 401 || error.statusCode === 403) {
            return "blocked_auth";
        }
        if (error.statusCode === 400) {
            return "blocked_validation";
        }
    }

    return "blocked_server";
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
 * Hydrate the audit observable for an authenticated user from MMKV only.
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
            instrument: BASE_PLAYSPACE_INSTRUMENT,
            sessions_by_audit_id: {},
            sessions_by_pair_key: {},
            dirty_sections: {},
            dirty_pre_audit: {},
            dirty_meta: {},
            sync_state_by_audit_id: {},
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

    if (rawMmkv !== undefined) {
        if (requestId !== hydrateRequestCounter) return;
        const data = parseStoredAuditData(rawMmkv);
        if (data === null) {
            mmkvStorage.remove(storageKey);
        } else {
            const canonicalSessionsByAuditId = canonicalizeSessionsByAuditIdForHydrate({
                sessionsByAuditId: data.sessions_by_audit_id,
                sessionsByPairKey: data.sessions_by_pair_key,
            });
            const restoredPersistedSyncState = restorePersistedSyncState({
                sessionsByAuditId: canonicalSessionsByAuditId,
                sessionsByPairKey: data.sessions_by_pair_key,
                dirtyMeta: data.dirty_meta,
                dirtyPreAudit: data.dirty_pre_audit,
                dirtySections: data.dirty_sections,
                syncStateByAuditId: data.sync_state_by_audit_id,
            });
            applyPersistedDataBatch({
                ...data,
                sessions_by_audit_id: canonicalSessionsByAuditId,
                dirty_meta: restoredPersistedSyncState.dirtyMeta,
                dirty_pre_audit: restoredPersistedSyncState.dirtyPreAudit,
                dirty_sections: restoredPersistedSyncState.dirtySections,
                sync_state_by_audit_id: restoredPersistedSyncState.syncStateByAuditId,
            });
            saveNow();
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
            instrument: BASE_PLAYSPACE_INSTRUMENT,
            sessions_by_audit_id: {},
            sessions_by_pair_key: {},
            dirty_sections: {},
            dirty_pre_audit: {},
            dirty_meta: {},
            sync_state_by_audit_id: {},
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
    projectId: string,
    placeId: string,
    executionMode?: "audit" | "survey" | "both",
): Promise<AuditSession> {
    batch(() => {
        auditUI$.isLoadingAudit.set(true);
        auditUI$.errorMessage.set(null);
    });

    try {
        const nextSession = await createOrResumeAudit(session, placeId, projectId, executionMode);
        const data = auditData$.peek();
        const currentSession =
            data.sessions_by_audit_id[nextSession.audit_id] ??
            data.sessions_by_pair_key[
                getProjectPlaceKey(nextSession.project_id, nextSession.place_id)
            ] ??
            null;
        const merged = applyFetchedSessionSnapshot({
            currentSession,
            fetchedSession: nextSession,
            dirtyMeta: data.dirty_meta,
            dirtyPreAudit: data.dirty_pre_audit,
            dirtySections: data.dirty_sections,
        }).session;
        const nextPrunedSubmittedAuditState = pruneCanonicalSubmittedAuditState({
            session: merged,
            dirtyMeta: data.dirty_meta,
            dirtyPreAudit: data.dirty_pre_audit,
            dirtySections: data.dirty_sections,
            syncStateByAuditId: data.sync_state_by_audit_id,
        });
        const nextSessionMaps = upsertAuditSessionMaps({
            sessionsByAuditId: data.sessions_by_audit_id,
            sessionsByPairKey: data.sessions_by_pair_key,
            nextSession: merged,
        });
        const nextPrunedAuditState = pruneAuditStateForAudit({
            auditId: nextSessionMaps.displacedAuditId,
            dirtyMeta: nextPrunedSubmittedAuditState.dirtyMeta,
            dirtyPreAudit: nextPrunedSubmittedAuditState.dirtyPreAudit,
            dirtySections: nextPrunedSubmittedAuditState.dirtySections,
            syncStateByAuditId: nextPrunedSubmittedAuditState.syncStateByAuditId,
        });
        batch(() => {
            auditData$.instrument.set(merged.instrument);
            auditData$.sessions_by_audit_id.set(nextSessionMaps.sessionsByAuditId);
            auditData$.sessions_by_pair_key.set(nextSessionMaps.sessionsByPairKey);
            auditData$.dirty_meta.set(nextPrunedAuditState.dirtyMeta);
            auditData$.dirty_sections.set(nextPrunedAuditState.dirtySections);
            auditData$.dirty_pre_audit.set(nextPrunedAuditState.dirtyPreAudit);
            auditData$.sync_state_by_audit_id.set(nextPrunedAuditState.syncStateByAuditId);
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
        const currentSession =
            data.sessions_by_audit_id[nextSession.audit_id] ??
            data.sessions_by_pair_key[
                getProjectPlaceKey(nextSession.project_id, nextSession.place_id)
            ] ??
            null;
        const merged = applyFetchedSessionSnapshot({
            currentSession,
            fetchedSession: nextSession,
            dirtyMeta: data.dirty_meta,
            dirtyPreAudit: data.dirty_pre_audit,
            dirtySections: data.dirty_sections,
        }).session;
        const nextPrunedSubmittedAuditState = pruneCanonicalSubmittedAuditState({
            session: merged,
            dirtyMeta: data.dirty_meta,
            dirtyPreAudit: data.dirty_pre_audit,
            dirtySections: data.dirty_sections,
            syncStateByAuditId: data.sync_state_by_audit_id,
        });
        const nextSessionMaps = upsertAuditSessionMaps({
            sessionsByAuditId: data.sessions_by_audit_id,
            sessionsByPairKey: data.sessions_by_pair_key,
            nextSession: merged,
        });
        const nextPrunedAuditState = pruneAuditStateForAudit({
            auditId: nextSessionMaps.displacedAuditId,
            dirtyMeta: nextPrunedSubmittedAuditState.dirtyMeta,
            dirtyPreAudit: nextPrunedSubmittedAuditState.dirtyPreAudit,
            dirtySections: nextPrunedSubmittedAuditState.dirtySections,
            syncStateByAuditId: nextPrunedSubmittedAuditState.syncStateByAuditId,
        });
        batch(() => {
            auditData$.instrument.set(merged.instrument);
            auditData$.sessions_by_audit_id.set(nextSessionMaps.sessionsByAuditId);
            auditData$.sessions_by_pair_key.set(nextSessionMaps.sessionsByPairKey);
            auditData$.dirty_meta.set(nextPrunedAuditState.dirtyMeta);
            auditData$.dirty_sections.set(nextPrunedAuditState.dirtySections);
            auditData$.dirty_pre_audit.set(nextPrunedAuditState.dirtyPreAudit);
            auditData$.sync_state_by_audit_id.set(nextPrunedAuditState.syncStateByAuditId);
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

function applyLocalExecutionMode(pairKey: string, executionMode: ExecutionMode): void {
    const session: AuditSession | undefined = auditData$.sessions_by_pair_key[pairKey]?.peek();
    if (session === undefined) {
        return;
    }

    const currentPhase = readEffectiveAuditSyncPhase(
        session.audit_id,
        auditData$.sync_state_by_audit_id.peek(),
        auditData$.dirty_meta.peek(),
        auditData$.dirty_pre_audit.peek(),
        auditData$.dirty_sections.peek(),
    );
    if (
        !canEditAuditInputs({
            session,
            phase: currentPhase,
        })
    ) {
        return;
    }

    const nextVersion = auditData$.local_change_counter.peek() + 1;
    const result = applyLocalExecutionModeChange({
        session,
        executionMode,
        nextVersion,
        dirtyMeta: auditData$.dirty_meta.peek(),
    });
    if (!result.didChange) {
        return;
    }

    const updatedAt = new Date().toISOString();
    const nextSyncStateByAuditId =
        currentPhase === "saving" ||
        currentPhase === "submitting" ||
        currentPhase === "resolving_submit" ||
        currentPhase === "submitted"
            ? auditData$.sync_state_by_audit_id.peek()
            : writeAuditSyncState(
                  auditData$.sync_state_by_audit_id.peek(),
                  session.audit_id,
                  transitionPhaseOnLocalEdit({
                      currentPhase,
                      updatedAt,
                  }).phase,
                  updatedAt,
              );

    batch(() => {
        auditData$.sessions_by_audit_id[session.audit_id]?.set(result.session);
        auditData$.sessions_by_pair_key[pairKey]?.set(result.session);
        auditData$.dirty_meta.set(result.dirtyMeta);
        auditData$.sync_state_by_audit_id.set(nextSyncStateByAuditId);
        auditData$.local_change_counter.set(nextVersion);
    });
}

function applyLocalQuestionAnswer(
    pairKey: string,
    sectionKey: string,
    questionKey: string,
    answers: QuestionResponsePayload,
): void {
    const session: AuditSession | undefined = auditData$.sessions_by_pair_key[pairKey]?.peek();
    if (session === undefined) {
        return;
    }

    const currentPhase = readEffectiveAuditSyncPhase(
        session.audit_id,
        auditData$.sync_state_by_audit_id.peek(),
        auditData$.dirty_meta.peek(),
        auditData$.dirty_pre_audit.peek(),
        auditData$.dirty_sections.peek(),
    );
    if (
        !canEditAuditInputs({
            session,
            phase: currentPhase,
        })
    ) {
        return;
    }

    const nextVersion = auditData$.local_change_counter.peek() + 1;
    const result = applyLocalQuestionAnswerChange({
        session,
        sectionKey,
        questionKey,
        answers,
        nextVersion,
        dirtySections: auditData$.dirty_sections.peek(),
    });
    if (!result.didChange) {
        return;
    }

    const updatedAt = new Date().toISOString();
    const nextSyncStateByAuditId =
        currentPhase === "saving" ||
        currentPhase === "submitting" ||
        currentPhase === "resolving_submit" ||
        currentPhase === "submitted"
            ? auditData$.sync_state_by_audit_id.peek()
            : writeAuditSyncState(
                  auditData$.sync_state_by_audit_id.peek(),
                  session.audit_id,
                  transitionPhaseOnLocalEdit({
                      currentPhase,
                      updatedAt,
                  }).phase,
                  updatedAt,
              );

    batch(() => {
        auditData$.sessions_by_audit_id[session.audit_id]?.set(result.session);
        auditData$.sessions_by_pair_key[pairKey]?.set(result.session);
        auditData$.dirty_sections.set(result.dirtySections);
        auditData$.sync_state_by_audit_id.set(nextSyncStateByAuditId);
        auditData$.local_change_counter.set(nextVersion);
    });
}

function applyLocalSectionNote(pairKey: string, sectionKey: string, note: string): void {
    const session: AuditSession | undefined = auditData$.sessions_by_pair_key[pairKey]?.peek();
    if (session === undefined) {
        return;
    }

    const currentPhase = readEffectiveAuditSyncPhase(
        session.audit_id,
        auditData$.sync_state_by_audit_id.peek(),
        auditData$.dirty_meta.peek(),
        auditData$.dirty_pre_audit.peek(),
        auditData$.dirty_sections.peek(),
    );
    if (
        !canEditAuditInputs({
            session,
            phase: currentPhase,
        })
    ) {
        return;
    }

    const nextVersion = auditData$.local_change_counter.peek() + 1;
    const result = applyLocalSectionNoteChange({
        session,
        sectionKey,
        note,
        nextVersion,
        dirtySections: auditData$.dirty_sections.peek(),
    });
    if (!result.didChange) {
        return;
    }

    const updatedAt = new Date().toISOString();
    const nextSyncStateByAuditId =
        currentPhase === "saving" ||
        currentPhase === "submitting" ||
        currentPhase === "resolving_submit" ||
        currentPhase === "submitted"
            ? auditData$.sync_state_by_audit_id.peek()
            : writeAuditSyncState(
                  auditData$.sync_state_by_audit_id.peek(),
                  session.audit_id,
                  transitionPhaseOnLocalEdit({
                      currentPhase,
                      updatedAt,
                  }).phase,
                  updatedAt,
              );

    batch(() => {
        auditData$.sessions_by_audit_id[session.audit_id]?.set(result.session);
        auditData$.sessions_by_pair_key[pairKey]?.set(result.session);
        auditData$.dirty_sections.set(result.dirtySections);
        auditData$.sync_state_by_audit_id.set(nextSyncStateByAuditId);
        auditData$.local_change_counter.set(nextVersion);
    });
}

function applyLocalPreAudit(pairKey: string, values: Record<string, string | string[]>): void {
    const session: AuditSession | undefined = auditData$.sessions_by_pair_key[pairKey]?.peek();
    if (session === undefined) {
        return;
    }

    const currentPhase = readEffectiveAuditSyncPhase(
        session.audit_id,
        auditData$.sync_state_by_audit_id.peek(),
        auditData$.dirty_meta.peek(),
        auditData$.dirty_pre_audit.peek(),
        auditData$.dirty_sections.peek(),
    );
    if (
        !canEditAuditInputs({
            session,
            phase: currentPhase,
        })
    ) {
        return;
    }

    const nextVersion = auditData$.local_change_counter.peek() + 1;
    const result = applyLocalPreAuditChange({
        session,
        values,
        nextVersion,
        dirtyPreAudit: auditData$.dirty_pre_audit.peek(),
    });
    if (!result.didChange) {
        return;
    }

    const updatedAt = new Date().toISOString();
    const nextSyncStateByAuditId =
        currentPhase === "saving" ||
        currentPhase === "submitting" ||
        currentPhase === "resolving_submit" ||
        currentPhase === "submitted"
            ? auditData$.sync_state_by_audit_id.peek()
            : writeAuditSyncState(
                  auditData$.sync_state_by_audit_id.peek(),
                  session.audit_id,
                  transitionPhaseOnLocalEdit({
                      currentPhase,
                      updatedAt,
                  }).phase,
                  updatedAt,
              );

    batch(() => {
        auditData$.sessions_by_audit_id[session.audit_id]?.set(result.session);
        auditData$.sessions_by_pair_key[pairKey]?.set(result.session);
        auditData$.dirty_pre_audit.set(result.dirtyPreAudit);
        auditData$.sync_state_by_audit_id.set(nextSyncStateByAuditId);
        auditData$.local_change_counter.set(nextVersion);
    });
}

/**
 * Promote trigger-eligible blocked audits back to `dirty` before an automatic
 * sync attempt.
 *
 * @param trigger Automatic trigger that reopened the retry path.
 * @returns Audit ids whose phase moved back to dirty.
 */
function prepareAutomaticSyncAudits(trigger: AutomaticSyncTrigger): string[] {
    const data = auditData$.peek();
    const syncableAuditIds = buildSyncableAuditIds({
        sessionsByAuditId: data.sessions_by_audit_id,
        dirtySections: data.dirty_sections,
        dirtyPreAudit: data.dirty_pre_audit,
        dirtyMeta: data.dirty_meta,
    });
    const candidateAuditIds = new Set<string>([
        ...syncableAuditIds,
        ...Object.keys(data.sync_state_by_audit_id),
    ]);
    const updatedAt = new Date().toISOString();
    const nextSyncStateByAuditId = { ...data.sync_state_by_audit_id };
    const reopenedAuditIds: string[] = [];

    for (const auditId of candidateAuditIds) {
        const currentSyncState = data.sync_state_by_audit_id[auditId];
        if (currentSyncState === undefined) {
            continue;
        }

        const hasDirtyFragments = hasDirtyFragmentsForAudit(
            auditId,
            data.dirty_meta,
            data.dirty_pre_audit,
            data.dirty_sections,
        );

        if (
            hasDirtyFragments &&
            shouldReopenOnAutomaticSyncTrigger({
                currentPhase: currentSyncState.phase,
                trigger,
            })
        ) {
            const nextSyncState = transitionPhaseOnManualRetry({
                currentPhase: currentSyncState.phase,
                updatedAt,
            });
            nextSyncStateByAuditId[auditId] = nextSyncState;
            reopenedAuditIds.push(auditId);
            continue;
        }

        if (
            shouldRetrySubmitResolutionOnTrigger({
                currentPhase: currentSyncState.phase,
                hasDirtyFragments,
                trigger,
            })
        ) {
            nextSyncStateByAuditId[auditId] = {
                phase: "resolving_submit",
                detail: null,
                updated_at: updatedAt,
            };
            reopenedAuditIds.push(auditId);
        }
    }

    if (reopenedAuditIds.length > 0) {
        auditData$.sync_state_by_audit_id.set(nextSyncStateByAuditId);
    }

    return reopenedAuditIds;
}

/**
 * Reopen manual-attention submit phases before an explicit user submit retry.
 *
 * @param auditId Audit the user is attempting to submit explicitly.
 */
function prepareAuditForExplicitSubmitRetry(auditId: string): void {
    const data = auditData$.peek();
    const currentSyncState = data.sync_state_by_audit_id[auditId];
    if (currentSyncState === undefined) {
        return;
    }

    const nextSyncState = transitionPhaseOnExplicitSubmitRetry({
        currentPhase: currentSyncState.phase,
        updatedAt: new Date().toISOString(),
    });
    if (nextSyncState.phase === currentSyncState.phase) {
        return;
    }

    auditData$.sync_state_by_audit_id.set(
        writeAuditSyncState(
            data.sync_state_by_audit_id,
            auditId,
            nextSyncState.phase,
            nextSyncState.updated_at,
            nextSyncState.detail,
        ),
    );
}

/**
 * Resolve any audits restored from an in-flight submit by fetching the latest
 * canonical session before the normal save pass runs.
 *
 * @param session Authenticated mobile session.
 */
async function resolvePendingSubmitStates(
    session: AuthSession,
    requestedAuditIds?: readonly string[],
): Promise<void> {
    const data = auditData$.peek();
    for (const auditId of listPendingSubmitResolutionAuditIds({
        syncStateByAuditId: data.sync_state_by_audit_id,
        dirtyMeta: data.dirty_meta,
        dirtyPreAudit: data.dirty_pre_audit,
        dirtySections: data.dirty_sections,
        ...(requestedAuditIds === undefined ? {} : { requestedAuditIds }),
    })) {
        const data = auditData$.peek();
        const currentSyncState = data.sync_state_by_audit_id[auditId];
        if (
            currentSyncState === undefined ||
            !shouldRetrySubmitResolution({
                currentPhase: currentSyncState.phase,
                hasDirtyFragments: hasDirtyFragmentsForAudit(
                    auditId,
                    data.dirty_meta,
                    data.dirty_pre_audit,
                    data.dirty_sections,
                ),
            })
        ) {
            continue;
        }

        const currentSession = data.sessions_by_audit_id[auditId];
        if (currentSession === undefined) {
            const nextSyncStateByAuditId = { ...data.sync_state_by_audit_id };
            delete nextSyncStateByAuditId[auditId];
            auditData$.sync_state_by_audit_id.set(nextSyncStateByAuditId);
            continue;
        }

        try {
            const latestSession = await fetchAuditSession(session, auditId);
            const latestData = auditData$.peek();
            const latestSyncState = latestData.sync_state_by_audit_id[auditId];
            if (
                latestSyncState === undefined ||
                !shouldRetrySubmitResolution({
                    currentPhase: latestSyncState.phase,
                    hasDirtyFragments: hasDirtyFragmentsForAudit(
                        auditId,
                        latestData.dirty_meta,
                        latestData.dirty_pre_audit,
                        latestData.dirty_sections,
                    ),
                })
            ) {
                continue;
            }

            const ownedCurrentSession =
                latestData.sessions_by_audit_id[latestSession.audit_id] ??
                latestData.sessions_by_pair_key[
                    getProjectPlaceKey(latestSession.project_id, latestSession.place_id)
                ] ??
                null;
            const rebasedSession = applyFetchedSessionSnapshot({
                currentSession: ownedCurrentSession,
                fetchedSession: latestSession,
                dirtyMeta: latestData.dirty_meta,
                dirtyPreAudit: latestData.dirty_pre_audit,
                dirtySections: latestData.dirty_sections,
            }).session;
            const resolved = finishSubmitResolution({
                latestSession: rebasedSession,
                currentDirtyMeta: latestData.dirty_meta,
                currentDirtyPreAudit: latestData.dirty_pre_audit,
                currentDirtySections: latestData.dirty_sections,
            });
            const updatedAt = new Date().toISOString();
            const nextSessionMaps = upsertAuditSessionMaps({
                sessionsByAuditId: latestData.sessions_by_audit_id,
                sessionsByPairKey: latestData.sessions_by_pair_key,
                nextSession: resolved.session,
            });
            const nextSyncStateByAuditId =
                resolved.phase === "submitted"
                    ? writeAuditSyncState(
                          latestData.sync_state_by_audit_id,
                          auditId,
                          "submitted",
                          updatedAt,
                      )
                    : writeAuditSyncState(
                          latestData.sync_state_by_audit_id,
                          auditId,
                          resolved.phase,
                          updatedAt,
                      );
            const nextPrunedSubmittedAuditState = pruneCanonicalSubmittedAuditState({
                session: resolved.session,
                dirtyMeta: resolved.dirtyMeta,
                dirtyPreAudit: resolved.dirtyPreAudit,
                dirtySections: resolved.dirtySections,
                syncStateByAuditId: nextSyncStateByAuditId,
            });
            const nextPrunedAuditState = pruneAuditStateForAudit({
                auditId: nextSessionMaps.displacedAuditId,
                dirtyMeta: nextPrunedSubmittedAuditState.dirtyMeta,
                dirtyPreAudit: nextPrunedSubmittedAuditState.dirtyPreAudit,
                dirtySections: nextPrunedSubmittedAuditState.dirtySections,
                syncStateByAuditId: nextPrunedSubmittedAuditState.syncStateByAuditId,
            });

            batch(() => {
                auditData$.instrument.set(resolved.session.instrument);
                auditData$.sessions_by_audit_id.set(nextSessionMaps.sessionsByAuditId);
                auditData$.sessions_by_pair_key.set(nextSessionMaps.sessionsByPairKey);
                auditData$.dirty_meta.set(nextPrunedAuditState.dirtyMeta);
                auditData$.dirty_sections.set(nextPrunedAuditState.dirtySections);
                auditData$.dirty_pre_audit.set(nextPrunedAuditState.dirtyPreAudit);
                auditData$.sync_state_by_audit_id.set(nextPrunedAuditState.syncStateByAuditId);
                if (resolved.phase !== "dirty") {
                    auditData$.last_successful_sync_at.set(updatedAt);
                }
            });
        } catch (error) {
            console.error("[audit-store] submit resolution failed", error);
            const updatedAt = new Date().toISOString();
            const message = formatAuditErrorMessage(error, t("audit:errors.submitFallback"));
            auditData$.sync_state_by_audit_id.set(
                writeAuditSyncState(
                    auditData$.sync_state_by_audit_id.peek(),
                    auditId,
                    deriveBlockedPhaseFromError(error),
                    updatedAt,
                    message,
                ),
            );
        }
    }
}

function acknowledgeSave(saveResult: AuditDraftSave, snapshot: PendingAuditPatchSnapshot): void {
    const currentSessionsByAuditId = auditData$.sessions_by_audit_id.peek();
    const currentSessionsByPairKey = auditData$.sessions_by_pair_key.peek();
    const currentSession = getOwnedAuditSessionForResponse({
        auditId: snapshot.auditId,
        sessionsByAuditId: currentSessionsByAuditId,
        sessionsByPairKey: currentSessionsByPairKey,
    });
    if (currentSession === null) {
        return;
    }

    const acknowledgedSession = applySaveAcknowledgement({
        session: currentSession,
        saveResult,
    });
    const nextSessionMaps = upsertAuditSessionMaps({
        sessionsByAuditId: currentSessionsByAuditId,
        sessionsByPairKey: currentSessionsByPairKey,
        nextSession: acknowledgedSession,
    });
    const nextDirtyState = clearAcknowledgedDirtyState({
        auditId: snapshot.auditId,
        currentDirtySections: auditData$.dirty_sections.peek(),
        currentDirtyPreAudit: auditData$.dirty_pre_audit.peek(),
        currentDirtyMeta: auditData$.dirty_meta.peek(),
        snapshot,
    });
    const updatedAt = new Date().toISOString();
    const nextPhase = hasDirtyFragmentsForAudit(
        snapshot.auditId,
        nextDirtyState.dirtyMeta,
        nextDirtyState.dirtyPreAudit,
        nextDirtyState.dirtySections,
    )
        ? "dirty"
        : "idle";
    const nextSyncStateByAuditId = writeAuditSyncState(
        auditData$.sync_state_by_audit_id.peek(),
        snapshot.auditId,
        nextPhase,
        updatedAt,
    );

    batch(() => {
        auditData$.instrument.set(acknowledgedSession.instrument);
        auditData$.sessions_by_audit_id.set(nextSessionMaps.sessionsByAuditId);
        auditData$.sessions_by_pair_key.set(nextSessionMaps.sessionsByPairKey);
        auditData$.dirty_meta.set(nextDirtyState.dirtyMeta);
        auditData$.dirty_sections.set(nextDirtyState.dirtySections);
        auditData$.dirty_pre_audit.set(nextDirtyState.dirtyPreAudit);
        auditData$.sync_state_by_audit_id.set(nextSyncStateByAuditId);
        auditData$.last_successful_sync_at.set(updatedAt);
    });
}

async function flushSingleAuditPendingChangesInternal(
    session: AuthSession,
    auditId: string,
): Promise<FlushSingleAuditResult> {
    const data = auditData$.peek();
    const currentPhase = readEffectiveAuditSyncPhase(
        auditId,
        data.sync_state_by_audit_id,
        data.dirty_meta,
        data.dirty_pre_audit,
        data.dirty_sections,
    );
    if (currentPhase !== "dirty") {
        return {
            auditId,
            failed: false,
        };
    }

    const auditSession = data.sessions_by_audit_id[auditId];
    if (auditSession === undefined) {
        return {
            auditId,
            failed: false,
        };
    }

    const patchSnapshot = buildDraftPatchSnapshot({
        auditId,
        session: auditSession,
        dirtyMeta: data.dirty_meta,
        dirtyPreAudit: data.dirty_pre_audit,
        dirtySections: data.dirty_sections,
    });
    if (patchSnapshot === null) {
        auditData$.sync_state_by_audit_id.set(
            writeAuditSyncState(
                auditData$.sync_state_by_audit_id.peek(),
                auditId,
                "idle",
                new Date().toISOString(),
            ),
        );
        return {
            auditId,
            failed: false,
        };
    }

    const savingAt = new Date().toISOString();
    auditData$.sync_state_by_audit_id.set(
        writeAuditSyncState(auditData$.sync_state_by_audit_id.peek(), auditId, "saving", savingAt),
    );

    try {
        const saveResult = await saveAuditDraft(session, auditId, patchSnapshot.patch);
        acknowledgeSave(saveResult, patchSnapshot);
        return {
            auditId,
            failed: false,
        };
    } catch (error) {
        if (error instanceof PlayspaceAuditApiError && error.statusCode === 409) {
            try {
                const latestSession = await fetchAuditSession(session, auditId);
                const currentData = auditData$.peek();
                const currentSession =
                    currentData.sessions_by_audit_id[latestSession.audit_id] ??
                    currentData.sessions_by_pair_key[
                        getProjectPlaceKey(latestSession.project_id, latestSession.place_id)
                    ] ??
                    auditSession;
                const resolution = resolveSaveConflict({
                    currentSession,
                    latestSession,
                    dirtyMeta: currentData.dirty_meta,
                    dirtyPreAudit: currentData.dirty_pre_audit,
                    dirtySections: currentData.dirty_sections,
                });
                if (
                    getOwnedAuditSessionForResponse({
                        auditId,
                        sessionsByAuditId: currentData.sessions_by_audit_id,
                        sessionsByPairKey: currentData.sessions_by_pair_key,
                    }) === null
                ) {
                    return {
                        auditId,
                        failed: false,
                    };
                }
                const updatedAt = new Date().toISOString();
                const nextSessionMaps = upsertAuditSessionMaps({
                    sessionsByAuditId: currentData.sessions_by_audit_id,
                    sessionsByPairKey: currentData.sessions_by_pair_key,
                    nextSession: resolution.rebasedSession,
                });
                const nextRecoveryPhase = phaseForSaveConflictRecovery({
                    action: resolution.action,
                    rebasedSession: resolution.rebasedSession,
                    dirtyMeta: resolution.dirtyMeta,
                    dirtyPreAudit: resolution.dirtyPreAudit,
                    dirtySections: resolution.dirtySections,
                    recoveredWithoutRetry: resolution.recoveredWithoutRetry,
                });
                const nextPrunedSubmittedAuditState = pruneCanonicalSubmittedAuditState({
                    session: resolution.rebasedSession,
                    dirtyMeta: resolution.dirtyMeta,
                    dirtyPreAudit: resolution.dirtyPreAudit,
                    dirtySections: resolution.dirtySections,
                    syncStateByAuditId: writeAuditSyncState(
                        currentData.sync_state_by_audit_id,
                        auditId,
                        nextRecoveryPhase,
                        updatedAt,
                    ),
                });
                const nextPrunedAuditState = pruneAuditStateForAudit({
                    auditId: nextSessionMaps.displacedAuditId,
                    dirtyMeta: nextPrunedSubmittedAuditState.dirtyMeta,
                    dirtyPreAudit: nextPrunedSubmittedAuditState.dirtyPreAudit,
                    dirtySections: nextPrunedSubmittedAuditState.dirtySections,
                    syncStateByAuditId: nextPrunedSubmittedAuditState.syncStateByAuditId,
                });

                batch(() => {
                    auditData$.instrument.set(resolution.rebasedSession.instrument);
                    auditData$.sessions_by_audit_id.set(nextSessionMaps.sessionsByAuditId);
                    auditData$.sessions_by_pair_key.set(nextSessionMaps.sessionsByPairKey);
                    auditData$.dirty_meta.set(nextPrunedAuditState.dirtyMeta);
                    auditData$.dirty_sections.set(nextPrunedAuditState.dirtySections);
                    auditData$.dirty_pre_audit.set(nextPrunedAuditState.dirtyPreAudit);
                    auditData$.sync_state_by_audit_id.set(nextPrunedAuditState.syncStateByAuditId);
                    if (
                        resolution.action === "terminalize_submitted" ||
                        resolution.recoveredWithoutRetry
                    ) {
                        auditData$.last_successful_sync_at.set(updatedAt);
                    }
                });

                if (
                    resolution.action === "terminalize_submitted" ||
                    resolution.retrySnapshot === null ||
                    resolution.recoveredWithoutRetry
                ) {
                    return {
                        auditId,
                        failed: false,
                    };
                }

                try {
                    const retrySaveResult = await saveAuditDraft(
                        session,
                        auditId,
                        resolution.retrySnapshot.patch,
                    );
                    acknowledgeSave(retrySaveResult, resolution.retrySnapshot);
                    return {
                        auditId,
                        failed: false,
                    };
                } catch (retryError) {
                    console.error("[audit-store] retry save failed", retryError);
                    const updatedAt = new Date().toISOString();
                    const nextPhase =
                        retryError instanceof PlayspaceAuditApiError &&
                        retryError.statusCode === 409
                            ? "conflict"
                            : deriveBlockedPhaseFromError(retryError);
                    const message = formatAuditErrorMessage(
                        retryError,
                        t("audit:errors.syncFallback"),
                    );
                    auditData$.sync_state_by_audit_id.set(
                        writeAuditSyncState(
                            auditData$.sync_state_by_audit_id.peek(),
                            auditId,
                            nextPhase,
                            updatedAt,
                            message,
                        ),
                    );
                    return {
                        auditId,
                        failed: true,
                    };
                }
            } catch (recoveryError) {
                console.error("[audit-store] conflict recovery failed", recoveryError);
                const message = formatAuditErrorMessage(
                    recoveryError,
                    t("audit:errors.syncFallback"),
                );
                auditData$.sync_state_by_audit_id.set(
                    writeAuditSyncState(
                        auditData$.sync_state_by_audit_id.peek(),
                        auditId,
                        deriveBlockedPhaseFromError(recoveryError),
                        new Date().toISOString(),
                        message,
                    ),
                );
                return {
                    auditId,
                    failed: true,
                };
            }
        }

        console.error("[audit-store] sync failed", error);
        const message = formatAuditErrorMessage(error, t("audit:errors.syncFallback"));
        auditData$.sync_state_by_audit_id.set(
            writeAuditSyncState(
                auditData$.sync_state_by_audit_id.peek(),
                auditId,
                deriveBlockedPhaseFromError(error),
                new Date().toISOString(),
                message,
            ),
        );
        return {
            auditId,
            failed: true,
        };
    }
}

const runSingleFlightFlushAudit = createKeyedSingleFlightRunner(
    (_session: AuthSession, auditId: string) => auditId,
    flushSingleAuditPendingChangesInternal,
);

function buildTargetAutomaticSyncAuditIds(requestedAuditIds?: readonly string[]): string[] {
    if (requestedAuditIds === undefined) {
        return buildCurrentAutomaticSyncAuditIds();
    }

    const data = auditData$.peek();
    return [...new Set(requestedAuditIds)].filter((auditId) => {
        const currentPhase = readEffectiveAuditSyncPhase(
            auditId,
            data.sync_state_by_audit_id,
            data.dirty_meta,
            data.dirty_pre_audit,
            data.dirty_sections,
        );
        return currentPhase === "dirty" || currentPhase === "saving";
    });
}

async function flushAuditIds(
    session: AuthSession,
    requestedAuditIds?: readonly string[],
): Promise<FlushPendingChangesResult> {
    await resolvePendingSubmitStates(session, requestedAuditIds);

    const targetAuditIds = buildTargetAutomaticSyncAuditIds(requestedAuditIds);
    if (targetAuditIds.length === 0) {
        return {
            attemptedAuditIds: [],
            failedAuditIds: [],
            remainingDirtyAuditIds: buildTargetAutomaticSyncAuditIds(requestedAuditIds),
        };
    }

    const results = await Promise.all(
        targetAuditIds.map(async (auditId) => runSingleFlightFlushAudit(session, auditId)),
    );
    saveNow();

    return {
        attemptedAuditIds: targetAuditIds,
        failedAuditIds: results.filter((result) => result.failed).map((result) => result.auditId),
        remainingDirtyAuditIds: buildTargetAutomaticSyncAuditIds(requestedAuditIds),
    };
}

function flushPendingChanges(session: AuthSession): Promise<FlushPendingChangesResult> {
    return flushAuditIds(session);
}

async function submitAuditSessionInternal(
    session: AuthSession,
    auditId: string,
): Promise<AuditSession> {
    auditUI$.errorMessage.set(null);
    prepareAuditForExplicitSubmitRetry(auditId);
    const currentSyncState = auditData$.sync_state_by_audit_id.peek()[auditId];
    if (currentSyncState?.phase === "blocked_validation") {
        const message = currentSyncState.detail ?? t("audit:errors.submitFallback");
        auditUI$.errorMessage.set(message);
        throw new Error(message);
    }

    const auditSession: AuditSession | undefined = auditData$.sessions_by_audit_id[auditId]?.peek();
    if (auditSession !== undefined) {
        const flushResult = await flushAuditIds(session, [auditId]);
        const hasFailedDraftSync = flushResult.failedAuditIds.includes(auditId);
        const hasRemainingDirtyChanges = flushResult.remainingDirtyAuditIds.includes(auditId);
        if (hasFailedDraftSync || hasRemainingDirtyChanges) {
            const message = t("audit:errors.submitNeedsUploadedDraft");
            auditUI$.errorMessage.set(message);
            throw new Error(message);
        }
    }

    const latestPostFlushSession = auditData$.sessions_by_audit_id[auditId]?.peek();
    const latestPostFlushSyncState = auditData$.sync_state_by_audit_id.peek()[auditId];
    if (
        latestPostFlushSession?.status === "SUBMITTED" ||
        latestPostFlushSyncState?.phase === "submitted"
    ) {
        if (latestPostFlushSession !== undefined) {
            return latestPostFlushSession;
        }
    }

    auditData$.sync_state_by_audit_id.set(
        writeAuditSyncState(
            auditData$.sync_state_by_audit_id.peek(),
            auditId,
            "submitting",
            new Date().toISOString(),
        ),
    );

    try {
        const latestSession = auditData$.sessions_by_audit_id[auditId]?.peek();
        const nextSession = await submitAudit(session, auditId, latestSession?.revision);
        const data = auditData$.peek();
        if (
            getOwnedAuditSessionForResponse({
                auditId: nextSession.audit_id,
                sessionsByAuditId: data.sessions_by_audit_id,
                sessionsByPairKey: data.sessions_by_pair_key,
            }) === null
        ) {
            const currentPairOwner =
                data.sessions_by_pair_key[
                    getProjectPlaceKey(nextSession.project_id, nextSession.place_id)
                ];
            return currentPairOwner ?? nextSession;
        }
        const updatedAt = new Date().toISOString();
        const nextSessionMaps = upsertAuditSessionMaps({
            sessionsByAuditId: data.sessions_by_audit_id,
            sessionsByPairKey: data.sessions_by_pair_key,
            nextSession,
        });
        const nextPrunedSubmittedAuditState = pruneCanonicalSubmittedAuditState({
            session: nextSession,
            dirtyMeta: data.dirty_meta,
            dirtyPreAudit: data.dirty_pre_audit,
            dirtySections: data.dirty_sections,
            syncStateByAuditId: writeAuditSyncState(
                data.sync_state_by_audit_id,
                auditId,
                "submitted",
                updatedAt,
            ),
        });
        const nextPrunedAuditState = pruneAuditStateForAudit({
            auditId: nextSessionMaps.displacedAuditId,
            dirtyMeta: nextPrunedSubmittedAuditState.dirtyMeta,
            dirtyPreAudit: nextPrunedSubmittedAuditState.dirtyPreAudit,
            dirtySections: nextPrunedSubmittedAuditState.dirtySections,
            syncStateByAuditId: nextPrunedSubmittedAuditState.syncStateByAuditId,
        });
        batch(() => {
            auditData$.instrument.set(nextSession.instrument);
            auditData$.sessions_by_audit_id.set(nextSessionMaps.sessionsByAuditId);
            auditData$.sessions_by_pair_key.set(nextSessionMaps.sessionsByPairKey);
            auditData$.dirty_meta.set(nextPrunedAuditState.dirtyMeta);
            auditData$.dirty_sections.set(nextPrunedAuditState.dirtySections);
            auditData$.dirty_pre_audit.set(nextPrunedAuditState.dirtyPreAudit);
            auditData$.sync_state_by_audit_id.set(nextPrunedAuditState.syncStateByAuditId);
            auditUI$.errorMessage.set(null);
            auditData$.last_successful_sync_at.set(updatedAt);
        });
        saveNow();
        return nextSession;
    } catch (error) {
        if (error instanceof PlayspaceAuditApiError && error.statusCode === 409) {
            let requiresExplicitResubmit = false;
            try {
                const latestSession = await fetchAuditSession(session, auditId);
                const data = auditData$.peek();
                const currentSession =
                    data.sessions_by_audit_id[latestSession.audit_id] ??
                    data.sessions_by_pair_key[
                        getProjectPlaceKey(latestSession.project_id, latestSession.place_id)
                    ] ??
                    auditSession ??
                    latestSession;
                const resolution = resolveSubmitConflict({
                    currentSession,
                    latestSession,
                    dirtyMeta: data.dirty_meta,
                    dirtyPreAudit: data.dirty_pre_audit,
                    dirtySections: data.dirty_sections,
                });
                const updatedAt = new Date().toISOString();
                const conflictMessage = formatAuditErrorMessage(
                    error,
                    t("audit:errors.submitFallback"),
                );
                const nextSessionMaps = upsertAuditSessionMaps({
                    sessionsByAuditId: data.sessions_by_audit_id,
                    sessionsByPairKey: data.sessions_by_pair_key,
                    nextSession: resolution.rebasedSession,
                });
                const nextPrunedSubmittedAuditState = pruneCanonicalSubmittedAuditState({
                    session: resolution.rebasedSession,
                    dirtyMeta: resolution.dirtyMeta,
                    dirtyPreAudit: resolution.dirtyPreAudit,
                    dirtySections: resolution.dirtySections,
                    syncStateByAuditId: writeAuditSyncState(
                        data.sync_state_by_audit_id,
                        auditId,
                        phaseForSubmitConflictAction(resolution.action),
                        updatedAt,
                        resolution.action === "terminalize_submitted" ? null : conflictMessage,
                    ),
                });
                const nextPrunedAuditState = pruneAuditStateForAudit({
                    auditId: nextSessionMaps.displacedAuditId,
                    dirtyMeta: nextPrunedSubmittedAuditState.dirtyMeta,
                    dirtyPreAudit: nextPrunedSubmittedAuditState.dirtyPreAudit,
                    dirtySections: nextPrunedSubmittedAuditState.dirtySections,
                    syncStateByAuditId: nextPrunedSubmittedAuditState.syncStateByAuditId,
                });

                batch(() => {
                    auditData$.instrument.set(resolution.rebasedSession.instrument);
                    auditData$.sessions_by_audit_id.set(nextSessionMaps.sessionsByAuditId);
                    auditData$.sessions_by_pair_key.set(nextSessionMaps.sessionsByPairKey);
                    auditData$.dirty_meta.set(nextPrunedAuditState.dirtyMeta);
                    auditData$.dirty_sections.set(nextPrunedAuditState.dirtySections);
                    auditData$.dirty_pre_audit.set(nextPrunedAuditState.dirtyPreAudit);
                    auditData$.sync_state_by_audit_id.set(nextPrunedAuditState.syncStateByAuditId);
                    auditUI$.errorMessage.set(
                        resolution.action === "terminalize_submitted" ? null : conflictMessage,
                    );
                    if (resolution.action === "terminalize_submitted") {
                        auditData$.last_successful_sync_at.set(updatedAt);
                    }
                });
                saveNow();
                if (resolution.action === "terminalize_submitted") {
                    return resolution.rebasedSession;
                }
                requiresExplicitResubmit = true;
            } catch (recoveryError) {
                const message = formatAuditErrorMessage(
                    recoveryError,
                    t("audit:errors.submitFallback"),
                );
                batch(() => {
                    auditData$.sync_state_by_audit_id.set(
                        writeAuditSyncState(
                            auditData$.sync_state_by_audit_id.peek(),
                            auditId,
                            deriveBlockedPhaseFromError(recoveryError),
                            new Date().toISOString(),
                            message,
                        ),
                    );
                    auditUI$.errorMessage.set(message);
                });
                throw recoveryError;
            }

            if (requiresExplicitResubmit) {
                throw error;
            }
        }

        const message = formatAuditErrorMessage(error, t("audit:errors.submitFallback"));
        batch(() => {
            auditData$.sync_state_by_audit_id.set(
                writeAuditSyncState(
                    auditData$.sync_state_by_audit_id.peek(),
                    auditId,
                    deriveBlockedPhaseFromError(error),
                    new Date().toISOString(),
                    message,
                ),
            );
            auditUI$.errorMessage.set(message);
        });
        throw error;
    }
}

const runSingleFlightSubmitAuditSession = createKeyedSingleFlightRunner(
    (_session: AuthSession, auditId: string) => auditId,
    submitAuditSessionInternal,
);

function submitAuditSession(session: AuthSession, auditId: string): Promise<AuditSession> {
    return runSingleFlightSubmitAuditSession(session, auditId);
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
    applyLocalExecutionMode,
    applyLocalQuestionAnswer,
    applyLocalSectionNote,
    applyLocalPreAudit,
    prepareAutomaticSyncAudits,
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
    instrument: () => auditData$.instrument.get() ?? BASE_PLAYSPACE_INSTRUMENT,
    sessionsByAuditId: () => auditData$.sessions_by_audit_id.get(),
    sessionsByPairKey: () => auditData$.sessions_by_pair_key.get(),
    currentUserId: () => auditUI$.currentUserId.get(),
    isHydrated: () => auditUI$.isHydrated.get(),
    isLoadingAudit: () => auditUI$.isLoadingAudit.get(),
    isSavingDraft: () =>
        deriveGlobalSyncFeedback({
            syncStateByAuditId: auditData$.sync_state_by_audit_id.get(),
        }).isSavingDraft,
    isSyncing: () =>
        deriveGlobalSyncFeedback({
            syncStateByAuditId: auditData$.sync_state_by_audit_id.get(),
        }).isSyncing,
    errorMessage: () => auditUI$.errorMessage.get(),
    lastSyncError: () =>
        deriveGlobalSyncFeedback({
            syncStateByAuditId: auditData$.sync_state_by_audit_id.get(),
        }).message,
    lastSuccessfulSyncAt: () => auditData$.last_successful_sync_at.get(),
    localChangeCounter: () => auditData$.local_change_counter.get(),
    dirtySections: () => auditData$.dirty_sections.get(),
    dirtyPreAudit: () => auditData$.dirty_pre_audit.get(),
    dirtyMeta: () => auditData$.dirty_meta.get(),
    syncStateByAuditId: () => auditData$.sync_state_by_audit_id.get(),
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
    const globalSyncFeedback = deriveGlobalSyncFeedback({
        syncStateByAuditId: auditData$.sync_state_by_audit_id.peek(),
    });

    return {
        instrument: auditData$.instrument.peek() ?? BASE_PLAYSPACE_INSTRUMENT,
        sessionsByAuditId: auditData$.sessions_by_audit_id.peek(),
        sessionsByPairKey: auditData$.sessions_by_pair_key.peek(),
        currentUserId: auditUI$.currentUserId.peek(),
        isHydrated: auditUI$.isHydrated.peek(),
        isLoadingAudit: auditUI$.isLoadingAudit.peek(),
        isSavingDraft: globalSyncFeedback.isSavingDraft,
        isSyncing: globalSyncFeedback.isSyncing,
        errorMessage: auditUI$.errorMessage.peek(),
        lastSyncError: globalSyncFeedback.message,
        lastSuccessfulSyncAt: auditData$.last_successful_sync_at.peek(),
        localChangeCounter: auditData$.local_change_counter.peek(),
        dirtySections: auditData$.dirty_sections.peek(),
        dirtyPreAudit: auditData$.dirty_pre_audit.peek(),
        dirtyMeta: auditData$.dirty_meta.peek(),
        syncStateByAuditId: auditData$.sync_state_by_audit_id.peek(),
        ...actions,
    };
}

/**
 * Zustand-compatible hook backed by Legend State observables.
 *
 * Usage is identical to the previous Zustand store:
 * ```
 * const session = usePlayspaceAuditStore(s => s.sessionsByPairKey[pairKey]);
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
