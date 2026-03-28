import { BASE_PLAYSPACE_INSTRUMENT } from "../instrument";
import * as storeSyncCore from "./store-sync-core";
import type {
    AuditDraftSave,
    AuditMeta,
    AuditPreAuditValues,
    AuditSectionState,
    AuditSession,
    AuditStatus,
    AuditSyncPhase,
    AuditSyncState,
    AuditSyncStateByAuditId,
    DirtyMeta,
    DirtyPreAudit,
    DirtySections,
    ExecutionMode,
    QuestionResponsePayload,
} from "./types";

interface SessionFixtureOverrides {
    readonly auditId?: string;
    readonly revision?: number;
    readonly selected_execution_mode?: ExecutionMode | null;
    readonly meta?: AuditMeta;
    readonly pre_audit?: AuditPreAuditValues;
    readonly sections?: Record<string, AuditSectionState>;
    readonly scores?: AuditSession["scores"];
    readonly progress?: AuditSession["progress"];
}

type AutomaticSyncFn = (phase: AuditSyncPhase) => boolean;
type AutomaticSyncTrigger = "auth_restore" | "foreground" | "network_restore";
type ManualRetryFn = (args: {
    readonly currentPhase: AuditSyncPhase;
    readonly updatedAt: string;
}) => AuditSyncState;
type LocalEditPhaseFn = (args: {
    readonly currentPhase: AuditSyncPhase;
    readonly updatedAt: string;
}) => AuditSyncState;
type ExplicitSubmitRetryFn = (args: {
    readonly currentPhase: AuditSyncPhase;
    readonly updatedAt: string;
}) => AuditSyncState;
type SaveAcknowledgementFn = (args: {
    readonly session: AuditSession;
    readonly saveResult: AuditDraftSave;
}) => AuditSession;
type SaveConflictFn = (args: {
    readonly currentSession: AuditSession;
    readonly latestSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
}) => {
    readonly action: "retry_save" | "terminalize_submitted";
    readonly rebasedSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
};
type SaveConflictRecoveryPhaseFn = (args: {
    readonly action: "retry_save" | "terminalize_submitted";
    readonly rebasedSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly recoveredWithoutRetry: boolean;
}) => AuditSyncPhase;
type SubmitConflictFn = (args: {
    readonly currentSession: AuditSession;
    readonly latestSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
}) => {
    readonly action: "refresh_and_require_resubmit" | "terminalize_submitted";
    readonly rebasedSession: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
};
type SubmitConflictPhaseFn = (
    action: "refresh_and_require_resubmit" | "terminalize_submitted",
) => AuditSyncPhase;
type FinishSubmitResolutionFn = (args: {
    readonly latestSession: AuditSession;
    readonly currentDirtyMeta: DirtyMeta;
    readonly currentDirtyPreAudit: DirtyPreAudit;
    readonly currentDirtySections: DirtySections;
}) => {
    readonly phase: AuditSyncPhase;
    readonly session: AuditSession;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
};
type GlobalSyncFeedbackFn = (args: { readonly syncStateByAuditId: AuditSyncStateByAuditId }) => {
    readonly isSyncing: boolean;
    readonly isSavingDraft: boolean;
    readonly message: string | null;
    readonly auditId: string | null;
    readonly phase: AuditSyncPhase | null;
};
type SingleFlightRunnerFactoryFn = <TArgs extends readonly unknown[], TResult>(
    runner: (...args: TArgs) => Promise<TResult>,
) => (...args: TArgs) => Promise<TResult>;
type KeyedSingleFlightRunnerFactoryFn = <
    TKey extends string,
    TArgs extends readonly unknown[],
    TResult,
>(
    readKey: (...args: TArgs) => TKey,
    runner: (...args: TArgs) => Promise<TResult>,
) => (...args: TArgs) => Promise<TResult>;
type CanApplyLocalDraftEditsFn = (phase: AuditSyncPhase) => boolean;
type HasPendingSubmitResolutionFn = (syncStateByAuditId: AuditSyncStateByAuditId) => boolean;
type ShouldReopenAutomaticTriggerFn = (args: {
    readonly currentPhase: AuditSyncPhase;
    readonly trigger: AutomaticSyncTrigger;
}) => boolean;
type ShouldRetrySubmitResolutionFn = (args: {
    readonly currentPhase: AuditSyncPhase;
    readonly hasDirtyFragments: boolean;
}) => boolean;
type ShouldRetrySubmitResolutionOnTriggerFn = (args: {
    readonly currentPhase: AuditSyncPhase;
    readonly hasDirtyFragments: boolean;
    readonly trigger: AutomaticSyncTrigger;
}) => boolean;
type ListPendingSubmitResolutionAuditIdsFn = (args: {
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
    readonly dirtyMeta: DirtyMeta;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtySections: DirtySections;
    readonly requestedAuditIds?: readonly string[];
}) => string[];

/**
 * Assert that two primitive values are identical.
 *
 * @param actual Runtime value under test.
 * @param expected Expected value.
 * @param message Failure message prefix.
 */
function assertEqual<TValue>(actual: TValue, expected: TValue, message: string): void {
    if (actual !== expected) {
        throw new Error(
            `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
        );
    }
}

/**
 * Assert that two structured values serialize identically.
 *
 * @param actual Runtime value under test.
 * @param expected Expected value.
 * @param message Failure message prefix.
 */
function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(`${message}: expected ${expectedJson}, received ${actualJson}.`);
    }
}

/**
 * Require a value to be a function export before continuing the test.
 *
 * @param exportName Expected module export name.
 * @returns The typed function export.
 */
function readFunctionExport<TFunction extends (...args: never[]) => unknown>(
    exportName: string,
): TFunction {
    const candidate = Reflect.get(storeSyncCore, exportName);
    if (typeof candidate !== "function") {
        throw new TypeError(`Expected ${exportName} to be exported from store-sync-core.`);
    }
    return candidate as TFunction;
}

/**
 * Clone a question response payload for isolated test fixtures.
 *
 * @param answers Payload to clone.
 * @returns A cloned payload with copied arrays and records.
 */
function cloneQuestionResponsePayload(answers: QuestionResponsePayload): QuestionResponsePayload {
    const nextPayload: QuestionResponsePayload = {};
    for (const [answerKey, answerValue] of Object.entries(answers)) {
        if (typeof answerValue === "string" || answerValue === null) {
            nextPayload[answerKey] = answerValue;
            continue;
        }

        if (Array.isArray(answerValue)) {
            nextPayload[answerKey] = [...answerValue];
            continue;
        }

        nextPayload[answerKey] = { ...answerValue };
    }
    return nextPayload;
}

/**
 * Clone a section fixture.
 *
 * @param section Section fixture to clone.
 * @param sectionKey Fallback section key when the source is undefined.
 * @returns Cloned section state.
 */
function cloneSectionState(
    section: AuditSectionState | undefined,
    sectionKey: string,
): AuditSectionState {
    return {
        section_key: section?.section_key ?? sectionKey,
        responses: Object.fromEntries(
            Object.entries(section?.responses ?? {}).map(([questionKey, answers]) => [
                questionKey,
                cloneQuestionResponsePayload(answers),
            ]),
        ),
        note: section?.note ?? null,
    };
}

/**
 * Clone an audit meta block.
 *
 * @param meta Meta block to clone.
 * @returns Cloned meta block.
 */
function cloneMeta(meta: AuditMeta): AuditMeta {
    return {
        execution_mode: meta.execution_mode,
    };
}

/**
 * Clone a pre-audit block.
 *
 * @param preAudit Pre-audit values to clone.
 * @returns Cloned pre-audit values.
 */
function clonePreAuditValues(preAudit: AuditPreAuditValues): AuditPreAuditValues {
    return {
        place_size: preAudit.place_size,
        current_users_0_5: preAudit.current_users_0_5,
        current_users_6_12: preAudit.current_users_6_12,
        current_users_13_17: preAudit.current_users_13_17,
        current_users_18_plus: preAudit.current_users_18_plus,
        playspace_busyness: preAudit.playspace_busyness,
        season: preAudit.season,
        weather_conditions: [...preAudit.weather_conditions],
        wind_conditions: preAudit.wind_conditions,
    };
}

/**
 * Clone a record of canonical section states.
 *
 * @param sections Section map to clone.
 * @returns Cloned section map.
 */
function cloneSectionsMap(
    sections: Record<string, AuditSectionState>,
): Record<string, AuditSectionState> {
    return Object.fromEntries(
        Object.entries(sections).map(([sectionKey, sectionState]) => [
            sectionKey,
            cloneSectionState(sectionState, sectionKey),
        ]),
    );
}

/**
 * Build the default section fixture used across the regression checks.
 *
 * @returns Canonical section fixture.
 */
function buildDefaultSections(): Record<string, AuditSectionState> {
    return {
        section_a: {
            section_key: "section_a",
            note: null,
            responses: {
                question_a: {
                    quantity: "baseline",
                },
            },
        },
    };
}

/**
 * Build the default pre-audit fixture used across the regression checks.
 *
 * @returns Canonical pre-audit values.
 */
function buildDefaultPreAudit(): AuditPreAuditValues {
    return {
        place_size: null,
        current_users_0_5: null,
        current_users_6_12: null,
        current_users_13_17: null,
        current_users_18_plus: null,
        playspace_busyness: null,
        season: null,
        weather_conditions: [],
        wind_conditions: null,
    };
}

/**
 * Build a focused audit session fixture for sync conflict tests.
 *
 * @param status Audit lifecycle status for the fixture.
 * @param overrides Optional field overrides for the canonical session.
 * @returns Minimal valid session data for pure helper tests.
 */
function buildSession(status: AuditStatus, overrides: SessionFixtureOverrides = {}): AuditSession {
    const selectedExecutionMode =
        overrides.selected_execution_mode ?? overrides.meta?.execution_mode ?? "audit";
    const meta = cloneMeta(overrides.meta ?? { execution_mode: selectedExecutionMode });
    const preAudit = clonePreAuditValues(overrides.pre_audit ?? buildDefaultPreAudit());
    const sections = cloneSectionsMap(overrides.sections ?? buildDefaultSections());
    const revision = overrides.revision ?? 3;
    const scores = overrides.scores ?? {
        draft_progress_percent: null,
        execution_mode: selectedExecutionMode,
        overall: null,
        by_section: {},
        by_domain: {},
    };
    const progress = overrides.progress ?? {
        required_pre_audit_complete: false,
        visible_section_count: Object.keys(sections).length,
        completed_section_count: 0,
        total_visible_questions: 1,
        answered_visible_questions: 0,
        ready_to_submit: false,
        sections: [],
    };

    return {
        audit_id: overrides.auditId ?? "11111111-1111-4111-8111-111111111111",
        audit_code: "AUD-001",
        project_id: "22222222-2222-4222-8222-222222222222",
        project_name: "Project",
        place_id: "33333333-3333-4333-8333-333333333333",
        place_name: "Place",
        place_type: "playspace",
        allowed_execution_modes: ["audit", "survey", "both"],
        selected_execution_mode: selectedExecutionMode,
        status,
        instrument_key: BASE_PLAYSPACE_INSTRUMENT.instrument_key,
        instrument_version: BASE_PLAYSPACE_INSTRUMENT.instrument_version,
        instrument: BASE_PLAYSPACE_INSTRUMENT,
        schema_version: 1,
        revision,
        aggregate: {
            schema_version: 1,
            revision,
            meta: cloneMeta(meta),
            pre_audit: clonePreAuditValues(preAudit),
            sections: cloneSectionsMap(sections),
        },
        started_at: "2026-03-28T10:00:00.000Z",
        submitted_at: status === "SUBMITTED" ? "2026-03-28T11:00:00.000Z" : null,
        total_minutes: null,
        meta,
        pre_audit: preAudit,
        sections,
        scores,
        progress,
    };
}

/**
 * Build an editable session fixture.
 *
 * @param overrides Optional field overrides for the canonical session.
 * @returns In-progress session fixture.
 */
function buildEditableSession(overrides: SessionFixtureOverrides = {}): AuditSession {
    return buildSession("IN_PROGRESS", overrides);
}

/**
 * Build a submitted session fixture.
 *
 * @param overrides Optional field overrides for the canonical session.
 * @returns Submitted session fixture.
 */
function buildSubmittedSession(overrides: SessionFixtureOverrides = {}): AuditSession {
    return buildSession("SUBMITTED", overrides);
}

function testOnlyDirtyAuditsAutoSync(): void {
    const shouldAttemptAutomaticSync = readFunctionExport<AutomaticSyncFn>(
        "shouldAttemptAutomaticSync",
    );

    assertEqual(shouldAttemptAutomaticSync("dirty"), true, "Dirty audits may auto-sync");
    assertEqual(
        shouldAttemptAutomaticSync("idle"),
        false,
        "Idle audits must not auto-sync without new local changes",
    );
    assertEqual(
        shouldAttemptAutomaticSync("blocked_server"),
        false,
        "Blocked audits must transition back to dirty before auto-sync",
    );
}

async function testSingleFlightRunnerReusesInFlightPromise(): Promise<void> {
    const createSingleFlightRunner = readFunctionExport<SingleFlightRunnerFactoryFn>(
        "createSingleFlightRunner",
    );

    let runCount = 0;
    let resolveFirstRun: ((value: string) => void) | null = null;
    const wrapped = createSingleFlightRunner(async (label: string) => {
        runCount += 1;
        return await new Promise<string>((resolve) => {
            resolveFirstRun = resolve;
            if (label === "unexpected") {
                resolve("unexpected");
            }
        });
    });

    const firstPromise = wrapped("first");
    const secondPromise = wrapped("second");

    assertEqual(runCount, 1, "Single-flight runner must invoke the inner runner only once");
    assertEqual(
        firstPromise,
        secondPromise,
        "Single-flight runner must return the in-flight promise while work is pending",
    );

    if (resolveFirstRun === null) {
        throw new TypeError("Expected single-flight runner to capture a resolver.");
    }
    const resolveFirstRunCallback: (value: string) => void = resolveFirstRun;

    resolveFirstRunCallback("resolved");
    const firstResult = await firstPromise;
    const secondResult = await secondPromise;
    assertEqual(firstResult, "resolved", "Single-flight runner must resolve the original result");
    assertEqual(secondResult, "resolved", "Joined callers must observe the same resolved result");

    const thirdPromise = wrapped("third");
    assertEqual(runCount, 2, "Single-flight runner must allow a fresh run after completion");
    assertEqual(
        thirdPromise === firstPromise,
        false,
        "Single-flight runner must create a new promise after the previous run settles",
    );

    if (resolveFirstRun === null) {
        throw new TypeError("Expected second single-flight run to capture a resolver.");
    }
    const resolveSecondRunCallback: (value: string) => void = resolveFirstRun;
    resolveSecondRunCallback("resolved-again");
    assertEqual(
        await thirdPromise,
        "resolved-again",
        "Subsequent single-flight runs must still resolve correctly",
    );
}

async function testDuplicateSubmitCallersReuseOneKeyedFlight(): Promise<void> {
    const createKeyedSingleFlightRunner = readFunctionExport<KeyedSingleFlightRunnerFactoryFn>(
        "createKeyedSingleFlightRunner",
    );

    let runCount = 0;
    let resolveByAuditId: Record<string, (value: string) => void> = {};
    const wrapped = createKeyedSingleFlightRunner(
        (_sessionToken: string, auditId: string) => auditId,
        async (_sessionToken: string, auditId: string) => {
            runCount += 1;
            return await new Promise<string>((resolve) => {
                resolveByAuditId = {
                    ...resolveByAuditId,
                    [auditId]: resolve,
                };
            });
        },
    );

    const firstPromise = wrapped("session", "audit-a");
    const secondPromise = wrapped("session", "audit-a");
    const thirdPromise = wrapped("session", "audit-b");

    assertEqual(
        firstPromise,
        secondPromise,
        "Duplicate submit callers for the same audit must reuse the same in-flight promise",
    );
    assertEqual(
        thirdPromise === firstPromise,
        false,
        "Different audits must still get independent submit flights",
    );
    assertEqual(runCount, 2, "Only one submit flight should run per audit id");

    const resolveAuditA = resolveByAuditId["audit-a"];
    const resolveAuditB = resolveByAuditId["audit-b"];
    if (resolveAuditA === undefined || resolveAuditB === undefined) {
        throw new TypeError("Expected keyed single-flight runner to capture both audit resolvers.");
    }

    resolveAuditA("submitted-a");
    resolveAuditB("submitted-b");

    assertEqual(
        await firstPromise,
        "submitted-a",
        "The first keyed submit caller must receive the shared submit result",
    );
    assertEqual(
        await secondPromise,
        "submitted-a",
        "The joined keyed submit caller must receive the shared submit result",
    );
    assertEqual(
        await thirdPromise,
        "submitted-b",
        "Independent submit flights must still resolve their own audit result",
    );
}

function testLocalDraftEditsAreBlockedDuringSubmitResolutionPhases(): void {
    const canApplyLocalDraftEdits =
        readFunctionExport<CanApplyLocalDraftEditsFn>("canApplyLocalDraftEdits");

    assertEqual(
        canApplyLocalDraftEdits("submitting"),
        false,
        "Local writes must be blocked while submit is in flight",
    );
    assertEqual(
        canApplyLocalDraftEdits("resolving_submit"),
        false,
        "Local writes must be blocked while a restored submit is resolving",
    );
    assertEqual(
        canApplyLocalDraftEdits("dirty"),
        true,
        "Editable dirty drafts must still accept local writes",
    );
}

function testLocalEditsClearBlockedNetworkAndAuthDetail(): void {
    const transitionPhaseOnLocalEdit = readFunctionExport<LocalEditPhaseFn>(
        "transitionPhaseOnLocalEdit",
    );

    const blockedNetwork = transitionPhaseOnLocalEdit({
        currentPhase: "blocked_network",
        updatedAt: "2026-03-28T08:45:00.000Z",
    });
    const blockedAuth = transitionPhaseOnLocalEdit({
        currentPhase: "blocked_auth",
        updatedAt: "2026-03-28T08:46:00.000Z",
    });

    assertEqual(
        blockedNetwork.phase,
        "blocked_network",
        "Local edits must not incorrectly reopen blocked network state",
    );
    assertEqual(
        blockedAuth.phase,
        "blocked_auth",
        "Local edits must not incorrectly reopen blocked auth state",
    );
    assertEqual(
        blockedNetwork.detail,
        null,
        "Local edits must clear stale blocked network detail through the transition helper",
    );
    assertEqual(
        blockedAuth.detail,
        null,
        "Local edits must clear stale blocked auth detail through the transition helper",
    );
    assertEqual(
        blockedNetwork.updated_at,
        "2026-03-28T08:45:00.000Z",
        "Local edits must refresh blocked network timestamps through the transition helper",
    );
    assertEqual(
        blockedAuth.updated_at,
        "2026-03-28T08:46:00.000Z",
        "Local edits must refresh blocked auth timestamps through the transition helper",
    );
}

function testResolvingSubmitAuditsStillRequireNormalSyncResolution(): void {
    const hasPendingSubmitResolution = readFunctionExport<HasPendingSubmitResolutionFn>(
        "hasPendingSubmitResolution",
    );

    assertEqual(
        hasPendingSubmitResolution({
            a: {
                phase: "resolving_submit",
                detail: null,
                updated_at: "2026-03-28T08:00:00.000Z",
            },
        }),
        true,
        "Restart-during-submit audits must still schedule a normal sync resolution pass",
    );
    assertEqual(
        hasPendingSubmitResolution({
            a: {
                phase: "blocked_server",
                detail: "retry later",
                updated_at: "2026-03-28T08:01:00.000Z",
            },
        }),
        false,
        "Blocked audits alone must not masquerade as pending submit resolution",
    );
}

function testTargetedSubmitResolutionSelectionIgnoresUnrelatedAudits(): void {
    const listPendingSubmitResolutionAuditIds =
        readFunctionExport<ListPendingSubmitResolutionAuditIdsFn>(
            "listPendingSubmitResolutionAuditIds",
        );

    assertDeepEqual(
        listPendingSubmitResolutionAuditIds({
            syncStateByAuditId: {
                "audit-a": {
                    phase: "resolving_submit",
                    detail: null,
                    updated_at: "2026-03-28T08:00:00.000Z",
                },
                "audit-b": {
                    phase: "dirty",
                    detail: null,
                    updated_at: "2026-03-28T08:01:00.000Z",
                },
            },
            dirtyMeta: {
                "audit-b": 1,
            },
            dirtyPreAudit: {},
            dirtySections: {},
            requestedAuditIds: ["audit-b"],
        }),
        [],
        "Targeted flush selection must not await unrelated submit-resolution audits",
    );
    assertDeepEqual(
        listPendingSubmitResolutionAuditIds({
            syncStateByAuditId: {
                "audit-a": {
                    phase: "resolving_submit",
                    detail: null,
                    updated_at: "2026-03-28T08:00:00.000Z",
                },
                "audit-b": {
                    phase: "dirty",
                    detail: null,
                    updated_at: "2026-03-28T08:01:00.000Z",
                },
            },
            dirtyMeta: {
                "audit-b": 1,
            },
            dirtyPreAudit: {},
            dirtySections: {},
        }),
        ["audit-a"],
        "Ordinary full flush selection must still include pending submit-resolution audits",
    );
}

function testDirtylessSubmitResolutionBlockedServerStillRetriesOnNormalTrigger(): void {
    const shouldRetrySubmitResolution = readFunctionExport<ShouldRetrySubmitResolutionFn>(
        "shouldRetrySubmitResolution",
    );

    assertEqual(
        shouldRetrySubmitResolution({
            currentPhase: "resolving_submit",
            hasDirtyFragments: false,
        }),
        true,
        "Active submit resolution must always retry on the next normal trigger",
    );
    assertEqual(
        shouldRetrySubmitResolution({
            currentPhase: "blocked_server",
            hasDirtyFragments: false,
        }),
        true,
        "Dirtyless blocked_server after submit resolution must retry on the next normal trigger",
    );
    assertEqual(
        shouldRetrySubmitResolution({
            currentPhase: "blocked_network",
            hasDirtyFragments: false,
        }),
        true,
        "Dirtyless blocked_network after submit resolution must retry on ordinary normal sync passes",
    );
    assertEqual(
        shouldRetrySubmitResolution({
            currentPhase: "blocked_server",
            hasDirtyFragments: true,
        }),
        false,
        "Ordinary dirty draft server failures must stay on the draft retry path instead",
    );
}

function testDirtylessSubmitResolutionBlockedAuthRetriesOnlyOnAuthRestore(): void {
    const shouldRetrySubmitResolutionOnTrigger =
        readFunctionExport<ShouldRetrySubmitResolutionOnTriggerFn>(
            "shouldRetrySubmitResolutionOnTrigger",
        );

    assertEqual(
        shouldRetrySubmitResolutionOnTrigger({
            currentPhase: "blocked_auth",
            hasDirtyFragments: false,
            trigger: "auth_restore",
        }),
        true,
        "Dirtyless blocked_auth after submit resolution must retry when auth is restored",
    );
    assertEqual(
        shouldRetrySubmitResolutionOnTrigger({
            currentPhase: "blocked_auth",
            hasDirtyFragments: false,
            trigger: "foreground",
        }),
        false,
        "Dirtyless blocked_auth after submit resolution must not retry on unrelated foreground triggers",
    );
    assertEqual(
        shouldRetrySubmitResolutionOnTrigger({
            currentPhase: "blocked_network",
            hasDirtyFragments: false,
            trigger: "foreground",
        }),
        true,
        "Dirtyless blocked_network after submit resolution must retry on foreground triggers",
    );
}

function testBlockedServerReopensOnAuthRestoreTrigger(): void {
    const shouldReopenOnAutomaticSyncTrigger = readFunctionExport<ShouldReopenAutomaticTriggerFn>(
        "shouldReopenOnAutomaticSyncTrigger",
    );

    assertEqual(
        shouldReopenOnAutomaticSyncTrigger({
            currentPhase: "blocked_server",
            trigger: "auth_restore",
        }),
        true,
        "Ordinary startup/auth sync must reopen blocked_server audits",
    );
    assertEqual(
        shouldReopenOnAutomaticSyncTrigger({
            currentPhase: "blocked_auth",
            trigger: "foreground",
        }),
        false,
        "Foreground sync must not reopen blocked_auth without a restored session",
    );
}

function testExplicitSubmitRetryDoesNotReopenBlockedValidation(): void {
    const transitionPhaseOnExplicitSubmitRetry = readFunctionExport<ExplicitSubmitRetryFn>(
        "transitionPhaseOnExplicitSubmitRetry",
    );

    const nextState = transitionPhaseOnExplicitSubmitRetry({
        currentPhase: "blocked_validation",
        updatedAt: "2026-03-28T08:30:00.000Z",
    });

    assertEqual(
        nextState.phase,
        "blocked_validation",
        "Explicit submit retry must not immediately reopen validation-blocked audits",
    );
}

function testSaveConflictRetriesOnceAgainstEditableLatestSession(): void {
    const resolveSaveConflict = readFunctionExport<SaveConflictFn>("resolveSaveConflict");

    const result = resolveSaveConflict({
        currentSession: buildEditableSession({ revision: 4 }),
        latestSession: buildEditableSession({
            revision: 5,
            selected_execution_mode: "survey",
            meta: { execution_mode: "survey" },
        }),
        dirtyMeta: { "11111111-1111-4111-8111-111111111111": 9 },
        dirtyPreAudit: {},
        dirtySections: {},
    });

    assertEqual(
        result.action,
        "retry_save",
        "Editable latest sessions should trigger one rebase-and-retry",
    );
    assertEqual(result.rebasedSession.revision, 5, "Retry must use the latest server revision");
    assertEqual(
        result.rebasedSession.meta.execution_mode,
        "audit",
        "Retry must preserve locally dirty execution-mode changes on top of the latest revision",
    );
}

function testSaveConflictTerminalizesSubmittedLatestSession(): void {
    const resolveSaveConflict = readFunctionExport<SaveConflictFn>("resolveSaveConflict");

    const result = resolveSaveConflict({
        currentSession: buildEditableSession({ revision: 8 }),
        latestSession: buildSubmittedSession({ revision: 9 }),
        dirtyMeta: { "11111111-1111-4111-8111-111111111111": 3 },
        dirtyPreAudit: {},
        dirtySections: {},
    });

    assertEqual(
        result.action,
        "terminalize_submitted",
        "Submitted latest sessions must stop the save retry loop",
    );
    assertEqual(
        result.rebasedSession.status,
        "SUBMITTED",
        "Submitted save conflicts must settle onto the submitted server session",
    );
    assertDeepEqual(result.dirtyMeta, {}, "Submitted save conflicts must clear dirty meta");
    assertDeepEqual(
        result.dirtyPreAudit,
        {},
        "Submitted save conflicts must clear dirty pre-audit state",
    );
    assertDeepEqual(
        result.dirtySections,
        {},
        "Submitted save conflicts must clear dirty section state",
    );
}

function testSaveConflictTerminalizesWhenLocalSubmittedSnapshotBeatsStaleEditableFetch(): void {
    const resolveSaveConflict = readFunctionExport<SaveConflictFn>("resolveSaveConflict");

    const result = resolveSaveConflict({
        currentSession: buildSubmittedSession({ revision: 12 }),
        latestSession: buildEditableSession({ revision: 9 }),
        dirtyMeta: { "11111111-1111-4111-8111-111111111111": 4 },
        dirtyPreAudit: { "11111111-1111-4111-8111-111111111111": 5 },
        dirtySections: {
            "11111111-1111-4111-8111-111111111111": {
                section_a: 6,
            },
        },
    });

    assertEqual(
        result.action,
        "terminalize_submitted",
        "A newer local submitted winner must not retry save against a stale editable fetch",
    );
    assertEqual(
        result.rebasedSession.status,
        "SUBMITTED",
        "Save conflict recovery must keep the winning submitted snapshot",
    );
}

function testSaveConflictRecoveryWithoutRetrySettlesOutOfSaving(): void {
    const phaseForSaveConflictRecovery = readFunctionExport<SaveConflictRecoveryPhaseFn>(
        "phaseForSaveConflictRecovery",
    );

    assertEqual(
        phaseForSaveConflictRecovery({
            action: "retry_save",
            rebasedSession: buildEditableSession({ revision: 9 }),
            dirtyMeta: {},
            dirtyPreAudit: {},
            dirtySections: {},
            recoveredWithoutRetry: true,
        }),
        "idle",
        "Save conflict recovery without another network save must settle to idle when no dirty fragments remain",
    );
    assertEqual(
        phaseForSaveConflictRecovery({
            action: "terminalize_submitted",
            rebasedSession: buildSubmittedSession({ revision: 10 }),
            dirtyMeta: {},
            dirtyPreAudit: {},
            dirtySections: {},
            recoveredWithoutRetry: true,
        }),
        "submitted",
        "Terminal save conflict recovery must settle to submitted",
    );
}

function testSubmitConflictRequiresExplicitSecondSubmitForEditableLatestSession(): void {
    const resolveSubmitConflict = readFunctionExport<SubmitConflictFn>("resolveSubmitConflict");

    const result = resolveSubmitConflict({
        currentSession: buildEditableSession({ revision: 8 }),
        latestSession: buildEditableSession({ revision: 9 }),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
    });

    assertEqual(
        result.action,
        "refresh_and_require_resubmit",
        "Editable submit conflicts must not auto-resubmit",
    );
    assertEqual(
        result.rebasedSession.revision,
        9,
        "Editable submit conflicts must expose the refreshed latest revision",
    );
}

function testSubmitConflictTerminalizesWhenLocalSubmittedSnapshotBeatsStaleEditableFetch(): void {
    const resolveSubmitConflict = readFunctionExport<SubmitConflictFn>("resolveSubmitConflict");

    const result = resolveSubmitConflict({
        currentSession: buildSubmittedSession({ revision: 12 }),
        latestSession: buildEditableSession({ revision: 9 }),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
    });

    assertEqual(
        result.action,
        "terminalize_submitted",
        "A newer local submitted winner must not surface an editable resubmit flow",
    );
    assertEqual(
        result.rebasedSession.status,
        "SUBMITTED",
        "Submit conflict recovery must keep the winning submitted snapshot",
    );
}

function testEditableSubmitConflictStaysInConflictPhase(): void {
    const phaseForSubmitConflictAction = readFunctionExport<SubmitConflictPhaseFn>(
        "phaseForSubmitConflictAction",
    );

    assertEqual(
        phaseForSubmitConflictAction("refresh_and_require_resubmit"),
        "conflict",
        "Editable submit conflicts must stay in conflict until an explicit second submit",
    );
    assertEqual(
        phaseForSubmitConflictAction("terminalize_submitted"),
        "submitted",
        "Terminal submit conflicts must converge to submitted",
    );
}

function testSuccessfulSubmitResolutionClearsDirtyState(): void {
    const finishSubmitResolution =
        readFunctionExport<FinishSubmitResolutionFn>("finishSubmitResolution");

    const resolved = finishSubmitResolution({
        latestSession: buildSubmittedSession({ revision: 11 }),
        currentDirtyMeta: { "11111111-1111-4111-8111-111111111111": 1 },
        currentDirtyPreAudit: { "11111111-1111-4111-8111-111111111111": 2 },
        currentDirtySections: {
            "11111111-1111-4111-8111-111111111111": { section_a: 3 },
        },
    });

    assertEqual(resolved.phase, "submitted", "Submit resolution must converge to submitted");
    assertDeepEqual(resolved.dirtyMeta, {}, "Submit resolution must clear dirty meta");
    assertDeepEqual(resolved.dirtyPreAudit, {}, "Submit resolution must clear dirty pre-audit");
    assertDeepEqual(resolved.dirtySections, {}, "Submit resolution must clear dirty sections");
}

function testSubmitResolutionPreservesUnrelatedAuditDirtyFragments(): void {
    const finishSubmitResolution =
        readFunctionExport<FinishSubmitResolutionFn>("finishSubmitResolution");

    const resolved = finishSubmitResolution({
        latestSession: buildSubmittedSession({ revision: 11 }),
        currentDirtyMeta: {
            "11111111-1111-4111-8111-111111111111": 1,
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": 7,
        },
        currentDirtyPreAudit: {
            "11111111-1111-4111-8111-111111111111": 2,
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": 8,
        },
        currentDirtySections: {
            "11111111-1111-4111-8111-111111111111": { section_a: 3 },
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": { section_b: 9 },
        },
    });

    assertDeepEqual(
        resolved.dirtyMeta,
        {
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": 7,
        },
        "Submit resolution must clear dirty meta only for the resolved audit",
    );
    assertDeepEqual(
        resolved.dirtyPreAudit,
        {
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": 8,
        },
        "Submit resolution must clear dirty pre-audit only for the resolved audit",
    );
    assertDeepEqual(
        resolved.dirtySections,
        {
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa": {
                section_b: 9,
            },
        },
        "Submit resolution must preserve unrelated audit dirty sections",
    );
}

function testManualRetryMovesRetryableBlockedStatesBackToDirty(): void {
    const transitionPhaseOnManualRetry = readFunctionExport<ManualRetryFn>(
        "transitionPhaseOnManualRetry",
    );

    const serverRetry = transitionPhaseOnManualRetry({
        currentPhase: "blocked_server",
        updatedAt: "2026-03-28T06:15:00.000Z",
    });
    const networkRetry = transitionPhaseOnManualRetry({
        currentPhase: "blocked_network",
        updatedAt: "2026-03-28T06:16:00.000Z",
    });

    assertEqual(serverRetry.phase, "dirty", "Manual retry must reopen server failures");
    assertEqual(networkRetry.phase, "dirty", "Manual retry must reopen network failures");
    assertEqual(serverRetry.detail, null, "Manual retry must clear stale blocked detail");
    assertEqual(networkRetry.detail, null, "Manual retry must clear stale blocked detail");
}

function testNewestBlockedAuditDrivesTheGlobalBanner(): void {
    const deriveGlobalSyncFeedback = readFunctionExport<GlobalSyncFeedbackFn>(
        "deriveGlobalSyncFeedback",
    );

    const feedback = deriveGlobalSyncFeedback({
        syncStateByAuditId: {
            a: {
                phase: "blocked_auth",
                detail: "Old auth error",
                updated_at: "2026-03-28T05:00:00.000Z",
            },
            b: {
                phase: "blocked_server",
                detail: "Newest server error",
                updated_at: "2026-03-28T06:00:00.000Z",
            },
            c: {
                phase: "submitted",
                detail: "Ignore terminal",
                updated_at: "2026-03-28T06:30:00.000Z",
            },
        },
    });

    assertEqual(
        feedback.message,
        "Newest server error",
        "The newest blocked audit must drive the sync banner",
    );
    assertEqual(feedback.auditId, "b", "The newest blocked audit id must be surfaced");
    assertEqual(feedback.phase, "blocked_server", "The newest blocked phase must be surfaced");
    assertEqual(feedback.isSyncing, false, "Blocked feedback alone must not report active syncing");
    assertEqual(
        feedback.isSavingDraft,
        false,
        "Blocked feedback alone must not report an active submit state",
    );
}

function testGlobalSyncFeedbackMarksSavingAndSubmittingAsInFlight(): void {
    const deriveGlobalSyncFeedback = readFunctionExport<GlobalSyncFeedbackFn>(
        "deriveGlobalSyncFeedback",
    );

    const feedback = deriveGlobalSyncFeedback({
        syncStateByAuditId: {
            a: {
                phase: "saving",
                detail: null,
                updated_at: "2026-03-28T05:00:00.000Z",
            },
            b: {
                phase: "submitting",
                detail: null,
                updated_at: "2026-03-28T05:01:00.000Z",
            },
        },
    });

    assertEqual(feedback.isSyncing, true, "Saving or submitting must mark global sync active");
    assertEqual(
        feedback.isSavingDraft,
        true,
        "Submitting must mark the legacy save-draft flag as active",
    );
    assertEqual(feedback.message, null, "In-flight feedback should not synthesize an error banner");
}

function testSaveAcknowledgementDoesNotOverwriteLocalProgressOrScores(): void {
    const applySaveAcknowledgement = readFunctionExport<SaveAcknowledgementFn>(
        "applySaveAcknowledgement",
    );

    const acknowledged = applySaveAcknowledgement({
        session: buildEditableSession({
            revision: 4,
            scores: {
                draft_progress_percent: 45,
                execution_mode: "audit",
                overall: null,
                by_section: {},
                by_domain: {},
            },
            progress: {
                required_pre_audit_complete: false,
                visible_section_count: 3,
                completed_section_count: 1,
                total_visible_questions: 9,
                answered_visible_questions: 4,
                ready_to_submit: false,
                sections: [],
            },
        }),
        saveResult: {
            audit_id: "11111111-1111-4111-8111-111111111111",
            status: "IN_PROGRESS",
            schema_version: 1,
            revision: 5,
            draft_progress_percent: 0,
            saved_at: "2026-03-28T06:30:00.000Z",
        },
    });

    assertEqual(acknowledged.revision, 5, "The save ack should advance revision");
    assertEqual(
        acknowledged.aggregate.revision,
        5,
        "The save ack should advance the aggregate revision",
    );
    assertEqual(
        acknowledged.scores.draft_progress_percent,
        45,
        "The save ack must not synthesize scores",
    );
    assertEqual(
        acknowledged.progress.answered_visible_questions,
        4,
        "The save ack must not synthesize progress",
    );
}

/**
 * Run the focused sync conflict and phase-machine regression checks.
 */
async function main(): Promise<void> {
    testOnlyDirtyAuditsAutoSync();
    await testSingleFlightRunnerReusesInFlightPromise();
    await testDuplicateSubmitCallersReuseOneKeyedFlight();
    testLocalDraftEditsAreBlockedDuringSubmitResolutionPhases();
    testLocalEditsClearBlockedNetworkAndAuthDetail();
    testResolvingSubmitAuditsStillRequireNormalSyncResolution();
    testTargetedSubmitResolutionSelectionIgnoresUnrelatedAudits();
    testDirtylessSubmitResolutionBlockedServerStillRetriesOnNormalTrigger();
    testDirtylessSubmitResolutionBlockedAuthRetriesOnlyOnAuthRestore();
    testBlockedServerReopensOnAuthRestoreTrigger();
    testExplicitSubmitRetryDoesNotReopenBlockedValidation();
    testSaveConflictRetriesOnceAgainstEditableLatestSession();
    testSaveConflictTerminalizesSubmittedLatestSession();
    testSaveConflictTerminalizesWhenLocalSubmittedSnapshotBeatsStaleEditableFetch();
    testSaveConflictRecoveryWithoutRetrySettlesOutOfSaving();
    testSubmitConflictRequiresExplicitSecondSubmitForEditableLatestSession();
    testSubmitConflictTerminalizesWhenLocalSubmittedSnapshotBeatsStaleEditableFetch();
    testEditableSubmitConflictStaysInConflictPhase();
    testSuccessfulSubmitResolutionClearsDirtyState();
    testSubmitResolutionPreservesUnrelatedAuditDirtyFragments();
    testManualRetryMovesRetryableBlockedStatesBackToDirty();
    testNewestBlockedAuditDrivesTheGlobalBanner();
    testGlobalSyncFeedbackMarksSavingAndSubmittingAsInFlight();
    testSaveAcknowledgementDoesNotOverwriteLocalProgressOrScores();
}

await main();
