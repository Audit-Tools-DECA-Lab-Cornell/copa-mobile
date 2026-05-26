import { getProjectPlaceKey } from "./pair-key";
import {
    getInstrumentSectionLocalProgress,
    getPreAuditValues,
    getVisibleSections,
    isRequiredPreAuditComplete,
} from "./selectors";

import type {
    AuditDraftPatch,
    AuditDraftSave,
    AuditPreAuditValues,
    AuditSectionState,
    AuditSession,
    AuditSyncPhase,
    AuditSyncState,
    AuditSyncStateByAuditId,
    DirtyMeta,
    DirtyPreAudit,
    DirtySections,
    DirtyStartedAt,
    ExecutionMode,
    QuestionResponsePayload,
    QuestionResponseValue,
} from "./types";

interface BuildSyncableAuditIdsArgs {
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly dirtySections: DirtySections;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface RestorePersistedSyncStateArgs {
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly sessionsByPairKey: Record<string, AuditSession>;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
}

interface BuildDraftPatchSnapshotArgs {
    readonly auditId: string;
    readonly session: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface ApplyLocalQuestionAnswerChangeArgs {
    readonly session: AuditSession;
    readonly sectionKey: string;
    readonly questionKey: string;
    readonly answers: QuestionResponsePayload;
    readonly nextVersion: number;
    readonly dirtySections: DirtySections;
}

interface ApplyLocalSectionNoteChangeArgs {
    readonly session: AuditSession;
    readonly sectionKey: string;
    readonly note: string;
    readonly nextVersion: number;
    readonly dirtySections: DirtySections;
}

interface ApplyLocalPreAuditChangeArgs {
    readonly session: AuditSession;
    readonly values: Record<string, string | string[] | null>;
    readonly nextVersion: number;
    readonly dirtyPreAudit: DirtyPreAudit;
}

interface ApplyLocalExecutionModeChangeArgs {
    readonly session: AuditSession;
    readonly executionMode: ExecutionMode;
    readonly nextVersion: number;
    readonly dirtyMeta: DirtyMeta;
}

interface ApplyLocalAuditStartChangeArgs {
    readonly session: AuditSession;
    readonly startedAt: string;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface ApplyLocalFinalCommentsChangeArgs {
    readonly session: AuditSession;
    readonly finalComments: string;
    readonly nextVersion: number;
    readonly dirtyMeta: DirtyMeta;
}

interface CanEditAuditInputsArgs {
    readonly session: AuditSession;
    readonly phase: AuditSyncPhase | null | undefined;
}

type CleanupComparable = string | readonly string[] | Readonly<Record<string, string | readonly string[]>>;

interface ShouldPersistCleanupWriteArgs {
    readonly currentValue: CleanupComparable;
    readonly nextValue: CleanupComparable;
}

interface ClearAcknowledgedDirtyStateArgs {
    readonly auditId: string;
    readonly currentDirtySections: DirtySections;
    readonly currentDirtyPreAudit: DirtyPreAudit;
    readonly currentDirtyMeta: DirtyMeta;
    readonly currentDirtyStartedAt: DirtyStartedAt;
    readonly snapshot: {
        readonly auditId: string;
        readonly expectedRevision: number;
        readonly metaVersion: number | null;
        readonly preAuditVersion: number | null;
        readonly sectionVersions: Record<string, number>;
        readonly startedAtFlagged: boolean;
    };
}

interface ApplyFetchedSessionSnapshotArgs {
    readonly currentSession: AuditSession | null | undefined;
    readonly fetchedSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface PrepareConflictRecoverySnapshotArgs {
    readonly auditId: string;
    readonly currentSession: AuditSession | null | undefined;
    readonly fetchedSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface ApplyLocalQuestionAnswerChangeResult {
    readonly session: AuditSession;
    readonly dirtySections: DirtySections;
    readonly didChange: boolean;
}

interface ApplyLocalSectionNoteChangeResult {
    readonly session: AuditSession;
    readonly dirtySections: DirtySections;
    readonly didChange: boolean;
}

interface ApplyLocalPreAuditChangeResult {
    readonly session: AuditSession;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly didChange: boolean;
}

interface ApplyLocalExecutionModeChangeResult {
    readonly session: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly didChange: boolean;
}

interface ApplyLocalAuditStartChangeResult {
    readonly session: AuditSession;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly didChange: boolean;
}

interface ApplyLocalFinalCommentsChangeResult {
    readonly session: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly didChange: boolean;
}

interface ApplyFetchedSessionSnapshotResult {
    readonly session: AuditSession;
}

interface PrepareConflictRecoverySnapshotResult {
    readonly session: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly retrySnapshot: PendingAuditPatchSnapshot | null;
    readonly recoveredWithoutRetry: boolean;
}

interface ClearAcknowledgedDirtyStateResult {
    readonly dirtySections: DirtySections;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface UpsertAuditSessionMapsArgs {
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly sessionsByPairKey: Record<string, AuditSession>;
    readonly nextSession: AuditSession;
}

interface UpsertAuditSessionMapsResult {
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly sessionsByPairKey: Record<string, AuditSession>;
    readonly displacedAuditId: string | null;
}

interface TransitionPhaseArgs {
    readonly currentPhase: AuditSyncPhase;
    readonly updatedAt: string;
}

interface AutomaticTriggerPhaseArgs {
    readonly currentPhase: AuditSyncPhase;
    readonly trigger: AutomaticSyncTrigger;
}

interface SubmitResolutionRetryArgs {
    readonly currentPhase: AuditSyncPhase;
    readonly hasDirtyFragments: boolean;
}

interface SubmitResolutionTriggerRetryArgs extends SubmitResolutionRetryArgs {
    readonly trigger: AutomaticSyncTrigger;
}

interface ListPendingSubmitResolutionAuditIdsArgs {
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly requestedAuditIds?: readonly string[];
}

interface ResolveSaveConflictArgs {
    readonly currentSession: AuditSession;
    readonly latestSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface ResolveSubmitConflictArgs {
    readonly currentSession: AuditSession;
    readonly latestSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface FinishSubmitResolutionArgs {
    readonly latestSession: AuditSession;
    readonly currentDirtyMeta: DirtyMeta;
    readonly currentDirtyPreAudit: DirtyPreAudit;
    readonly currentDirtySections: DirtySections;
    readonly currentDirtyStartedAt: DirtyStartedAt;
}

interface DeriveGlobalSyncFeedbackArgs {
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
}

interface LocalDraftProgressSnapshot {
    readonly draftProgressPercent: number | null;
    readonly progress: AuditSession["progress"];
}

interface ResolveSaveConflictResult {
    readonly action: "retry_save" | "terminalize_submitted";
    readonly rebasedSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly retrySnapshot: PendingAuditPatchSnapshot | null;
    readonly recoveredWithoutRetry: boolean;
}

interface ResolveSubmitConflictResult {
    readonly action: "refresh_and_require_resubmit" | "terminalize_submitted";
    readonly rebasedSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
}

interface GlobalSyncFeedback {
    readonly isSyncing: boolean;
    readonly isSavingDraft: boolean;
    readonly message: string | null;
    readonly auditId: string | null;
    readonly phase: AuditSyncPhase | null;
}

interface PruneAuditStateForAuditArgs {
    readonly auditId: string | null;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
}

interface PruneCanonicalSubmittedAuditStateArgs {
    readonly session: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
}

export interface PendingAuditPatchSnapshot {
    readonly auditId: string;
    readonly patch: AuditDraftPatch;
    readonly expectedRevision: number;
    readonly metaVersion: number | null;
    readonly preAuditVersion: number | null;
    readonly sectionVersions: Record<string, number>;
    readonly startedAtFlagged: boolean;
}

/** Why automatic sync ran: connectivity/foreground, auth, checkpoints, or app lifecycle. */
export type AutomaticSyncTrigger =
    | "auth_restore"
    | "foreground"
    | "network_restore"
    | "blur"
    | "section_change"
    | "app_background";

const BLOCKED_SYNC_PHASES: readonly AuditSyncPhase[] = [
    "blocked_network",
    "blocked_auth",
    "blocked_validation",
    "blocked_server",
] as const;

const GLOBAL_ERROR_PHASES: readonly AuditSyncPhase[] = [
    "blocked_network",
    "blocked_auth",
    "blocked_validation",
    "blocked_server",
] as const;

/**
 * Determine whether a session still accepts local draft edits.
 *
 * @param session Session under evaluation.
 * @returns True when the audit is still editable locally.
 */
export function isAuditSessionEditable(session: AuditSession): boolean {
    return session.status === "IN_PROGRESS" || session.status === "PAUSED";
}

/**
 * Collect dirty audit ids that are still allowed to participate in sync.
 *
 * @param args Current session and dirty-state maps.
 * @returns Editable audit ids with pending dirty state.
 */
export function buildSyncableAuditIds(args: BuildSyncableAuditIdsArgs): string[] {
    const candidateIds = new Set<string>([
        ...Object.keys(args.dirtySections),
        ...Object.keys(args.dirtyPreAudit),
        ...Object.keys(args.dirtyMeta),
        ...Object.keys(args.dirtyStartedAt),
    ]);

    return [...candidateIds].filter((auditId) => {
        const session = args.sessionsByAuditId[auditId];
        if (session === undefined || !isAuditSessionEditable(session)) {
            return false;
        }

        return (
            args.dirtyMeta[auditId] !== undefined ||
            args.dirtyPreAudit[auditId] !== undefined ||
            Object.keys(args.dirtySections[auditId] ?? {}).length > 0 ||
            args.dirtyStartedAt[auditId] === true
        );
    });
}

/**
 * Determine whether the current phase is eligible for automatic sync work.
 *
 * @param phase Per-audit sync phase under evaluation.
 * @returns True only when the audit is currently dirty.
 */
export function shouldAttemptAutomaticSync(phase: AuditSyncPhase): boolean {
    return phase === "dirty";
}

/**
 * Share one in-flight async execution across concurrent callers until it
 * settles, then allow the next caller to start a fresh run.
 *
 * @param runner Async runner that should execute single-flight.
 * @returns Wrapped runner that reuses the in-flight promise.
 */
export function createSingleFlightRunner<TArgs extends readonly unknown[], TResult>(
    runner: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
    let inFlightPromise: Promise<TResult> | null = null;

    return (...args: TArgs): Promise<TResult> => {
        if (inFlightPromise !== null) {
            return inFlightPromise;
        }

        const nextPromise = runner(...args).finally(() => {
            if (inFlightPromise === nextPromise) {
                inFlightPromise = null;
            }
        });
        inFlightPromise = nextPromise;
        return nextPromise;
    };
}

/**
 * Share one in-flight async execution per key so duplicate callers for the
 * same resource reuse the active promise while different keys remain isolated.
 *
 * @param readKey Stable key selector for the in-flight bucket.
 * @param runner Async runner that should execute single-flight per key.
 * @returns Wrapped runner that reuses the in-flight promise for each key.
 */
export function createKeyedSingleFlightRunner<TKey extends string, TArgs extends readonly unknown[], TResult>(
    readKey: (...args: TArgs) => TKey,
    runner: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
    const inFlightPromiseByKey = new Map<TKey, Promise<TResult>>();

    return (...args: TArgs): Promise<TResult> => {
        const key = readKey(...args);
        const existingPromise = inFlightPromiseByKey.get(key);
        if (existingPromise !== undefined) {
            return existingPromise;
        }

        const nextPromise = runner(...args).finally(() => {
            const currentPromise = inFlightPromiseByKey.get(key);
            if (currentPromise === nextPromise) {
                inFlightPromiseByKey.delete(key);
            }
        });
        inFlightPromiseByKey.set(key, nextPromise);
        return nextPromise;
    };
}

/**
 * Determine whether local draft writes may mutate the current audit phase.
 *
 * @param phase Per-audit sync phase under evaluation.
 * @returns True when local edits are still allowed to apply.
 */
export function canApplyLocalDraftEdits(phase: AuditSyncPhase): boolean {
    return phase !== "submitting" && phase !== "resolving_submit" && phase !== "queued_submit";
}

/**
 * Determine whether the current audit should present editable inputs locally.
 *
 * @param args Session plus the current per-audit sync phase.
 * @returns True only when the session is editable and not submit-locked.
 */
export function canEditAuditInputs(args: CanEditAuditInputsArgs): boolean {
    return isAuditSessionEditable(args.session) && canApplyLocalDraftEdits(args.phase ?? "idle");
}

/**
 * Check whether a blur or unmount cleanup path still has a real write to persist.
 *
 * @param args Current canonical value plus the pending cleanup value.
 * @returns True when the cleanup path should write into local store state.
 */
export function shouldPersistCleanupWrite(args: ShouldPersistCleanupWriteArgs): boolean {
    return !areCleanupComparableValuesEqual(args.currentValue, args.nextValue);
}

/**
 * Check whether the next normal sync pass must resolve a restart-time submit
 * before any ordinary dirty-sync work can continue.
 *
 * @param syncStateByAuditId Current per-audit sync-state map.
 * @returns True when at least one audit is waiting in `resolving_submit`.
 */
export function hasPendingSubmitResolution(syncStateByAuditId: AuditSyncStateByAuditId): boolean {
    return Object.values(syncStateByAuditId).some((syncState) => syncState.phase === "resolving_submit");
}

/**
 * List audits whose next normal sync pass must retry submit-resolution work,
 * optionally narrowed to a specific set of requested audit ids.
 *
 * @param args Current sync-state and dirty-state maps plus optional target ids.
 * @returns Audit ids that still require submit-resolution retry work.
 */
export function listPendingSubmitResolutionAuditIds(args: ListPendingSubmitResolutionAuditIdsArgs): string[] {
    const candidateAuditIds =
        args.requestedAuditIds === undefined
            ? Object.keys(args.syncStateByAuditId)
            : [...new Set(args.requestedAuditIds)];

    return candidateAuditIds.filter((auditId) => {
        const syncState = args.syncStateByAuditId[auditId];
        if (syncState === undefined) {
            return false;
        }

        return shouldRetrySubmitResolution({
            currentPhase: syncState.phase,
            hasDirtyFragments: hasDirtyFragmentsForAudit(
                auditId,
                args.dirtyMeta,
                args.dirtyPreAudit,
                args.dirtySections,
                args.dirtyStartedAt,
            ),
        });
    });
}

/**
 * Determine whether the next ordinary sync trigger must retry submit
 * resolution work for an audit, even when draft auto-sync remains dirty-only.
 *
 * @param args Current phase plus whether the audit still has dirty fragments.
 * @returns True when the audit should re-enter the submit-resolution path.
 */
export function shouldRetrySubmitResolution(args: SubmitResolutionRetryArgs): boolean {
    return (
        args.currentPhase === "resolving_submit" ||
        ((args.currentPhase === "blocked_server" || args.currentPhase === "blocked_network") && !args.hasDirtyFragments)
    );
}

/**
 * Determine whether a specific automatic trigger may reopen or retry
 * submit-resolution work for a dirtyless audit after restart-time submit flow.
 *
 * @param args Current phase, dirty-fragment flag, and trigger.
 * @returns True when the trigger should retry submit-resolution work now.
 */
export function shouldRetrySubmitResolutionOnTrigger(args: SubmitResolutionTriggerRetryArgs): boolean {
    if (shouldRetrySubmitResolution(args)) {
        return true;
    }

    return args.currentPhase === "blocked_auth" && !args.hasDirtyFragments && args.trigger === "auth_restore";
}

/**
 * Determine whether an automatic startup/foreground/network trigger should
 * reopen a blocked audit back to `dirty`.
 *
 * @param args Automatic trigger plus the current blocked phase.
 * @returns True when the trigger may reopen the blocked audit.
 */
export function shouldReopenOnAutomaticSyncTrigger(args: AutomaticTriggerPhaseArgs): boolean {
    if (args.trigger === "auth_restore") {
        return args.currentPhase === "blocked_auth" || args.currentPhase === "blocked_server";
    }

    return args.currentPhase === "blocked_network" || args.currentPhase === "blocked_server";
}

/**
 * Reopen retryable and manual-attention phases after a fresh local draft edit.
 *
 * @param args Current phase plus the timestamp to write into persisted state.
 * @returns The next persisted sync state for the edited audit.
 */
export function transitionPhaseOnLocalEdit(args: TransitionPhaseArgs): AuditSyncState {
    if (
        args.currentPhase === "idle" ||
        args.currentPhase === "dirty" ||
        args.currentPhase === "blocked_validation" ||
        args.currentPhase === "blocked_server" ||
        args.currentPhase === "conflict"
    ) {
        return {
            phase: "dirty",
            detail: null,
            updated_at: args.updatedAt,
        };
    }

    return {
        phase: args.currentPhase,
        detail: null,
        updated_at: args.updatedAt,
    };
}

/**
 * Reopen a blocked audit after the caller has determined a manual or trigger-
 * specific retry is now allowed.
 *
 * @param args Current phase plus the timestamp to write into persisted state.
 * @returns The next persisted sync state for the audit.
 */
export function transitionPhaseOnManualRetry(args: TransitionPhaseArgs): AuditSyncState {
    if (BLOCKED_SYNC_PHASES.includes(args.currentPhase)) {
        return {
            phase: "dirty",
            detail: null,
            updated_at: args.updatedAt,
        };
    }

    return {
        phase: args.currentPhase,
        detail: null,
        updated_at: args.updatedAt,
    };
}

/**
 * Reopen only the submit phases that may proceed after an explicit user retry.
 *
 * @param args Current phase plus the timestamp to write into persisted state.
 * @returns The next persisted sync state for the explicit submit retry.
 */
export function transitionPhaseOnExplicitSubmitRetry(args: TransitionPhaseArgs): AuditSyncState {
    if (
        args.currentPhase === "conflict" ||
        args.currentPhase === "blocked_network" ||
        args.currentPhase === "blocked_auth" ||
        args.currentPhase === "blocked_server"
    ) {
        return {
            phase: "dirty",
            detail: null,
            updated_at: args.updatedAt,
        };
    }

    return {
        phase: args.currentPhase,
        detail: null,
        updated_at: args.updatedAt,
    };
}

/**
 * Apply a draft-save acknowledgement without synthesizing server-derived score,
 * progress, timestamp, or status fields.
 *
 * @param args Current local session plus the validated draft-save acknowledgement.
 * @returns Session snapshot with only acknowledgement-safe fields advanced.
 */
export function applySaveAcknowledgement(args: {
    readonly session: AuditSession;
    readonly saveResult: AuditDraftSave;
}): AuditSession {
    if (args.session.audit_id !== args.saveResult.audit_id) {
        throw new Error(
            `Save acknowledgement audit id mismatch: session ${JSON.stringify(args.session.audit_id)}, acknowledgement ${JSON.stringify(args.saveResult.audit_id)}.`,
        );
    }

    return {
        ...args.session,
        schema_version: args.saveResult.schema_version,
        revision: args.saveResult.revision,
        aggregate: {
            ...args.session.aggregate,
            schema_version: args.saveResult.schema_version,
            revision: args.saveResult.revision,
        },
    };
}

/**
 * Rebase an editable save conflict onto the latest fetched session, or
 * terminalize the draft when the canonical latest session is already submitted.
 *
 * @param args Current local draft, fetched latest session, and dirty-state maps.
 * @returns Recovery instructions for the save conflict path.
 */
export function resolveSaveConflict(args: ResolveSaveConflictArgs): ResolveSaveConflictResult {
    const recovery = prepareConflictRecoverySnapshot({
        auditId: args.currentSession.audit_id,
        currentSession: args.currentSession,
        fetchedSession: args.latestSession,
        dirtyMeta: args.dirtyMeta,
        dirtyPreAudit: args.dirtyPreAudit,
        dirtySections: args.dirtySections,
        dirtyStartedAt: args.dirtyStartedAt,
    });

    if (!isAuditSessionEditable(recovery.session)) {
        return {
            action: "terminalize_submitted",
            rebasedSession: recovery.session,
            dirtyMeta: recovery.dirtyMeta,
            dirtyPreAudit: recovery.dirtyPreAudit,
            dirtySections: recovery.dirtySections,
            dirtyStartedAt: recovery.dirtyStartedAt,
            retrySnapshot: null,
            recoveredWithoutRetry: true,
        };
    }

    return {
        action: "retry_save",
        rebasedSession: recovery.session,
        dirtyMeta: recovery.dirtyMeta,
        dirtyPreAudit: recovery.dirtyPreAudit,
        dirtySections: recovery.dirtySections,
        dirtyStartedAt: recovery.dirtyStartedAt,
        retrySnapshot: recovery.retrySnapshot,
        recoveredWithoutRetry: recovery.recoveredWithoutRetry,
    };
}

/**
 * Rebase a submit conflict onto the latest fetched session and require an
 * explicit second submit, or terminalize when the latest session is submitted.
 *
 * @param args Current local draft, fetched latest session, and dirty-state maps.
 * @returns Recovery instructions for the submit conflict path.
 */
export function resolveSubmitConflict(args: ResolveSubmitConflictArgs): ResolveSubmitConflictResult {
    const recovery = prepareConflictRecoverySnapshot({
        auditId: args.currentSession.audit_id,
        currentSession: args.currentSession,
        fetchedSession: args.latestSession,
        dirtyMeta: args.dirtyMeta,
        dirtyPreAudit: args.dirtyPreAudit,
        dirtySections: args.dirtySections,
        dirtyStartedAt: args.dirtyStartedAt,
    });

    if (!isAuditSessionEditable(recovery.session)) {
        return {
            action: "terminalize_submitted",
            rebasedSession: recovery.session,
            dirtyMeta: recovery.dirtyMeta,
            dirtyPreAudit: recovery.dirtyPreAudit,
            dirtySections: recovery.dirtySections,
            dirtyStartedAt: recovery.dirtyStartedAt,
        };
    }

    return {
        action: "refresh_and_require_resubmit",
        rebasedSession: recovery.session,
        dirtyMeta: recovery.dirtyMeta,
        dirtyPreAudit: recovery.dirtyPreAudit,
        dirtySections: recovery.dirtySections,
        dirtyStartedAt: recovery.dirtyStartedAt,
    };
}

/**
 * Map a submit-conflict recovery action onto the persisted phase that should
 * remain visible after the recovery fetch completes.
 *
 * @param action Submit conflict recovery action.
 * @returns Persisted per-audit phase for the conflict result.
 */
export function phaseForSubmitConflictAction(action: ResolveSubmitConflictResult["action"]): AuditSyncPhase {
    return action === "terminalize_submitted" ? "submitted" : "conflict";
}

/**
 * Map a save-conflict recovery result onto the persisted phase that should
 * remain visible before the caller decides whether another network save runs.
 *
 * @param args Save conflict recovery state.
 * @returns Persisted per-audit phase for the recovery result.
 */
export function phaseForSaveConflictRecovery(args: {
    readonly action: ResolveSaveConflictResult["action"];
    readonly rebasedSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly recoveredWithoutRetry: boolean;
}): AuditSyncPhase {
    if (args.action === "terminalize_submitted" || !isAuditSessionEditable(args.rebasedSession)) {
        return "submitted";
    }

    if (!args.recoveredWithoutRetry) {
        return "saving";
    }

    return hasDirtyFragmentsForAudit(
        args.rebasedSession.audit_id,
        args.dirtyMeta,
        args.dirtyPreAudit,
        args.dirtySections,
        args.dirtyStartedAt,
    )
        ? "dirty"
        : "idle";
}

/**
 * Settle a restart-time or fetch-time submit resolution onto the canonical
 * latest session while preserving any rebased local dirty fragments.
 *
 * @param args Latest canonical session plus the current dirty-state maps.
 * @returns The next audit phase, session snapshot, and dirty-state maps.
 */
export function finishSubmitResolution(args: FinishSubmitResolutionArgs): {
    readonly phase: AuditSyncPhase;
    readonly session: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
} {
    if (!isAuditSessionEditable(args.latestSession)) {
        const clearedDirtyState = clearDirtyStateForAudit(
            args.latestSession.audit_id,
            args.currentDirtyMeta,
            args.currentDirtyPreAudit,
            args.currentDirtySections,
            args.currentDirtyStartedAt,
        );
        return {
            phase: "submitted",
            session: args.latestSession,
            dirtyMeta: clearedDirtyState.dirtyMeta,
            dirtyPreAudit: clearedDirtyState.dirtyPreAudit,
            dirtySections: clearedDirtyState.dirtySections,
            dirtyStartedAt: clearedDirtyState.dirtyStartedAt,
        };
    }

    return {
        phase: hasDirtyFragmentsForAudit(
            args.latestSession.audit_id,
            args.currentDirtyMeta,
            args.currentDirtyPreAudit,
            args.currentDirtySections,
            args.currentDirtyStartedAt,
        )
            ? "dirty"
            : "idle",
        session: args.latestSession,
        dirtyMeta: args.currentDirtyMeta,
        dirtyPreAudit: args.currentDirtyPreAudit,
        dirtySections: args.currentDirtySections,
        dirtyStartedAt: args.currentDirtyStartedAt,
    };
}

/**
 * Derive compatibility-friendly global sync feedback from per-audit phases.
 *
 * @param args Current per-audit sync-state map.
 * @returns Derived in-flight flags plus the newest blocked error detail.
 */
export function deriveGlobalSyncFeedback(args: DeriveGlobalSyncFeedbackArgs): GlobalSyncFeedback {
    let newestBlockedAuditId: string | null = null;
    let newestBlockedState: AuditSyncState | null = null;
    let newestBlockedTimestamp = Number.NEGATIVE_INFINITY;
    let isSyncing = false;
    let isSavingDraft = false;

    for (const [auditId, syncState] of Object.entries(args.syncStateByAuditId)) {
        if (syncState.phase === "saving" || syncState.phase === "submitting") {
            isSyncing = true;
        }
        if (syncState.phase === "submitting") {
            isSavingDraft = true;
        }
        if (!GLOBAL_ERROR_PHASES.includes(syncState.phase)) {
            continue;
        }

        const timestamp = Date.parse(syncState.updated_at);
        if (timestamp >= newestBlockedTimestamp) {
            newestBlockedTimestamp = timestamp;
            newestBlockedAuditId = auditId;
            newestBlockedState = syncState;
        }
    }

    return {
        isSyncing,
        isSavingDraft,
        message: newestBlockedState?.detail ?? null,
        auditId: newestBlockedAuditId,
        phase: newestBlockedState?.phase ?? null,
    };
}

/**
 * Normalize persisted per-audit sync phases during hydrate so restart resumes
 * with the approved retryable or recovery state for editable drafts.
 *
 * @param phase Persisted sync phase from MMKV.
 * @param hasDirtyFragments Whether this audit still has syncable dirty fragments after hydrate pruning.
 * @returns The hydrated phase to restore, or null when the phase must be dropped.
 */
export function normalizeHydratedSyncPhase(phase: AuditSyncPhase, hasDirtyFragments: boolean): AuditSyncPhase | null {
    switch (phase) {
        case "submitting":
            return "resolving_submit";
        case "dirty":
            return hasDirtyFragments ? "dirty" : null;
        case "saving":
            return hasDirtyFragments ? "dirty" : null;
        case "conflict":
        case "blocked_validation":
            return hasDirtyFragments ? phase : null;
        case "blocked_server":
            return phase;
        case "blocked_network":
            return hasDirtyFragments ? "dirty" : "blocked_network";
        case "blocked_auth":
            return hasDirtyFragments ? "dirty" : "blocked_auth";
        case "submitted":
            return null;
        case "queued_submit":
            return "queued_submit";
        default:
            return phase;
    }
}

/**
 * Restore persisted dirty fragments and per-audit sync metadata while pruning
 * unknown or non-editable audits from the hydrated sync state.
 *
 * @param args Persisted audit-session and dirty-state inputs from MMKV.
 * @returns Restored dirty fragments limited to known editable drafts.
 */
export function restorePersistedSyncState(args: RestorePersistedSyncStateArgs): {
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
} {
    const nextDirtyMeta: DirtyMeta = {};
    const nextDirtyPreAudit: DirtyPreAudit = {};
    const nextDirtySections: DirtySections = {};
    const nextDirtyStartedAt: DirtyStartedAt = {};
    const nextSyncStateByAuditId: AuditSyncStateByAuditId = {};

    for (const auditId of listRestorableHydratedAuditIds(args.sessionsByAuditId, args.sessionsByPairKey)) {
        const hasDirtyFragments = copyHydratedDirtyFragmentsForAudit(
            auditId,
            args.dirtyMeta,
            args.dirtyPreAudit,
            args.dirtySections,
            args.dirtyStartedAt,
            nextDirtyMeta,
            nextDirtyPreAudit,
            nextDirtySections,
            nextDirtyStartedAt,
        );
        restoreHydratedSyncStateForAudit(auditId, args.syncStateByAuditId, hasDirtyFragments, nextSyncStateByAuditId);
    }

    return {
        dirtyMeta: nextDirtyMeta,
        dirtyPreAudit: nextDirtyPreAudit,
        dirtySections: nextDirtySections,
        dirtyStartedAt: nextDirtyStartedAt,
        syncStateByAuditId: nextSyncStateByAuditId,
    };
}

/**
 * Canonicalize the persisted audit-id map against the pair-key map so any
 * displaced audit snapshot is removed before hydrate applies store state.
 *
 * @param args Persisted audit-id and pair-key session maps.
 * @returns Canonical audit-id map aligned with the persisted pair-key winners.
 */
export function canonicalizeSessionsByAuditIdForHydrate(args: {
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly sessionsByPairKey: Record<string, AuditSession>;
}): Record<string, AuditSession> {
    const nextSessionsByAuditId = Object.fromEntries(
        Object.entries(args.sessionsByAuditId).filter(([, session]) =>
            isCanonicalPairMappedSession(args.sessionsByPairKey, session),
        ),
    );

    for (const session of Object.values(args.sessionsByPairKey)) {
        nextSessionsByAuditId[session.audit_id] = session;
    }

    return nextSessionsByAuditId;
}

/**
 * Resolve whether an audit still owns the current canonical slot for its
 * project/place pair before applying an in-flight response.
 *
 * @param args Current session ownership maps plus the response audit id.
 * @returns The owned current session when the response may still apply, otherwise null.
 */
export function getOwnedAuditSessionForResponse(args: {
    readonly auditId: string;
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly sessionsByPairKey: Record<string, AuditSession>;
}): AuditSession | null {
    const session = args.sessionsByAuditId[args.auditId];
    if (session === undefined || !isCanonicalPairMappedSession(args.sessionsByPairKey, session)) {
        return null;
    }

    return session;
}

/**
 * List audit ids whose persisted dirty and sync state may legally survive hydrate.
 *
 * @param sessionsByAuditId Persisted audit-id session map.
 * @param sessionsByPairKey Persisted canonical pair-key session map.
 * @returns Audit ids still eligible for hydrated dirty-state restore.
 */
function listRestorableHydratedAuditIds(
    sessionsByAuditId: Record<string, AuditSession>,
    sessionsByPairKey: Record<string, AuditSession>,
): string[] {
    return Object.entries(sessionsByAuditId)
        .filter(([, session]) => canRestoreHydratedAuditState(sessionsByPairKey, session))
        .map(([auditId]) => auditId);
}

/**
 * Check whether an audit still satisfies the restore rules for hydrated dirty
 * fragments and per-audit sync state.
 *
 * @param sessionsByPairKey Canonical pair-key session map from persisted state.
 * @param session Session being evaluated for hydrate restore.
 * @returns True when the session is editable and still owns the canonical pair entry.
 */
function canRestoreHydratedAuditState(sessionsByPairKey: Record<string, AuditSession>, session: AuditSession): boolean {
    return isAuditSessionEditable(session) && isCanonicalPairMappedSession(sessionsByPairKey, session);
}

/**
 * Check whether an editable session still owns the canonical pair-map entry used
 * by the rest of the mobile store for project-place lookups.
 *
 * @param sessionsByPairKey Canonical pair-key session map from persisted state.
 * @param session Session being evaluated for dirty-state restore.
 * @returns True when the pair map still points at this session, or has no entry.
 */
function isCanonicalPairMappedSession(sessionsByPairKey: Record<string, AuditSession>, session: AuditSession): boolean {
    const pairKey = getProjectPlaceKey(session.project_id, session.place_id);
    const pairMappedSession = sessionsByPairKey[pairKey];
    return pairMappedSession === undefined || pairMappedSession.audit_id === session.audit_id;
}

function readDisplacedAuditId(
    sessionsByPairKey: Record<string, AuditSession>,
    nextPairKey: string,
    nextAuditId: string,
): string | null {
    const currentPairMappedSession = sessionsByPairKey[nextPairKey];
    if (currentPairMappedSession === undefined || currentPairMappedSession.audit_id === nextAuditId) {
        return null;
    }

    return currentPairMappedSession.audit_id;
}

/**
 * Copy any surviving hydrated dirty fragments for one audit into the restored
 * dirty-state maps.
 *
 * @param auditId Audit being restored.
 * @param sourceDirtyMeta Persisted dirty meta map.
 * @param sourceDirtyPreAudit Persisted dirty pre-audit map.
 * @param sourceDirtySections Persisted dirty section map.
 * @param targetDirtyMeta Restored dirty meta map being built.
 * @param targetDirtyPreAudit Restored dirty pre-audit map being built.
 * @param targetDirtySections Restored dirty section map being built.
 * @returns True when at least one dirty fragment survived hydrate for the audit.
 */
function copyHydratedDirtyFragmentsForAudit(
    auditId: string,
    sourceDirtyMeta: DirtyMeta,
    sourceDirtyPreAudit: DirtyPreAudit,
    sourceDirtySections: DirtySections,
    sourceDirtyStartedAt: DirtyStartedAt,
    targetDirtyMeta: DirtyMeta,
    targetDirtyPreAudit: DirtyPreAudit,
    targetDirtySections: DirtySections,
    targetDirtyStartedAt: DirtyStartedAt,
): boolean {
    const dirtyMetaVersion = sourceDirtyMeta[auditId];
    if (dirtyMetaVersion !== undefined) {
        targetDirtyMeta[auditId] = dirtyMetaVersion;
    }

    const dirtyPreAuditVersion = sourceDirtyPreAudit[auditId];
    if (dirtyPreAuditVersion !== undefined) {
        targetDirtyPreAudit[auditId] = dirtyPreAuditVersion;
    }

    const dirtySectionVersions = sourceDirtySections[auditId];
    if (dirtySectionVersions !== undefined && Object.keys(dirtySectionVersions).length > 0) {
        targetDirtySections[auditId] = { ...dirtySectionVersions };
    }

    if (sourceDirtyStartedAt[auditId] === true) {
        targetDirtyStartedAt[auditId] = true;
    }

    return hasDirtyFragmentsForAudit(
        auditId,
        targetDirtyMeta,
        targetDirtyPreAudit,
        targetDirtySections,
        targetDirtyStartedAt,
    );
}

/**
 * Restore one persisted per-audit sync-state entry after hydrate pruning.
 *
 * @param auditId Audit being restored.
 * @param sourceSyncStateByAuditId Persisted sync-state map.
 * @param hasDirtyFragments Whether the audit still has syncable dirty fragments.
 * @param targetSyncStateByAuditId Restored sync-state map being built.
 */
function restoreHydratedSyncStateForAudit(
    auditId: string,
    sourceSyncStateByAuditId: AuditSyncStateByAuditId,
    hasDirtyFragments: boolean,
    targetSyncStateByAuditId: AuditSyncStateByAuditId,
): void {
    const currentSyncState = sourceSyncStateByAuditId[auditId];
    if (currentSyncState === undefined) {
        return;
    }

    const hydratedPhase = normalizeHydratedSyncPhase(currentSyncState.phase, hasDirtyFragments);
    if (hydratedPhase === null) {
        return;
    }

    targetSyncStateByAuditId[auditId] = {
        ...currentSyncState,
        phase: hydratedPhase,
    };
}

/**
 * Determine whether an audit still has any dirty fragments after hydrate pruning.
 *
 * @param auditId Audit being evaluated.
 * @param dirtyMeta Hydrated dirty meta map.
 * @param dirtyPreAudit Hydrated dirty pre-audit map.
 * @param dirtySections Hydrated dirty section map.
 * @returns True when at least one dirty fragment survived hydrate.
 */
function hasDirtyFragmentsForAudit(
    auditId: string,
    dirtyMeta: DirtyMeta,
    dirtyPreAudit: DirtyPreAudit,
    dirtySections: DirtySections,
    dirtyStartedAt: DirtyStartedAt,
): boolean {
    return (
        dirtyMeta[auditId] !== undefined ||
        dirtyPreAudit[auditId] !== undefined ||
        Object.keys(dirtySections[auditId] ?? {}).length > 0 ||
        dirtyStartedAt[auditId] === true
    );
}

/**
 * Build a sparse mobile draft-save payload from the current dirty-state maps.
 *
 * @param args Target audit session plus current dirty-state inputs.
 * @returns A sparse patch snapshot, or null when nothing is dirty.
 */
export function buildDraftPatchSnapshot(args: BuildDraftPatchSnapshotArgs): PendingAuditPatchSnapshot | null {
    const metaVersion = args.dirtyMeta[args.auditId] ?? null;
    const preAuditVersion = args.dirtyPreAudit[args.auditId] ?? null;
    const currentSectionVersions = args.dirtySections[args.auditId] ?? {};
    const dirtySectionKeys = Object.keys(currentSectionVersions);
    const startedAtFlagged = args.dirtyStartedAt[args.auditId] === true;

    if (metaVersion === null && preAuditVersion === null && dirtySectionKeys.length === 0 && !startedAtFlagged) {
        return null;
    }

    const patch: AuditDraftPatch = {
        expected_revision: args.session.revision,
        sections: {},
    };

    if (metaVersion !== null) {
        patch.meta = {
            execution_mode: args.session.meta.execution_mode,
            final_comments: args.session.meta.final_comments,
        };
    }

    if (preAuditVersion !== null) {
        patch.pre_audit = clonePreAuditValues(args.session.pre_audit);
    }

    for (const sectionKey of dirtySectionKeys) {
        patch.sections[sectionKey] = cloneSectionState(args.session.sections[sectionKey], sectionKey);
    }

    if (startedAtFlagged) {
        patch.started_at = args.session.started_at;
    }

    return {
        auditId: args.auditId,
        patch,
        expectedRevision: args.session.revision,
        metaVersion,
        preAuditVersion,
        sectionVersions: { ...currentSectionVersions },
        startedAtFlagged,
    };
}

/**
 * Apply a fetched session snapshot while preserving any newer local dirty
 * fragments from the current editable draft when appropriate.
 *
 * @param args Current and fetched session snapshots plus dirty-state inputs.
 * @returns The session snapshot that should be written into store state.
 */
export function applyFetchedSessionSnapshot(args: ApplyFetchedSessionSnapshotArgs): ApplyFetchedSessionSnapshotResult {
    const currentSession = args.currentSession;
    if (currentSession?.audit_id !== args.fetchedSession.audit_id) {
        return {
            session: args.fetchedSession,
        };
    }

    if (
        currentSession.status === "SUBMITTED" &&
        isAuditSessionEditable(args.fetchedSession) &&
        currentSession.revision >= args.fetchedSession.revision
    ) {
        return {
            session: currentSession,
        };
    }

    if (
        isAuditSessionEditable(currentSession) &&
        isAuditSessionEditable(args.fetchedSession) &&
        currentSession.revision > args.fetchedSession.revision
    ) {
        return {
            session: currentSession,
        };
    }

    if (!isAuditSessionEditable(args.fetchedSession)) {
        return {
            session: args.fetchedSession,
        };
    }

    let mergedSession = args.fetchedSession;
    if (args.dirtyMeta[currentSession.audit_id] !== undefined) {
        mergedSession = copyMetaDraftFromSession(currentSession, mergedSession);
    }

    if (args.dirtyPreAudit[currentSession.audit_id] !== undefined) {
        mergedSession = copyPreAuditDraftFromSession(currentSession, mergedSession);
    }

    for (const sectionKey of Object.keys(args.dirtySections[currentSession.audit_id] ?? {})) {
        mergedSession = copySectionDraftFromSession(currentSession, mergedSession, sectionKey);
    }

    mergedSession = preserveLaterLocalStartTime(currentSession, mergedSession);

    return {
        session: mergedSession,
    };
}

/**
 * Prepare the next step after a conflict-recovery fetch by applying the
 * canonical session, pruning any terminal dirty state, and building a retry
 * snapshot only when local fragments still remain.
 *
 * @param args Current and fetched session snapshots plus dirty-state inputs.
 * @returns Recovery result describing whether another retry save is needed.
 */
export function prepareConflictRecoverySnapshot(
    args: PrepareConflictRecoverySnapshotArgs,
): PrepareConflictRecoverySnapshotResult {
    const session = applyFetchedSessionSnapshot({
        currentSession: args.currentSession,
        fetchedSession: args.fetchedSession,
        dirtyMeta: args.dirtyMeta,
        dirtyPreAudit: args.dirtyPreAudit,
        dirtySections: args.dirtySections,
        dirtyStartedAt: args.dirtyStartedAt,
    }).session;
    const nextDirtyState = isAuditSessionEditable(session)
        ? {
              dirtyMeta: args.dirtyMeta,
              dirtyPreAudit: args.dirtyPreAudit,
              dirtySections: args.dirtySections,
              dirtyStartedAt: args.dirtyStartedAt,
          }
        : clearDirtyStateForAudit(
              args.auditId,
              args.dirtyMeta,
              args.dirtyPreAudit,
              args.dirtySections,
              args.dirtyStartedAt,
          );
    const retrySnapshot = buildDraftPatchSnapshot({
        auditId: args.auditId,
        session,
        dirtyMeta: nextDirtyState.dirtyMeta,
        dirtyPreAudit: nextDirtyState.dirtyPreAudit,
        dirtySections: nextDirtyState.dirtySections,
        dirtyStartedAt: nextDirtyState.dirtyStartedAt,
    });

    return {
        session,
        dirtyMeta: nextDirtyState.dirtyMeta,
        dirtyPreAudit: nextDirtyState.dirtyPreAudit,
        dirtySections: nextDirtyState.dirtySections,
        dirtyStartedAt: nextDirtyState.dirtyStartedAt,
        retrySnapshot,
        recoveredWithoutRetry: retrySnapshot === null,
    };
}

/**
 * Write a session snapshot into both audit-id and project-place maps.
 *
 * @param args Existing session maps plus the next session to store.
 * @returns Both maps updated in lock-step.
 */
export function upsertAuditSessionMaps(args: UpsertAuditSessionMapsArgs): UpsertAuditSessionMapsResult {
    const nextPairKey = getProjectPlaceKey(args.nextSession.project_id, args.nextSession.place_id);
    const nextSessionsByPairKey = { ...args.sessionsByPairKey };
    const displacedAuditId = readDisplacedAuditId(args.sessionsByPairKey, nextPairKey, args.nextSession.audit_id);

    for (const [pairKey, session] of Object.entries(args.sessionsByPairKey)) {
        if (session.audit_id === args.nextSession.audit_id && pairKey !== nextPairKey) {
            delete nextSessionsByPairKey[pairKey];
        }
    }

    nextSessionsByPairKey[nextPairKey] = args.nextSession;
    const nextSessionsByAuditId = {
        ...args.sessionsByAuditId,
        [args.nextSession.audit_id]: args.nextSession,
    };
    if (displacedAuditId !== null) {
        delete nextSessionsByAuditId[displacedAuditId];
    }

    return {
        sessionsByAuditId: nextSessionsByAuditId,
        sessionsByPairKey: nextSessionsByPairKey,
        displacedAuditId,
    };
}

/**
 * Prune all persisted dirty and sync fragments for one removed audit id.
 *
 * @param args Audit id plus the current dirty and sync-state maps.
 * @returns Dirty and sync-state maps with the removed audit pruned out.
 */
export function pruneAuditStateForAudit(args: PruneAuditStateForAuditArgs): {
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
} {
    if (args.auditId === null) {
        return {
            dirtyMeta: args.dirtyMeta,
            dirtyPreAudit: args.dirtyPreAudit,
            dirtySections: args.dirtySections,
            dirtyStartedAt: args.dirtyStartedAt,
            syncStateByAuditId: args.syncStateByAuditId,
        };
    }

    const nextDirtyMeta = { ...args.dirtyMeta };
    delete nextDirtyMeta[args.auditId];

    const nextDirtyPreAudit = { ...args.dirtyPreAudit };
    delete nextDirtyPreAudit[args.auditId];

    const nextDirtySections = { ...args.dirtySections };
    delete nextDirtySections[args.auditId];

    const nextDirtyStartedAt = { ...args.dirtyStartedAt };
    delete nextDirtyStartedAt[args.auditId];

    const nextSyncStateByAuditId = { ...args.syncStateByAuditId };
    delete nextSyncStateByAuditId[args.auditId];

    return {
        dirtyMeta: nextDirtyMeta,
        dirtyPreAudit: nextDirtyPreAudit,
        dirtySections: nextDirtySections,
        dirtyStartedAt: nextDirtyStartedAt,
        syncStateByAuditId: nextSyncStateByAuditId,
    };
}

/**
 * Prune all dirty and sync fragments when a canonical submitted session becomes
 * the source of truth for an audit.
 *
 * @param args Current canonical session plus dirty and sync-state maps.
 * @returns Pruned maps for submitted sessions, or the original maps otherwise.
 */
export function pruneCanonicalSubmittedAuditState(args: PruneCanonicalSubmittedAuditStateArgs): {
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
} {
    return args.session.status === "SUBMITTED"
        ? pruneAuditStateForAudit({
              auditId: args.session.audit_id,
              dirtyMeta: args.dirtyMeta,
              dirtyPreAudit: args.dirtyPreAudit,
              dirtySections: args.dirtySections,
              dirtyStartedAt: args.dirtyStartedAt,
              syncStateByAuditId: args.syncStateByAuditId,
          })
        : {
              dirtyMeta: args.dirtyMeta,
              dirtyPreAudit: args.dirtyPreAudit,
              dirtySections: args.dirtySections,
              dirtyStartedAt: args.dirtyStartedAt,
              syncStateByAuditId: args.syncStateByAuditId,
          };
}

/**
 * Recompute locally visible progress from the canonical in-memory session.
 *
 * @param session Session snapshot whose current draft state should drive progress.
 * @returns Local draft-progress percent plus the recomputed progress block.
 */
export function deriveLocalDraftProgress(session: AuditSession): LocalDraftProgressSnapshot {
    const executionMode = session.selected_execution_mode ?? session.meta.execution_mode;
    const visibleSections = getVisibleSections(
        session.instrument!,
        executionMode,
        readSectionResponsesBySection(session),
    );
    const requiredPreAuditComplete = isRequiredPreAuditComplete(
        session.instrument!.pre_audit_questions.filter((question) => question.page_key === "space_setup"),
        getPreAuditValues(session),
        executionMode,
    );
    let totalVisibleQuestions = 0;
    let answeredVisibleQuestions = 0;
    let completedSectionCount = 0;
    const progressSections = visibleSections.map((section) => {
        const progress = getInstrumentSectionLocalProgress(session, section);
        totalVisibleQuestions += progress.visibleQuestionCount;
        answeredVisibleQuestions += progress.answeredQuestionCount;
        if (progress.isComplete) {
            completedSectionCount += 1;
        }

        return {
            section_key: section.section_key,
            title: section.title,
            visible_question_count: progress.visibleQuestionCount,
            answered_question_count: progress.answeredQuestionCount,
            is_complete: progress.isComplete,
        };
    });
    const draftProgressPercent =
        totalVisibleQuestions === 0 ? 0 : Math.round((answeredVisibleQuestions / totalVisibleQuestions) * 10000) / 100;

    return {
        draftProgressPercent,
        progress: {
            required_pre_audit_complete: requiredPreAuditComplete,
            visible_section_count: visibleSections.length,
            completed_section_count: completedSectionCount,
            total_visible_questions: totalVisibleQuestions,
            answered_visible_questions: answeredVisibleQuestions,
            ready_to_submit: requiredPreAuditComplete && progressSections.every((section) => section.is_complete),
            sections: progressSections,
        },
    };
}

/**
 * Apply a local execution-mode change without discarding existing section data.
 *
 * @param args Current session, next execution mode, and dirty-meta inputs.
 * @returns Updated pure result including dirty-meta changes when needed.
 */
export function applyLocalExecutionModeChange(
    args: ApplyLocalExecutionModeChangeArgs,
): ApplyLocalExecutionModeChangeResult {
    if (!isAuditSessionEditable(args.session)) {
        return {
            session: args.session,
            dirtyMeta: args.dirtyMeta,
            didChange: false,
        };
    }

    if (
        args.session.selected_execution_mode === args.executionMode &&
        args.session.meta.execution_mode === args.executionMode
    ) {
        return {
            session: args.session,
            dirtyMeta: args.dirtyMeta,
            didChange: false,
        };
    }

    const nextSessionBase: AuditSession = {
        ...args.session,
        selected_execution_mode: args.executionMode,
        meta: {
            execution_mode: args.executionMode,
            final_comments: args.session.meta.final_comments,
        },
        aggregate: {
            ...args.session.aggregate,
            meta: {
                execution_mode: args.executionMode,
                final_comments: args.session.aggregate.meta.final_comments,
            },
        },
        scores: {
            ...args.session.scores,
            execution_mode: args.executionMode,
        },
    };
    const nextLocalProgress = deriveLocalDraftProgress(nextSessionBase);

    return {
        session: {
            ...nextSessionBase,
            scores: {
                ...nextSessionBase.scores,
                draft_progress_percent: nextLocalProgress.draftProgressPercent,
            },
            progress: nextLocalProgress.progress,
        },
        dirtyMeta: markMetaDirty(args.dirtyMeta, args.session.audit_id, args.nextVersion),
        didChange: true,
    };
}

/**
 * Stamp the local audit start timestamp when the auditor opens a pristine draft
 * for the first time on-device.
 *
 * This stays local-only for now so the mobile flow can report the practical
 * "opened" time even while the backend still returns an earlier access-time
 * timestamp.
 *
 * @param args Current session plus the on-device start timestamp.
 * @returns Updated pure result when the draft is still pristine.
 */
export function applyLocalAuditStartChange(args: ApplyLocalAuditStartChangeArgs): ApplyLocalAuditStartChangeResult {
    if (!isAuditSessionEditable(args.session) || !canStampLocalAuditStart(args.session)) {
        return {
            session: args.session,
            dirtyStartedAt: args.dirtyStartedAt,
            didChange: false,
        };
    }

    const nextStartedAtMs = Date.parse(args.startedAt);
    if (Number.isNaN(nextStartedAtMs) || args.session.started_at === args.startedAt) {
        return {
            session: args.session,
            dirtyStartedAt: args.dirtyStartedAt,
            didChange: false,
        };
    }

    return {
        session: {
            ...args.session,
            started_at: args.startedAt,
        },
        dirtyStartedAt: {
            ...args.dirtyStartedAt,
            [args.session.audit_id]: true,
        },
        didChange: true,
    };
}

/**
 * Apply an audit-level final-comments edit without mutating the original session.
 *
 * @param args Current session, updated comment text, and dirty-meta inputs.
 * @returns Updated pure result including dirty-meta changes when needed.
 */
export function applyLocalFinalCommentsChange(
    args: ApplyLocalFinalCommentsChangeArgs,
): ApplyLocalFinalCommentsChangeResult {
    if (!isAuditSessionEditable(args.session)) {
        return {
            session: args.session,
            dirtyMeta: args.dirtyMeta,
            didChange: false,
        };
    }

    const normalizedFinalComments = normalizeDraftComment(args.finalComments);
    if (args.session.meta.final_comments === normalizedFinalComments) {
        return {
            session: args.session,
            dirtyMeta: args.dirtyMeta,
            didChange: false,
        };
    }

    return {
        session: {
            ...args.session,
            meta: {
                ...args.session.meta,
                final_comments: normalizedFinalComments,
            },
            aggregate: {
                ...args.session.aggregate,
                meta: {
                    ...args.session.aggregate.meta,
                    final_comments: normalizedFinalComments,
                },
            },
        },
        dirtyMeta: markMetaDirty(args.dirtyMeta, args.session.audit_id, args.nextVersion),
        didChange: true,
    };
}

/**
 * Apply a local question-answer edit without mutating the original session.
 *
 * @param args Current session, target question, and dirty-state inputs.
 * @returns Updated pure result including dirty-state changes when needed.
 */
export function applyLocalQuestionAnswerChange(
    args: ApplyLocalQuestionAnswerChangeArgs,
): ApplyLocalQuestionAnswerChangeResult {
    if (!isAuditSessionEditable(args.session)) {
        return {
            session: args.session,
            dirtySections: args.dirtySections,
            didChange: false,
        };
    }

    const currentAnswers = args.session.sections[args.sectionKey]?.responses[args.questionKey] ?? {};
    if (areQuestionResponsePayloadsEqual(currentAnswers, args.answers)) {
        return {
            session: args.session,
            dirtySections: args.dirtySections,
            didChange: false,
        };
    }

    const currentSection = cloneSectionState(args.session.sections[args.sectionKey], args.sectionKey);
    const nextResponses = cloneSectionResponses(currentSection.responses);
    nextResponses[args.questionKey] = cloneQuestionResponsePayload(args.answers);

    const nextSection: AuditSectionState = {
        ...currentSection,
        responses: nextResponses,
    };

    return {
        session: {
            ...args.session,
            sections: {
                ...args.session.sections,
                [args.sectionKey]: nextSection,
            },
            aggregate: {
                ...args.session.aggregate,
                sections: {
                    ...args.session.aggregate.sections,
                    [args.sectionKey]: cloneSectionState(nextSection, args.sectionKey),
                },
            },
        },
        dirtySections: markSectionDirty(args.dirtySections, args.session.audit_id, args.sectionKey, args.nextVersion),
        didChange: true,
    };
}

/**
 * Apply a local section-note edit without mutating the original session.
 *
 * @param args Current session, target section, and dirty-state inputs.
 * @returns Updated pure result including dirty-state changes when needed.
 */
export function applyLocalSectionNoteChange(args: ApplyLocalSectionNoteChangeArgs): ApplyLocalSectionNoteChangeResult {
    if (!isAuditSessionEditable(args.session)) {
        return {
            session: args.session,
            dirtySections: args.dirtySections,
            didChange: false,
        };
    }

    const currentSection = cloneSectionState(args.session.sections[args.sectionKey], args.sectionKey);
    if (currentSection.note === args.note) {
        return {
            session: args.session,
            dirtySections: args.dirtySections,
            didChange: false,
        };
    }

    const nextSection: AuditSectionState = {
        ...currentSection,
        note: args.note,
    };

    return {
        session: {
            ...args.session,
            sections: {
                ...args.session.sections,
                [args.sectionKey]: nextSection,
            },
            aggregate: {
                ...args.session.aggregate,
                sections: {
                    ...args.session.aggregate.sections,
                    [args.sectionKey]: cloneSectionState(nextSection, args.sectionKey),
                },
            },
        },
        dirtySections: markSectionDirty(args.dirtySections, args.session.audit_id, args.sectionKey, args.nextVersion),
        didChange: true,
    };
}

/**
 * Apply a local pre-audit edit without mutating the original session.
 *
 * @param args Current session, incoming values, and dirty-state inputs.
 * @returns Updated pure result including dirty-state changes when needed.
 */
export function applyLocalPreAuditChange(args: ApplyLocalPreAuditChangeArgs): ApplyLocalPreAuditChangeResult {
    if (!isAuditSessionEditable(args.session)) {
        return {
            session: args.session,
            dirtyPreAudit: args.dirtyPreAudit,
            didChange: false,
        };
    }

    const nextPreAudit = mergePreAuditValues(args.session.pre_audit, args.values);
    if (arePreAuditValuesEqual(args.session.pre_audit, nextPreAudit)) {
        return {
            session: args.session,
            dirtyPreAudit: args.dirtyPreAudit,
            didChange: false,
        };
    }

    return {
        session: {
            ...args.session,
            pre_audit: clonePreAuditValues(nextPreAudit),
            aggregate: {
                ...args.session.aggregate,
                pre_audit: clonePreAuditValues(nextPreAudit),
            },
        },
        dirtyPreAudit: markPreAuditDirty(args.dirtyPreAudit, args.session.audit_id, args.nextVersion),
        didChange: true,
    };
}

/**
 * Clear dirty-state entries only when the outbound snapshot version was fully
 * acknowledged and no newer local edit has superseded it.
 *
 * @param args Current dirty state plus the acknowledged outbound snapshot.
 * @returns Dirty-state maps with only safe-to-clear versions removed.
 */
export function clearAcknowledgedDirtyState(args: ClearAcknowledgedDirtyStateArgs): ClearAcknowledgedDirtyStateResult {
    if (args.auditId !== args.snapshot.auditId) {
        throw new Error(
            `Dirty state acknowledgement audit id mismatch: received ${JSON.stringify(args.auditId)}, snapshot ${JSON.stringify(args.snapshot.auditId)}.`,
        );
    }

    const targetAuditId = args.snapshot.auditId;

    return {
        dirtySections: clearAcknowledgedSectionVersions(
            args.currentDirtySections,
            targetAuditId,
            args.snapshot.sectionVersions,
        ),
        dirtyPreAudit: clearAcknowledgedVersionMap(
            args.currentDirtyPreAudit,
            targetAuditId,
            args.snapshot.preAuditVersion,
        ),
        dirtyMeta: clearAcknowledgedVersionMap(args.currentDirtyMeta, targetAuditId, args.snapshot.metaVersion),
        dirtyStartedAt: args.snapshot.startedAtFlagged
            ? clearAcknowledgedStartedAtFlag(args.currentDirtyStartedAt, targetAuditId)
            : args.currentDirtyStartedAt,
    };
}

function markSectionDirty(current: DirtySections, auditId: string, sectionKey: string, version: number): DirtySections {
    const currentAuditSections = current[auditId];
    if (currentAuditSections === undefined) {
        return {
            ...current,
            [auditId]: {
                [sectionKey]: version,
            },
        };
    }

    return {
        ...current,
        [auditId]: {
            ...currentAuditSections,
            [sectionKey]: version,
        },
    };
}

function markPreAuditDirty(current: DirtyPreAudit, auditId: string, version: number): DirtyPreAudit {
    return markDirtyVersion(current, auditId, version);
}

function markMetaDirty(current: DirtyMeta, auditId: string, version: number): DirtyMeta {
    return markDirtyVersion(current, auditId, version);
}

function markDirtyVersion<TVersionMap extends Record<string, number>>(
    current: TVersionMap,
    auditId: string,
    version: number,
): TVersionMap {
    return {
        ...current,
        [auditId]: version,
    };
}

function areQuestionResponsePayloadsEqual(current: QuestionResponsePayload, next: QuestionResponsePayload): boolean {
    const currentKeys = Object.keys(current);
    const nextKeys = Object.keys(next);

    if (currentKeys.length !== nextKeys.length) {
        return false;
    }

    for (const answerKey of currentKeys) {
        const currentValue = current[answerKey];
        const nextValue = next[answerKey];
        if (currentValue === undefined || nextValue === undefined) {
            return false;
        }

        if (!areQuestionResponseValuesEqual(currentValue, nextValue)) {
            return false;
        }
    }

    return true;
}

/**
 * Compare two response values structurally while preserving array order.
 *
 * @param current Current persisted answer value.
 * @param next Incoming local answer value.
 * @returns True when both values are logically equivalent.
 */
function areQuestionResponseValuesEqual(current: QuestionResponseValue, next: QuestionResponseValue): boolean {
    if (typeof current === "string" || current === null) {
        return current === next;
    }

    if (Array.isArray(current)) {
        return areStringArraysEqual(current, next);
    }

    return areStringRecordsEqual(current, next);
}

function areStringArraysEqual(current: string[], next: QuestionResponseValue): boolean {
    if (!Array.isArray(next) || current.length !== next.length) {
        return false;
    }

    for (let index = 0; index < current.length; index += 1) {
        if (current[index] !== next[index]) {
            return false;
        }
    }

    return true;
}

function areStringRecordsEqual(current: Record<string, string>, next: QuestionResponseValue): boolean {
    if (typeof next === "string" || next === null || Array.isArray(next)) {
        return false;
    }

    const currentKeys = Object.keys(current);
    const nextKeys = Object.keys(next);
    if (currentKeys.length !== nextKeys.length) {
        return false;
    }

    for (const recordKey of currentKeys) {
        const currentValue = current[recordKey];
        const nextValue = next[recordKey];
        if (currentValue === undefined || nextValue === undefined || currentValue !== nextValue) {
            return false;
        }
    }

    return true;
}

function cloneQuestionResponseValue(value: QuestionResponseValue): QuestionResponseValue {
    if (typeof value === "string" || value === null) {
        return value;
    }

    if (Array.isArray(value)) {
        return [...value];
    }

    return { ...value };
}

function cloneQuestionResponsePayload(value: QuestionResponsePayload): QuestionResponsePayload {
    const nextPayload: QuestionResponsePayload = {};
    for (const [answerKey, answerValue] of Object.entries(value)) {
        nextPayload[answerKey] = cloneQuestionResponseValue(answerValue);
    }
    return nextPayload;
}

function cloneSectionResponses(
    value: Record<string, QuestionResponsePayload> | undefined,
): Record<string, QuestionResponsePayload> {
    if (value === undefined) {
        return {};
    }

    const nextResponses: Record<string, QuestionResponsePayload> = {};
    for (const [questionKey, answers] of Object.entries(value)) {
        nextResponses[questionKey] = cloneQuestionResponsePayload(answers);
    }
    return nextResponses;
}

function readSectionResponsesBySection(session: AuditSession): Record<string, Record<string, QuestionResponsePayload>> {
    return Object.fromEntries(
        Object.entries(session.sections).map(([sectionKey, sectionState]) => [sectionKey, sectionState.responses]),
    );
}

function cloneSectionState(section: AuditSectionState | undefined, sectionKey: string): AuditSectionState {
    return {
        section_key: section?.section_key ?? sectionKey,
        responses: cloneSectionResponses(section?.responses),
        note: section?.note ?? null,
    };
}

function clonePreAuditValues(values: AuditPreAuditValues): AuditPreAuditValues {
    return {
        place_size: values.place_size,
        current_users_0_5: values.current_users_0_5,
        current_users_6_12: values.current_users_6_12,
        current_users_13_17: values.current_users_13_17,
        current_users_18_plus: values.current_users_18_plus,
        playspace_busyness: values.playspace_busyness,
        season: values.season,
        weather_conditions: [...values.weather_conditions],
        wind_conditions: values.wind_conditions,
    };
}

function mergePreAuditValues(
    current: AuditPreAuditValues,
    values: Record<string, string | string[] | null>,
): AuditPreAuditValues {
    const nextPreAudit = clonePreAuditValues(current);
    nextPreAudit.place_size = readNullableStringValue(values["place_size"], nextPreAudit.place_size);
    nextPreAudit.current_users_0_5 = readNullableStringValue(
        values["current_users_0_5"],
        nextPreAudit.current_users_0_5,
    );
    nextPreAudit.current_users_6_12 = readNullableStringValue(
        values["current_users_6_12"],
        nextPreAudit.current_users_6_12,
    );
    nextPreAudit.current_users_13_17 = readNullableStringValue(
        values["current_users_13_17"],
        nextPreAudit.current_users_13_17,
    );
    nextPreAudit.current_users_18_plus = readNullableStringValue(
        values["current_users_18_plus"],
        nextPreAudit.current_users_18_plus,
    );
    nextPreAudit.playspace_busyness = readNullableStringValue(
        values["playspace_busyness"],
        nextPreAudit.playspace_busyness,
    );
    nextPreAudit.season = readNullableStringValue(values["season"], nextPreAudit.season);
    nextPreAudit.weather_conditions = readStringArrayValue(
        values["weather_conditions"],
        nextPreAudit.weather_conditions,
    );
    nextPreAudit.wind_conditions = readNullableStringValue(values["wind_conditions"], nextPreAudit.wind_conditions);
    return nextPreAudit;
}

function arePreAuditValuesEqual(current: AuditPreAuditValues, next: AuditPreAuditValues): boolean {
    return (
        current.place_size === next.place_size &&
        current.current_users_0_5 === next.current_users_0_5 &&
        current.current_users_6_12 === next.current_users_6_12 &&
        current.current_users_13_17 === next.current_users_13_17 &&
        current.current_users_18_plus === next.current_users_18_plus &&
        current.playspace_busyness === next.playspace_busyness &&
        current.season === next.season &&
        arePreAuditStringArraysEqual(current.weather_conditions, next.weather_conditions) &&
        current.wind_conditions === next.wind_conditions
    );
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

function arePreAuditStringArraysEqual(current: string[], next: string[]): boolean {
    return areReadonlyStringArraysEqual(current, next);
}

function areCleanupComparableValuesEqual(current: CleanupComparable, next: CleanupComparable): boolean {
    if (typeof current === "string" || typeof next === "string") {
        return typeof current === "string" && typeof next === "string" && current === next;
    }

    if (Array.isArray(current) || Array.isArray(next)) {
        return Array.isArray(current) && Array.isArray(next) && areReadonlyStringArraysEqual(current, next);
    }

    if (!isCleanupComparableRecord(current) || !isCleanupComparableRecord(next)) {
        return false;
    }

    return areCleanupComparableRecordsEqual(current, next);
}

function areReadonlyStringArraysEqual(current: readonly string[], next: readonly string[]): boolean {
    if (current.length !== next.length) {
        return false;
    }

    for (let index = 0; index < current.length; index += 1) {
        if (current[index] !== next[index]) {
            return false;
        }
    }

    return true;
}

function isCleanupComparableRecord(
    value: CleanupComparable,
): value is Readonly<Record<string, string | readonly string[]>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function areCleanupComparableRecordsEqual(
    current: Readonly<Record<string, string | readonly string[]>>,
    next: Readonly<Record<string, string | readonly string[]>>,
): boolean {
    const currentKeys = Object.keys(current);
    const nextKeys = Object.keys(next);
    if (currentKeys.length !== nextKeys.length) {
        return false;
    }

    for (const recordKey of currentKeys) {
        const currentValue = current[recordKey];
        const nextValue = next[recordKey];
        if (currentValue === undefined || nextValue === undefined) {
            return false;
        }

        if (typeof currentValue === "string" || typeof nextValue === "string") {
            if (currentValue !== nextValue) {
                return false;
            }
            continue;
        }

        if (!areReadonlyStringArraysEqual(currentValue, nextValue)) {
            return false;
        }
    }

    return true;
}

function copyMetaDraftFromSession(source: AuditSession, target: AuditSession): AuditSession {
    return {
        ...target,
        selected_execution_mode: source.selected_execution_mode,
        meta: {
            execution_mode: source.meta.execution_mode,
            final_comments: source.meta.final_comments,
        },
        aggregate: {
            ...target.aggregate,
            meta: {
                execution_mode: source.meta.execution_mode,
                final_comments: source.meta.final_comments,
            },
        },
        scores: {
            ...target.scores,
            execution_mode: source.scores.execution_mode,
        },
    };
}

export function preserveLaterLocalStartTime(source: AuditSession, target: AuditSession): AuditSession {
    const sourceStartedAtMs = Date.parse(source.started_at);
    const targetStartedAtMs = Date.parse(target.started_at);
    if (Number.isNaN(sourceStartedAtMs) || Number.isNaN(targetStartedAtMs) || sourceStartedAtMs <= targetStartedAtMs) {
        return target;
    }

    return {
        ...target,
        started_at: source.started_at,
    };
}

function canStampLocalAuditStart(session: AuditSession): boolean {
    return (
        session.selected_execution_mode === null &&
        session.meta.execution_mode === null &&
        session.meta.final_comments === null &&
        !hasPreAuditContent(session.pre_audit) &&
        !hasSectionContent(session.sections) &&
        session.progress.answered_visible_questions === 0 &&
        (session.scores.draft_progress_percent ?? 0) === 0
    );
}

function hasPreAuditContent(values: AuditPreAuditValues): boolean {
    return (
        values.place_size !== null ||
        values.current_users_0_5 !== null ||
        values.current_users_6_12 !== null ||
        values.current_users_13_17 !== null ||
        values.current_users_18_plus !== null ||
        values.playspace_busyness !== null ||
        values.season !== null ||
        values.weather_conditions.length > 0 ||
        values.wind_conditions !== null
    );
}

function hasSectionContent(sections: Record<string, AuditSectionState>): boolean {
    return Object.values(sections).some((section) => {
        return section.note !== null || Object.keys(section.responses).length > 0;
    });
}

function copyPreAuditDraftFromSession(source: AuditSession, target: AuditSession): AuditSession {
    return {
        ...target,
        pre_audit: clonePreAuditValues(source.pre_audit),
        aggregate: {
            ...target.aggregate,
            pre_audit: clonePreAuditValues(source.pre_audit),
        },
    };
}

function copySectionDraftFromSession(source: AuditSession, target: AuditSession, sectionKey: string): AuditSession {
    const sectionState = cloneSectionState(source.sections[sectionKey], sectionKey);
    return {
        ...target,
        sections: {
            ...target.sections,
            [sectionKey]: sectionState,
        },
        aggregate: {
            ...target.aggregate,
            sections: {
                ...target.aggregate.sections,
                [sectionKey]: cloneSectionState(sectionState, sectionKey),
            },
        },
    };
}

function clearDirtyStateForAudit(
    auditId: string,
    dirtyMeta: DirtyMeta,
    dirtyPreAudit: DirtyPreAudit,
    dirtySections: DirtySections,
    dirtyStartedAt: DirtyStartedAt,
): {
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly dirtyStartedAt: DirtyStartedAt;
} {
    const nextDirtyMeta = { ...dirtyMeta };
    delete nextDirtyMeta[auditId];

    const nextDirtyPreAudit = { ...dirtyPreAudit };
    delete nextDirtyPreAudit[auditId];

    const nextDirtySections = { ...dirtySections };
    delete nextDirtySections[auditId];

    const nextDirtyStartedAt = { ...dirtyStartedAt };
    delete nextDirtyStartedAt[auditId];

    return {
        dirtyMeta: nextDirtyMeta,
        dirtyPreAudit: nextDirtyPreAudit,
        dirtySections: nextDirtySections,
        dirtyStartedAt: nextDirtyStartedAt,
    };
}

function normalizeDraftComment(value: string): string | null {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

function clearAcknowledgedSectionVersions(
    current: DirtySections,
    auditId: string,
    acknowledgedSectionVersions: Record<string, number>,
): DirtySections {
    const existing = current[auditId];
    if (existing === undefined) {
        return current;
    }

    const remaining: Record<string, number> = {};
    for (const [sectionKey, version] of Object.entries(existing)) {
        const acknowledgedVersion = acknowledgedSectionVersions[sectionKey];
        if (acknowledgedVersion === undefined || version > acknowledgedVersion) {
            remaining[sectionKey] = version;
        }
    }

    if (Object.keys(remaining).length === 0) {
        const nextDirtySections = { ...current };
        delete nextDirtySections[auditId];
        return nextDirtySections;
    }

    return {
        ...current,
        [auditId]: remaining,
    };
}

function clearAcknowledgedVersionMap(
    current: Record<string, number>,
    auditId: string,
    acknowledgedVersion: number | null,
): Record<string, number> {
    if (acknowledgedVersion === null) {
        return current;
    }

    const currentVersion = current[auditId];
    if (currentVersion === undefined || currentVersion > acknowledgedVersion) {
        return current;
    }

    const nextVersionMap = { ...current };
    delete nextVersionMap[auditId];
    return nextVersionMap;
}

function clearAcknowledgedStartedAtFlag(current: DirtyStartedAt, auditId: string): DirtyStartedAt {
    if (current[auditId] !== true) {
        return current;
    }

    const nextDirtyStartedAt = { ...current };
    delete nextDirtyStartedAt[auditId];
    return nextDirtyStartedAt;
}
