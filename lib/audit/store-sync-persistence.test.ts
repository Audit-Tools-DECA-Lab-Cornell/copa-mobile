import { BASE_PLAYSPACE_INSTRUMENT } from "../instrument";
import { getProjectPlaceKey } from "./pair-key";
import {
    canonicalizeSessionsByAuditIdForHydrate,
    restorePersistedSyncState,
} from "./store-sync-core";
import type { AuditSession, AuditStatus, AuditSyncStateByAuditId, DirtyMeta } from "./types";

interface SessionFixtureOverrides {
    readonly auditId?: string;
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
 * Build a minimal valid session fixture for persistence restore tests.
 *
 * @param status Audit lifecycle status for the fixture.
 * @param overrides Optional fixture overrides for the canonical session shape.
 * @returns Session fixture compatible with the runtime schema.
 */
function buildSession(status: AuditStatus, overrides: SessionFixtureOverrides = {}): AuditSession {
    return {
        audit_id: overrides.auditId ?? "11111111-1111-4111-8111-111111111111",
        audit_code: "AUD-001",
        project_id: "22222222-2222-4222-8222-222222222222",
        project_name: "Project",
        place_id: "33333333-3333-4333-8333-333333333333",
        place_name: "Place",
        place_type: "playspace",
        allowed_execution_modes: ["audit", "survey", "both"],
        selected_execution_mode: "audit",
        status,
        instrument_key: BASE_PLAYSPACE_INSTRUMENT.instrument_key,
        instrument_version: BASE_PLAYSPACE_INSTRUMENT.instrument_version,
        instrument: BASE_PLAYSPACE_INSTRUMENT,
        schema_version: 1,
        revision: 3,
        aggregate: {
            schema_version: 1,
            revision: 3,
            meta: { execution_mode: "audit" },
            pre_audit: {
                place_size: null,
                current_users_0_5: null,
                current_users_6_12: null,
                current_users_13_17: null,
                current_users_18_plus: null,
                playspace_busyness: null,
                season: null,
                weather_conditions: [],
                wind_conditions: null,
            },
            sections: {
                section_a: {
                    section_key: "section_a",
                    responses: {},
                    note: null,
                },
            },
        },
        started_at: "2026-03-28T10:00:00.000Z",
        submitted_at: status === "SUBMITTED" ? "2026-03-28T11:00:00.000Z" : null,
        total_minutes: null,
        meta: { execution_mode: "audit" },
        pre_audit: {
            place_size: null,
            current_users_0_5: null,
            current_users_6_12: null,
            current_users_13_17: null,
            current_users_18_plus: null,
            playspace_busyness: null,
            season: null,
            weather_conditions: [],
            wind_conditions: null,
        },
        sections: {
            section_a: {
                section_key: "section_a",
                responses: {},
                note: null,
            },
        },
        scores: {
            draft_progress_percent: null,
            execution_mode: "audit",
            overall: null,
            by_section: {},
            by_domain: {},
        },
        progress: {
            required_pre_audit_complete: false,
            visible_section_count: 1,
            completed_section_count: 0,
            total_visible_questions: 0,
            answered_visible_questions: 0,
            ready_to_submit: false,
            sections: [],
        },
    };
}

/**
 * Build an editable session fixture.
 *
 * @param overrides Optional fixture overrides for the canonical session shape.
 * @returns In-progress session fixture.
 */
function buildEditableSession(overrides: SessionFixtureOverrides = {}): AuditSession {
    return buildSession("IN_PROGRESS", overrides);
}

/**
 * Build a submitted session fixture.
 *
 * @param overrides Optional fixture overrides for the canonical session shape.
 * @returns Submitted session fixture.
 */
function buildSubmittedSession(overrides: SessionFixtureOverrides = {}): AuditSession {
    return buildSession("SUBMITTED", overrides);
}

/**
 * Build a pair-key map from one or more session fixtures.
 *
 * @param sessions Session fixtures to index by project-place key.
 * @returns Pair-key map where later sessions replace earlier ones for the same pair.
 */
function buildSessionsByPairKey(...sessions: AuditSession[]): Record<string, AuditSession> {
    return Object.fromEntries(
        sessions.map((session) => [
            getProjectPlaceKey(session.project_id, session.place_id),
            session,
        ]),
    );
}

function testHydratePrunesSubmittedAndOrphanedDirtyState(): void {
    const submittedSession = buildSubmittedSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [submittedSession.audit_id]: submittedSession,
        },
        sessionsByPairKey: buildSessionsByPairKey(submittedSession),
        dirtyMeta: {
            [submittedSession.audit_id]: 4,
            "99999999-9999-4999-8999-999999999999": 9,
        } satisfies DirtyMeta,
        dirtyPreAudit: {
            [submittedSession.audit_id]: 5,
        },
        dirtySections: {
            "99999999-9999-4999-8999-999999999999": { section_a: 1 },
        },
        syncStateByAuditId: {
            [submittedSession.audit_id]: {
                phase: "blocked_server",
                detail: "Submitted audits must not retain persisted sync state",
                updated_at: "2026-03-28T02:00:00.000Z",
            },
            "99999999-9999-4999-8999-999999999999": {
                phase: "blocked_auth",
                detail: "Unknown audits must not retain persisted sync state",
                updated_at: "2026-03-28T02:30:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertDeepEqual(restored.dirtyMeta, {}, "Submitted and orphaned dirty_meta must be pruned");
    assertDeepEqual(restored.dirtyPreAudit, {}, "Submitted dirty pre-audit must be pruned");
    assertDeepEqual(restored.dirtySections, {}, "Orphaned dirty sections must be pruned");
    assertDeepEqual(
        restored.syncStateByAuditId,
        {},
        "Submitted and orphaned persisted sync state must be pruned during hydrate",
    );
}

function testHydrateRetainsEditableDirtyMeta(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {
            [session.audit_id]: 12,
        },
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {},
    });

    assertEqual(
        restored.dirtyMeta[session.audit_id],
        12,
        "Editable drafts must retain dirty execution-mode metadata across hydrate",
    );
}

function testHydrateConvertsSubmittingIntoResolvingSubmit(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "submitting",
                detail: null,
                updated_at: "2026-03-28T03:00:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "resolving_submit",
        "Hydrate should resume in-flight submit work through resolving_submit",
    );
}

function testHydrateConvertsSavingIntoDirty(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {
            [session.audit_id]: 13,
        },
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "saving",
                detail: "Save request was in flight before restart",
                updated_at: "2026-03-28T03:30:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "dirty",
        "Hydrate should reopen persisted saving work as dirty",
    );
}

function testHydrateDropsSavingWithoutSurvivingDirtyFragments(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "saving",
                detail: "No dirty work remains after hydrate",
                updated_at: "2026-03-28T03:45:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id],
        undefined,
        "Hydrate must drop saving when no dirty fragments survive",
    );
}

function testHydrateConvertsBlockedNetworkIntoDirty(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {
            [session.audit_id]: 14,
        },
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "blocked_network",
                detail: "Offline during last sync attempt",
                updated_at: "2026-03-28T04:00:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "dirty",
        "Hydrate should reopen blocked network state as dirty for editable drafts",
    );
}

function testHydrateConvertsBlockedAuthIntoDirty(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {
            [session.audit_id]: 15,
        },
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "blocked_auth",
                detail: "Session expired during last sync attempt",
                updated_at: "2026-03-28T04:30:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "dirty",
        "Hydrate should reopen blocked auth state as dirty for editable drafts",
    );
}

function testHydrateDropsPersistedSubmittedPhaseForEditableDrafts(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "submitted",
                detail: null,
                updated_at: "2026-03-28T05:00:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id],
        undefined,
        "Hydrate must not preserve a terminal submitted sync phase for editable drafts",
    );
}

function testHydrateDropsDirtyWithoutSurvivingDirtyFragments(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "dirty",
                detail: null,
                updated_at: "2026-03-28T05:05:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id],
        undefined,
        "Hydrate must drop dirty when no dirty fragments survive",
    );
}

function testHydratePreservesConflictForEditableDirtyDrafts(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {
            [session.audit_id]: 16,
        },
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "conflict",
                detail: "Draft needs rebase",
                updated_at: "2026-03-28T05:15:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "conflict",
        "Hydrate should preserve conflict for editable drafts with surviving dirty fragments",
    );
}

function testHydrateDropsConflictWithoutSurvivingDirtyFragments(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "conflict",
                detail: "No dirty work remains after hydrate",
                updated_at: "2026-03-28T05:20:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id],
        undefined,
        "Hydrate must drop conflict when no dirty fragments survive",
    );
}

function testHydratePreservesBlockedValidationForEditableDirtyDrafts(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {
            [session.audit_id]: 17,
        },
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "blocked_validation",
                detail: "Backend rejected the draft payload",
                updated_at: "2026-03-28T05:30:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "blocked_validation",
        "Hydrate should preserve blocked_validation for editable drafts with surviving dirty fragments",
    );
}

function testHydrateDropsBlockedValidationWithoutSurvivingDirtyFragments(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "blocked_validation",
                detail: "No dirty work remains after hydrate",
                updated_at: "2026-03-28T05:35:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id],
        undefined,
        "Hydrate must drop blocked_validation when no dirty fragments survive",
    );
}

function testHydratePreservesBlockedServerForEditableDirtyDrafts(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {
            [session.audit_id]: {
                section_a: 18,
            },
        },
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "blocked_server",
                detail: "Server returned a retryable error",
                updated_at: "2026-03-28T05:45:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "blocked_server",
        "Hydrate should preserve blocked_server for editable drafts with surviving dirty fragments",
    );
}

function testHydratePreservesDirtylessBlockedServerForSubmitRecovery(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "blocked_server",
                detail: "No dirty work remains after hydrate",
                updated_at: "2026-03-28T05:50:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "blocked_server",
        "Hydrate must preserve dirtyless blocked_server so submit recovery can resume later",
    );
}

function testHydratePreservesDirtylessBlockedNetworkForSubmitRecovery(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "blocked_network",
                detail: "No dirty work remains after hydrate",
                updated_at: "2026-03-28T06:00:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "blocked_network",
        "Hydrate must preserve dirtyless blocked_network so submit recovery can resume later",
    );
}

function testHydratePreservesDirtylessBlockedAuthForSubmitRecovery(): void {
    const session = buildEditableSession();
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [session.audit_id]: session,
        },
        sessionsByPairKey: buildSessionsByPairKey(session),
        dirtyMeta: {},
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [session.audit_id]: {
                phase: "blocked_auth",
                detail: "No dirty work remains after hydrate",
                updated_at: "2026-03-28T06:15:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.syncStateByAuditId[session.audit_id]?.phase,
        "blocked_auth",
        "Hydrate must preserve dirtyless blocked_auth so submit recovery can resume later",
    );
}

function testHydratePrunesStateForPairMapReplacement(): void {
    const replacedSession = buildEditableSession({
        auditId: "11111111-1111-4111-8111-111111111111",
    });
    const canonicalSession = buildEditableSession({
        auditId: "44444444-4444-4444-8444-444444444444",
    });
    const restored = restorePersistedSyncState({
        sessionsByAuditId: {
            [replacedSession.audit_id]: replacedSession,
            [canonicalSession.audit_id]: canonicalSession,
        },
        sessionsByPairKey: buildSessionsByPairKey(replacedSession, canonicalSession),
        dirtyMeta: {
            [replacedSession.audit_id]: 19,
            [canonicalSession.audit_id]: 20,
        },
        dirtyPreAudit: {},
        dirtySections: {},
        syncStateByAuditId: {
            [replacedSession.audit_id]: {
                phase: "blocked_server",
                detail: "Replaced audit should be pruned",
                updated_at: "2026-03-28T06:30:00.000Z",
            },
            [canonicalSession.audit_id]: {
                phase: "conflict",
                detail: "Canonical audit should survive",
                updated_at: "2026-03-28T06:45:00.000Z",
            },
        } satisfies AuditSyncStateByAuditId,
    });

    assertEqual(
        restored.dirtyMeta[replacedSession.audit_id],
        undefined,
        "Hydrate must prune dirty fragments for audits replaced in the pair map",
    );
    assertEqual(
        restored.syncStateByAuditId[replacedSession.audit_id],
        undefined,
        "Hydrate must prune sync state for audits replaced in the pair map",
    );
    assertEqual(
        restored.dirtyMeta[canonicalSession.audit_id],
        20,
        "Hydrate must keep dirty fragments for the canonical pair-mapped audit",
    );
    assertEqual(
        restored.syncStateByAuditId[canonicalSession.audit_id]?.phase,
        "conflict",
        "Hydrate must keep sync state for the canonical pair-mapped audit",
    );
}

function testHydrateCanonicalizesDisplacedSessionsByAuditId(): void {
    const displacedSession = buildEditableSession({
        auditId: "11111111-1111-4111-8111-111111111111",
    });
    const canonicalSession = buildEditableSession({
        auditId: "44444444-4444-4444-8444-444444444444",
    });
    const canonicalizedSessionsByAuditId = canonicalizeSessionsByAuditIdForHydrate({
        sessionsByAuditId: {
            [displacedSession.audit_id]: displacedSession,
            [canonicalSession.audit_id]: canonicalSession,
        },
        sessionsByPairKey: buildSessionsByPairKey(displacedSession, canonicalSession),
    });

    assertEqual(
        canonicalizedSessionsByAuditId[displacedSession.audit_id],
        undefined,
        "Hydrate must evict displaced sessions from the audit-id map",
    );
    assertEqual(
        canonicalizedSessionsByAuditId[canonicalSession.audit_id]?.audit_id,
        canonicalSession.audit_id,
        "Hydrate must keep the canonical pair-mapped session in the audit-id map",
    );
}

/**
 * Run the focused persistence restore regression checks.
 */
function main(): void {
    testHydratePrunesSubmittedAndOrphanedDirtyState();
    testHydrateRetainsEditableDirtyMeta();
    testHydrateConvertsSubmittingIntoResolvingSubmit();
    testHydrateConvertsSavingIntoDirty();
    testHydrateDropsSavingWithoutSurvivingDirtyFragments();
    testHydrateConvertsBlockedNetworkIntoDirty();
    testHydrateConvertsBlockedAuthIntoDirty();
    testHydrateDropsPersistedSubmittedPhaseForEditableDrafts();
    testHydrateDropsDirtyWithoutSurvivingDirtyFragments();
    testHydratePreservesConflictForEditableDirtyDrafts();
    testHydrateDropsConflictWithoutSurvivingDirtyFragments();
    testHydratePreservesBlockedValidationForEditableDirtyDrafts();
    testHydrateDropsBlockedValidationWithoutSurvivingDirtyFragments();
    testHydratePreservesBlockedServerForEditableDirtyDrafts();
    testHydratePreservesDirtylessBlockedServerForSubmitRecovery();
    testHydratePreservesDirtylessBlockedNetworkForSubmitRecovery();
    testHydratePreservesDirtylessBlockedAuthForSubmitRecovery();
    testHydratePrunesStateForPairMapReplacement();
    testHydrateCanonicalizesDisplacedSessionsByAuditId();
}

main();
