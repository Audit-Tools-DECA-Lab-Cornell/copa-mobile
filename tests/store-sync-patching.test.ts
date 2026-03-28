import { BASE_PLAYSPACE_INSTRUMENT } from "lib/instrument";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    applyFetchedSessionSnapshot,
    buildDraftPatchSnapshot,
    getOwnedAuditSessionForResponse,
    pruneCanonicalSubmittedAuditState,
    pruneAuditStateForAudit,
    prepareConflictRecoverySnapshot,
    upsertAuditSessionMaps,
} from "lib/audit/store-sync-core";
import type {
    AuditMeta,
    AuditPreAuditValues,
    AuditSectionState,
    AuditSession,
    AuditSyncStateByAuditId,
    AuditStatus,
    ExecutionMode,
    QuestionResponsePayload,
} from "lib/audit/types";

interface SessionFixtureOverrides {
    readonly auditId?: string;
    readonly revision?: number;
    readonly selected_execution_mode?: ExecutionMode | null;
    readonly meta?: AuditMeta;
    readonly pre_audit?: AuditPreAuditValues;
    readonly sections?: Record<string, AuditSectionState>;
}

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
 * Require a non-nullish value before continuing the test.
 *
 * @param value Runtime value under test.
 * @param message Failure message prefix.
 * @returns The non-nullish value.
 */
function assertDefined<TValue>(value: TValue | null | undefined, message: string): TValue {
    if (value === null || value === undefined) {
        throw new Error(`${message}: expected a defined value.`);
    }

    return value;
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
        section_b: {
            section_key: "section_b",
            note: null,
            responses: {
                question_b: {
                    quantity: "original",
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
 * Build a focused audit session fixture for sparse patch and session apply tests.
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
        scores: {
            draft_progress_percent: null,
            execution_mode: selectedExecutionMode,
            overall: null,
            by_section: {},
            by_domain: {},
        },
        progress: {
            required_pre_audit_complete: false,
            visible_section_count: Object.keys(sections).length,
            completed_section_count: 0,
            total_visible_questions: 2,
            answered_visible_questions: 0,
            ready_to_submit: false,
            sections: [],
        },
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

/**
 * Build the pair key used by the session upsert helper.
 *
 * @param session Session fixture to map.
 * @returns Stable project-place key.
 */
function buildPairKey(session: AuditSession): string {
    return getProjectPlaceKey(session.project_id, session.place_id);
}

function testPatchSnapshotUsesSparseDraftPayloads(): void {
    const session = buildEditableSession({
        revision: 12,
        selected_execution_mode: "survey",
        meta: { execution_mode: "survey" },
        pre_audit: {
            place_size: "large",
            current_users_0_5: "none",
            current_users_6_12: "a_few",
            current_users_13_17: "a_lot",
            current_users_18_plus: "a_few",
            playspace_busyness: "very_busy",
            season: "summer",
            weather_conditions: ["cloudy_overcast"],
            wind_conditions: "light_wind",
        },
        sections: {
            section_a: {
                section_key: "section_a",
                note: "Updated note",
                responses: {
                    question_a: {
                        quantity: "some",
                    },
                },
            },
            section_b: {
                section_key: "section_b",
                note: "Unchanged note",
                responses: {
                    question_b: {
                        quantity: "original",
                    },
                },
            },
        },
    });

    const snapshot = assertDefined(
        buildDraftPatchSnapshot({
            auditId: session.audit_id,
            session,
            dirtyMeta: { [session.audit_id]: 13 },
            dirtyPreAudit: { [session.audit_id]: 14 },
            dirtySections: { [session.audit_id]: { section_a: 15 } },
        }),
        "Dirty audit fragments should build a patch snapshot",
    );

    assertEqual(
        snapshot.patch.aggregate,
        undefined,
        "Sparse mobile saves must omit aggregate replacement",
    );
    assertEqual(
        snapshot.patch.expected_revision,
        12,
        "Sparse mobile saves must carry expected_revision",
    );
    assertDeepEqual(
        snapshot.patch.meta,
        { execution_mode: "survey" },
        "Dirty mode writes must send meta only",
    );
    assertDeepEqual(
        snapshot.patch.pre_audit,
        session.pre_audit,
        "Dirty pre-audit writes must send the whole block",
    );
    assertDeepEqual(
        snapshot.patch.sections["section_a"],
        session.sections["section_a"],
        "Dirty section writes must send the whole section",
    );
    assertEqual(
        Object.hasOwn(snapshot.patch.sections, "section_b"),
        false,
        "Sparse mobile saves must omit unchanged sections",
    );
}

function testPatchSnapshotReturnsNullWithoutDirtyFragments(): void {
    const session = buildEditableSession();

    assertEqual(
        buildDraftPatchSnapshot({
            auditId: session.audit_id,
            session,
            dirtyMeta: {},
            dirtyPreAudit: {},
            dirtySections: {},
        }),
        null,
        "Draft patch construction must skip empty dirty snapshots",
    );
}

function testSubmittedSnapshotWinsOverOlderEditableFetch(): void {
    const currentSession = buildSubmittedSession({ revision: 10 });
    const result = applyFetchedSessionSnapshot({
        currentSession,
        fetchedSession: buildEditableSession({ revision: 9 }),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
    });

    assertEqual(
        result.session.status,
        "SUBMITTED",
        "Submitted snapshots must win over stale editable fetches",
    );
    assertEqual(
        result.session.revision,
        10,
        "Submitted snapshots must preserve the current submitted revision",
    );
    const prunedState = pruneCanonicalSubmittedAuditState({
        session: result.session,
        dirtyMeta: { [currentSession.audit_id]: 28 },
        dirtyPreAudit: { [currentSession.audit_id]: 29 },
        dirtySections: { [currentSession.audit_id]: { section_a: 30 } },
        syncStateByAuditId: {
            [currentSession.audit_id]: {
                phase: "blocked_auth",
                detail: "Submitted winners must clear stale sync state",
                updated_at: "2026-03-28T07:10:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertDeepEqual(prunedState.dirtyMeta, {}, "Submitted winners must clear dirty meta");
    assertDeepEqual(prunedState.dirtyPreAudit, {}, "Submitted winners must clear dirty pre-audit");
    assertDeepEqual(prunedState.dirtySections, {}, "Submitted winners must clear dirty sections");
    assertDeepEqual(
        prunedState.syncStateByAuditId,
        {},
        "Submitted winners must clear stale sync state",
    );
}

function testCurrentEditableSnapshotWinsOverOlderEditableFetch(): void {
    const currentSession = buildEditableSession({
        revision: 10,
        meta: { execution_mode: "survey" },
        selected_execution_mode: "survey",
        sections: {
            section_a: {
                section_key: "section_a",
                note: "Newer local note",
                responses: {
                    question_a: {
                        quantity: "newer-local-value",
                    },
                },
            },
            section_b: {
                section_key: "section_b",
                note: "Local note",
                responses: {
                    question_b: {
                        quantity: "local-value",
                    },
                },
            },
        },
    });
    const fetchedSession = buildEditableSession({
        revision: 9,
        meta: { execution_mode: "audit" },
        selected_execution_mode: "audit",
        sections: {
            section_a: {
                section_key: "section_a",
                note: "Older server note",
                responses: {
                    question_a: {
                        quantity: "older-server-value",
                    },
                },
            },
            section_b: {
                section_key: "section_b",
                note: "Older server note",
                responses: {
                    question_b: {
                        quantity: "older-server-value",
                    },
                },
            },
        },
    });

    const result = applyFetchedSessionSnapshot({
        currentSession,
        fetchedSession,
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
    });

    assertEqual(
        result.session.revision,
        10,
        "Newer editable local sessions must ignore older editable fetches",
    );
    assertDeepEqual(
        result.session.meta,
        currentSession.meta,
        "Newer editable local sessions must keep the local canonical meta",
    );
    assertDeepEqual(
        result.session.sections,
        currentSession.sections,
        "Newer editable local sessions must keep the local canonical sections",
    );
}

function testEditableFetchedSnapshotReceivesCurrentDirtyFragments(): void {
    const currentSession = buildEditableSession({
        revision: 8,
        selected_execution_mode: "survey",
        meta: { execution_mode: "survey" },
        pre_audit: {
            place_size: "large",
            current_users_0_5: "none",
            current_users_6_12: "a_few",
            current_users_13_17: "a_lot",
            current_users_18_plus: "a_few",
            playspace_busyness: "very_busy",
            season: "summer",
            weather_conditions: ["cloudy_overcast"],
            wind_conditions: "light_wind",
        },
        sections: {
            section_a: {
                section_key: "section_a",
                note: "Local dirty note",
                responses: {
                    question_a: {
                        quantity: "locally-edited",
                    },
                },
            },
            section_b: {
                section_key: "section_b",
                note: "Local untouched note",
                responses: {
                    question_b: {
                        quantity: "server-shared",
                    },
                },
            },
        },
    });
    const fetchedSession = buildEditableSession({
        revision: 9,
        selected_execution_mode: "audit",
        meta: { execution_mode: "audit" },
        pre_audit: buildDefaultPreAudit(),
        sections: {
            section_a: {
                section_key: "section_a",
                note: "Server note",
                responses: {
                    question_a: {
                        quantity: "server-value",
                    },
                },
            },
            section_b: {
                section_key: "section_b",
                note: "Server kept note",
                responses: {
                    question_b: {
                        quantity: "server-side-latest",
                    },
                },
            },
        },
    });

    const result = applyFetchedSessionSnapshot({
        currentSession,
        fetchedSession,
        dirtyMeta: { [currentSession.audit_id]: 21 },
        dirtyPreAudit: { [currentSession.audit_id]: 22 },
        dirtySections: { [currentSession.audit_id]: { section_a: 23 } },
    });

    assertEqual(
        result.session.revision,
        9,
        "Fetched editable sessions must keep the latest fetched revision",
    );
    assertDeepEqual(
        result.session.meta,
        currentSession.meta,
        "Dirty meta fragments must be merged onto fetched editable sessions",
    );
    assertDeepEqual(
        result.session.pre_audit,
        currentSession.pre_audit,
        "Dirty pre-audit fragments must be merged onto fetched editable sessions",
    );
    assertDeepEqual(
        result.session.sections["section_a"],
        currentSession.sections["section_a"],
        "Dirty sections must be merged onto fetched editable sessions",
    );
    assertDeepEqual(
        result.session.sections["section_b"],
        fetchedSession.sections["section_b"],
        "Clean sections must continue using the fetched editable snapshot",
    );
}

function testConflictRecoveryCanResolveWithoutRetryAfterCanonicalFetch(): void {
    const currentSession = buildEditableSession({
        revision: 8,
        meta: { execution_mode: "survey" },
        selected_execution_mode: "survey",
        pre_audit: {
            place_size: "large",
            current_users_0_5: "none",
            current_users_6_12: "a_few",
            current_users_13_17: "a_lot",
            current_users_18_plus: "a_few",
            playspace_busyness: "very_busy",
            season: "summer",
            weather_conditions: ["cloudy_overcast"],
            wind_conditions: "light_wind",
        },
        sections: {
            section_a: {
                section_key: "section_a",
                note: "Locally dirty note",
                responses: {
                    question_a: {
                        quantity: "locally-edited",
                    },
                },
            },
            section_b: {
                section_key: "section_b",
                note: "Local untouched note",
                responses: {
                    question_b: {
                        quantity: "still-local",
                    },
                },
            },
        },
    });
    const fetchedSession = buildSubmittedSession({
        revision: 9,
        meta: { execution_mode: "audit" },
        selected_execution_mode: "audit",
        sections: {
            section_a: {
                section_key: "section_a",
                note: "Canonical submitted note",
                responses: {
                    question_a: {
                        quantity: "canonical-value",
                    },
                },
            },
            section_b: {
                section_key: "section_b",
                note: "Canonical submitted note",
                responses: {
                    question_b: {
                        quantity: "canonical-value",
                    },
                },
            },
        },
    });

    const result = prepareConflictRecoverySnapshot({
        auditId: currentSession.audit_id,
        currentSession,
        fetchedSession,
        dirtyMeta: { [currentSession.audit_id]: 24 },
        dirtyPreAudit: { [currentSession.audit_id]: 25 },
        dirtySections: { [currentSession.audit_id]: { section_a: 26 } },
    });

    assertEqual(
        result.session.status,
        "SUBMITTED",
        "Canonical submitted fetches must win during conflict recovery",
    );
    assertEqual(
        result.retrySnapshot,
        null,
        "Canonical reconciliation must not require a follow-up retry save",
    );
    assertEqual(
        result.recoveredWithoutRetry,
        true,
        "Canonical reconciliation must report success without another retry save",
    );
    assertDeepEqual(result.dirtyMeta, {}, "Canonical reconciliation must clear dirty meta");
    assertDeepEqual(
        result.dirtyPreAudit,
        {},
        "Canonical reconciliation must clear dirty pre-audit state",
    );
    assertDeepEqual(
        result.dirtySections,
        {},
        "Canonical reconciliation must clear dirty section state",
    );
    const prunedState = pruneCanonicalSubmittedAuditState({
        session: result.session,
        dirtyMeta: result.dirtyMeta,
        dirtyPreAudit: result.dirtyPreAudit,
        dirtySections: result.dirtySections,
        syncStateByAuditId: {
            [currentSession.audit_id]: {
                phase: "resolving_submit",
                detail: null,
                updated_at: "2026-03-28T06:10:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });
    assertDeepEqual(
        prunedState.syncStateByAuditId,
        {},
        "Canonical reconciliation must clear stale submit-resolution sync state",
    );
}

function testConflictRecoveryDoesNotRetryWhenLocalSubmittedSnapshotWins(): void {
    const currentSession = buildSubmittedSession({ revision: 12 });
    const fetchedSession = buildEditableSession({ revision: 11 });
    const result = prepareConflictRecoverySnapshot({
        auditId: currentSession.audit_id,
        currentSession,
        fetchedSession,
        dirtyMeta: { [currentSession.audit_id]: 31 },
        dirtyPreAudit: { [currentSession.audit_id]: 32 },
        dirtySections: { [currentSession.audit_id]: { section_a: 33 } },
    });

    assertEqual(
        result.session.status,
        "SUBMITTED",
        "Local submitted snapshots must remain the winner during conflict recovery",
    );
    assertEqual(
        result.retrySnapshot,
        null,
        "Winning submitted snapshots must not produce a retry save",
    );
    assertEqual(
        result.recoveredWithoutRetry,
        true,
        "Winning submitted snapshots must resolve conflict recovery without retry",
    );
    assertDeepEqual(result.dirtyMeta, {}, "Winning submitted snapshots must clear dirty meta");
    assertDeepEqual(
        result.dirtyPreAudit,
        {},
        "Winning submitted snapshots must clear dirty pre-audit state",
    );
    assertDeepEqual(
        result.dirtySections,
        {},
        "Winning submitted snapshots must clear dirty section state",
    );
}

function testSessionUpsertKeepsAuditAndPairMapsAligned(): void {
    const session = buildEditableSession();
    const result = upsertAuditSessionMaps({
        sessionsByAuditId: {},
        sessionsByPairKey: {},
        nextSession: session,
    });

    assertEqual(
        result.sessionsByAuditId[session.audit_id]?.audit_id,
        session.audit_id,
        "Audit map must be updated",
    );
    assertEqual(
        result.sessionsByPairKey[buildPairKey(session)]?.audit_id,
        session.audit_id,
        "Pair map must be updated",
    );
}

function testSessionUpsertPrunesDisplacedAuditState(): void {
    const displacedSession = buildEditableSession({
        auditId: "11111111-1111-4111-8111-111111111111",
    });
    const nextSession = buildEditableSession({
        auditId: "44444444-4444-4444-8444-444444444444",
    });
    const result = upsertAuditSessionMaps({
        sessionsByAuditId: {
            [displacedSession.audit_id]: displacedSession,
        },
        sessionsByPairKey: {
            [buildPairKey(displacedSession)]: displacedSession,
        },
        nextSession,
    });
    const prunedState = pruneAuditStateForAudit({
        auditId: result.displacedAuditId,
        dirtyMeta: {
            [displacedSession.audit_id]: 20,
            [nextSession.audit_id]: 21,
        },
        dirtyPreAudit: {
            [displacedSession.audit_id]: 22,
        },
        dirtySections: {
            [displacedSession.audit_id]: {
                section_a: 23,
            },
            [nextSession.audit_id]: {
                section_b: 24,
            },
        },
        syncStateByAuditId: {
            [displacedSession.audit_id]: {
                phase: "conflict",
                detail: "Stale displaced audit",
                updated_at: "2026-03-28T07:00:00.000Z",
            },
            [nextSession.audit_id]: {
                phase: "dirty",
                detail: null,
                updated_at: "2026-03-28T07:05:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        result.displacedAuditId,
        displacedSession.audit_id,
        "Pair-key replacement must report the displaced audit id",
    );
    assertEqual(
        result.sessionsByAuditId[displacedSession.audit_id],
        undefined,
        "Pair-key replacement must evict the displaced audit from the audit-id map",
    );
    assertEqual(
        result.sessionsByAuditId[nextSession.audit_id]?.audit_id,
        nextSession.audit_id,
        "Pair-key replacement must keep the canonical replacement session in the audit-id map",
    );
    assertEqual(
        result.sessionsByPairKey[buildPairKey(nextSession)]?.audit_id,
        nextSession.audit_id,
        "Pair-key replacement must point the pair map at the canonical replacement session",
    );
    assertEqual(
        prunedState.dirtyMeta[displacedSession.audit_id],
        undefined,
        "Displaced audits must be pruned from dirty meta",
    );
    assertEqual(
        prunedState.dirtyPreAudit[displacedSession.audit_id],
        undefined,
        "Displaced audits must be pruned from dirty pre-audit",
    );
    assertEqual(
        prunedState.dirtySections[displacedSession.audit_id],
        undefined,
        "Displaced audits must be pruned from dirty sections",
    );
    assertEqual(
        prunedState.syncStateByAuditId[displacedSession.audit_id],
        undefined,
        "Displaced audits must be pruned from persisted sync state",
    );
    assertEqual(
        prunedState.dirtyMeta[nextSession.audit_id],
        21,
        "Displaced audit pruning must preserve the replacement audit dirty meta",
    );
    assertEqual(
        prunedState.syncStateByAuditId[nextSession.audit_id]?.phase,
        "dirty",
        "Displaced audit pruning must preserve the replacement audit sync state",
    );
}

function testStaleResponsesAreIgnoredAfterPairOwnershipChanges(): void {
    const displacedSession = buildEditableSession({
        auditId: "11111111-1111-4111-8111-111111111111",
    });
    const replacementSession = buildEditableSession({
        auditId: "44444444-4444-4444-8444-444444444444",
    });
    const result = upsertAuditSessionMaps({
        sessionsByAuditId: {
            [displacedSession.audit_id]: displacedSession,
        },
        sessionsByPairKey: {
            [buildPairKey(displacedSession)]: displacedSession,
        },
        nextSession: replacementSession,
    });

    assertEqual(
        getOwnedAuditSessionForResponse({
            auditId: displacedSession.audit_id,
            sessionsByAuditId: result.sessionsByAuditId,
            sessionsByPairKey: result.sessionsByPairKey,
        }),
        null,
        "A displaced audit must no longer accept in-flight response application",
    );
    assertEqual(
        getOwnedAuditSessionForResponse({
            auditId: replacementSession.audit_id,
            sessionsByAuditId: result.sessionsByAuditId,
            sessionsByPairKey: result.sessionsByPairKey,
        })?.audit_id,
        replacementSession.audit_id,
        "The replacement audit must continue to accept in-flight response application",
    );
}

function testCanonicalSubmittedPruneClearsSyncState(): void {
    const submittedSession = buildSubmittedSession();
    const prunedState = pruneCanonicalSubmittedAuditState({
        session: submittedSession,
        dirtyMeta: {
            [submittedSession.audit_id]: 25,
        },
        dirtyPreAudit: {
            [submittedSession.audit_id]: 26,
        },
        dirtySections: {
            [submittedSession.audit_id]: {
                section_a: 27,
            },
        },
        syncStateByAuditId: {
            [submittedSession.audit_id]: {
                phase: "blocked_server",
                detail: "Submitted sessions must not keep stale sync state",
                updated_at: "2026-03-28T07:15:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertDeepEqual(prunedState.dirtyMeta, {}, "Canonical submitted prune must clear dirty meta");
    assertDeepEqual(
        prunedState.dirtyPreAudit,
        {},
        "Canonical submitted prune must clear dirty pre-audit state",
    );
    assertDeepEqual(
        prunedState.dirtySections,
        {},
        "Canonical submitted prune must clear dirty section state",
    );
    assertDeepEqual(
        prunedState.syncStateByAuditId,
        {},
        "Canonical submitted prune must clear stale sync state",
    );
}

/**
 * Run the focused sparse patching regression checks.
 */
function main(): void {
    testPatchSnapshotUsesSparseDraftPayloads();
    testPatchSnapshotReturnsNullWithoutDirtyFragments();
    testSubmittedSnapshotWinsOverOlderEditableFetch();
    testCurrentEditableSnapshotWinsOverOlderEditableFetch();
    testEditableFetchedSnapshotReceivesCurrentDirtyFragments();
    testConflictRecoveryCanResolveWithoutRetryAfterCanonicalFetch();
    testConflictRecoveryDoesNotRetryWhenLocalSubmittedSnapshotWins();
    testSessionUpsertKeepsAuditAndPairMapsAligned();
    testSessionUpsertPrunesDisplacedAuditState();
    testStaleResponsesAreIgnoredAfterPairOwnershipChanges();
    testCanonicalSubmittedPruneClearsSyncState();
}

main();
