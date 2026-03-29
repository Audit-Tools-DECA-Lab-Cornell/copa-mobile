import { BASE_PLAYSPACE_INSTRUMENT } from "lib/instrument";
import type {
    AuditPreAuditValues,
    AuditSectionState,
    AuditSession,
    AuditStatus,
    DirtyMeta,
    DirtyPreAudit,
    DirtySections,
    QuestionResponsePayload,
} from "lib/audit/types";
import {
    applyLocalPreAuditChange,
    applyLocalQuestionAnswerChange,
    applyLocalSectionNoteChange,
    buildSyncableAuditIds,
    clearAcknowledgedDirtyState,
    isAuditSessionEditable,
} from "lib/audit/store-sync-core";

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
 * Assert that a callback throws an error containing the expected message.
 *
 * @param callback Synchronous callback under test.
 * @param expectedMessage Required substring within the thrown error message.
 * @param message Failure message prefix.
 */
function assertThrows(callback: () => void, expectedMessage: string, message: string): void {
    try {
        callback();
    } catch (error) {
        if (!(error instanceof Error)) {
            throw new Error(`${message}: expected an Error instance to be thrown.`);
        }

        if (!error.message.includes(expectedMessage)) {
            throw new Error(
                `${message}: expected error containing ${JSON.stringify(expectedMessage)}, received ${JSON.stringify(error.message)}.`,
            );
        }
        return;
    }

    throw new Error(
        `${message}: expected error containing ${JSON.stringify(expectedMessage)}, but no error was thrown.`,
    );
}

/**
 * Build a focused audit session fixture for sync-core invariants.
 *
 * @param status Audit lifecycle status for the fixture.
 * @returns Minimal valid session data for pure helper tests.
 */
function buildSession(status: AuditStatus): AuditSession {
    return {
        audit_id: "11111111-1111-4111-8111-111111111111",
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
                    responses: {
                        question_a: {
                            quantity: "some",
                        },
                    },
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
                responses: {
                    question_a: {
                        quantity: "some",
                    },
                },
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
            total_visible_questions: 1,
            answered_visible_questions: 1,
            ready_to_submit: false,
            sections: [
                {
                    section_key: "section_a",
                    title: "Section A",
                    visible_question_count: 1,
                    answered_question_count: 1,
                    is_complete: true,
                },
            ],
        },
    };
}

/**
 * Build an editable session fixture.
 *
 * @returns In-progress session fixture.
 */
function buildEditableSession(): AuditSession {
    return buildSession("IN_PROGRESS");
}

/**
 * Build a paused session fixture.
 *
 * @returns Paused session fixture.
 */
function buildPausedSession(): AuditSession {
    return buildSession("PAUSED");
}

/**
 * Build a submitted session fixture.
 *
 * @returns Submitted session fixture.
 */
function buildSubmittedSession(): AuditSession {
    return buildSession("SUBMITTED");
}

/**
 * Build the section fixture used by the focused question-answer tests.
 *
 * @param answers Question answer payload for `question_a`.
 * @returns Explicit section state without optional record lookups.
 */
function buildSectionAState(answers: QuestionResponsePayload): AuditSectionState {
    return {
        section_key: "section_a",
        responses: {
            question_a: cloneQuestionResponsePayloadForTest(answers),
        },
        note: null,
    };
}

/**
 * Clone a question response payload for isolated test fixtures.
 *
 * @param answers Payload to clone.
 * @returns A cloned payload with copied arrays and records.
 */
function cloneQuestionResponsePayloadForTest(
    answers: QuestionResponsePayload,
): QuestionResponsePayload {
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
 * Build a checklist-shaped payload for regression coverage.
 *
 * @param selectedOptionKeys Selected checklist options in order.
 * @param otherText Free-text details for the "other" path.
 * @returns Checklist response payload.
 */
function buildChecklistPayload(
    selectedOptionKeys: string[],
    otherText: string,
): QuestionResponsePayload {
    return {
        selected_option_keys: [...selectedOptionKeys],
        other_details: {
            text: otherText,
        },
    };
}

/**
 * Build a session fixture whose `section_a.question_a` uses the provided payload.
 *
 * @param status Audit lifecycle status for the fixture.
 * @param answers Payload stored under `section_a.question_a`.
 * @returns Session fixture with explicit section and aggregate payloads.
 */
function buildSessionWithQuestionPayload(
    status: AuditStatus,
    answers: QuestionResponsePayload,
): AuditSession {
    const session = buildSession(status);
    return {
        ...session,
        sections: {
            ...session.sections,
            section_a: buildSectionAState(answers),
        },
        aggregate: {
            ...session.aggregate,
            sections: {
                ...session.aggregate.sections,
                section_a: buildSectionAState(answers),
            },
        },
    };
}

/**
 * Read the `section_a.question_a` payload from a session fixture.
 *
 * @param session Session under test.
 * @returns The stored payload for `section_a.question_a`.
 */
function readSectionAQuestionPayload(session: AuditSession): QuestionResponsePayload {
    const section = session.sections["section_a"];
    if (section === undefined) {
        throw new Error("Expected section_a to exist in the test fixture.");
    }

    const payload = section.responses["question_a"];
    if (payload === undefined) {
        throw new Error("Expected question_a to exist in the section_a test fixture.");
    }

    return payload;
}

function testUnchangedSectionNotesDoNotCreateDirtyState(): void {
    const session: AuditSession = {
        ...buildEditableSession(),
        sections: {
            section_a: {
                section_key: "section_a",
                responses: {
                    question_a: {
                        quantity: "some",
                    },
                },
                note: "Existing note",
            },
        },
        aggregate: {
            ...buildEditableSession().aggregate,
            sections: {
                section_a: {
                    section_key: "section_a",
                    responses: {
                        question_a: {
                            quantity: "some",
                        },
                    },
                    note: "Existing note",
                },
            },
        },
    };
    const result = applyLocalSectionNoteChange({
        session,
        sectionKey: "section_a",
        note: "Existing note",
        nextVersion: 18,
        dirtySections: {},
    });

    assertEqual(result.didChange, false, "Unchanged section notes must not create dirty state");
    assertDeepEqual(
        result.dirtySections,
        {},
        "Unchanged section notes must leave dirty sections untouched",
    );
}

function testChangedSectionNotesCreateDirtyState(): void {
    const session = buildEditableSession();
    const result = applyLocalSectionNoteChange({
        session,
        sectionKey: "section_a",
        note: "Updated note",
        nextVersion: 19,
        dirtySections: {},
    });

    assertEqual(result.didChange, true, "Changed section notes must dirty the session");
    assertEqual(
        result.session.sections["section_a"]?.note,
        "Updated note",
        "Changed section notes must update the returned section state",
    );
    assertEqual(
        result.session.aggregate.sections["section_a"]?.note,
        "Updated note",
        "Changed section notes must update the returned aggregate section state",
    );
    assertDeepEqual(
        result.dirtySections,
        {
            [session.audit_id]: {
                section_a: 19,
            },
        },
        "Changed section notes must mark the section dirty",
    );
}

function testSubmittedSessionsRejectLocalSectionNoteWrites(): void {
    const session = buildSubmittedSession();
    const result = applyLocalSectionNoteChange({
        session,
        sectionKey: "section_a",
        note: "Rejected note",
        nextVersion: 20,
        dirtySections: {},
    });

    assertEqual(
        result.didChange,
        false,
        "Submitted sessions must reject local section-note writes",
    );
    assertDeepEqual(result.dirtySections, {}, "Submitted section-note writes must not dirty state");
    assertDeepEqual(
        result.session,
        session,
        "Submitted section-note writes must preserve the session",
    );
}

function testUnchangedPreAuditDoesNotCreateDirtyState(): void {
    const session = buildEditableSession();
    const result = applyLocalPreAuditChange({
        session,
        values: {},
        nextVersion: 21,
        dirtyPreAudit: {},
    });

    assertEqual(result.didChange, false, "No-op pre-audit writes must not create dirty state");
    assertDeepEqual(
        result.dirtyPreAudit,
        {},
        "No-op pre-audit writes must leave dirty pre-audit untouched",
    );
}

function testChangedPreAuditCreatesDirtyState(): void {
    const session = buildEditableSession();
    const result = applyLocalPreAuditChange({
        session,
        values: {
            season: "summer",
            weather_conditions: ["cloudy_overcast"],
        },
        nextVersion: 22,
        dirtyPreAudit: {},
    });
    const expectedPreAudit: AuditPreAuditValues = {
        ...session.pre_audit,
        season: "summer",
        weather_conditions: ["cloudy_overcast"],
    };

    assertEqual(result.didChange, true, "Changed pre-audit values must dirty the session");
    assertDeepEqual(
        result.session.pre_audit,
        expectedPreAudit,
        "Changed pre-audit values must update the returned session pre-audit block",
    );
    assertDeepEqual(
        result.session.aggregate.pre_audit,
        expectedPreAudit,
        "Changed pre-audit values must update the returned aggregate pre-audit block",
    );
    assertDeepEqual(
        result.dirtyPreAudit,
        {
            [session.audit_id]: 22,
        },
        "Changed pre-audit values must mark the pre-audit block dirty",
    );
}

function testSubmittedSessionsRejectLocalPreAuditWrites(): void {
    const session = buildSubmittedSession();
    const result = applyLocalPreAuditChange({
        session,
        values: {
            season: "winter",
        },
        nextVersion: 23,
        dirtyPreAudit: {},
    });

    assertEqual(result.didChange, false, "Submitted sessions must reject local pre-audit writes");
    assertDeepEqual(result.dirtyPreAudit, {}, "Submitted pre-audit writes must not dirty state");
    assertDeepEqual(
        result.session,
        session,
        "Submitted pre-audit writes must preserve the session",
    );
}

function testSubmittedSessionsAreExcludedFromTheSyncQueue(): void {
    const session = buildSubmittedSession();
    const dirtySections: DirtySections = { [session.audit_id]: { section_a: 7 } };
    const dirtyPreAudit: DirtyPreAudit = { [session.audit_id]: 8 };
    const dirtyMeta: DirtyMeta = { [session.audit_id]: 9 };

    assertEqual(isAuditSessionEditable(session), false, "Submitted sessions must be read-only");
    assertDeepEqual(
        buildSyncableAuditIds({
            sessionsByAuditId: { [session.audit_id]: session },
            dirtySections,
            dirtyPreAudit,
            dirtyMeta,
        }),
        [],
        "Submitted sessions must never remain syncable",
    );
}

function testUnknownDirtyAuditsAreExcludedFromTheSyncQueue(): void {
    const missingAuditId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    assertDeepEqual(
        buildSyncableAuditIds({
            sessionsByAuditId: {},
            dirtySections: {
                [missingAuditId]: {
                    section_a: 3,
                },
            },
            dirtyPreAudit: {
                [missingAuditId]: 4,
            },
            dirtyMeta: {
                [missingAuditId]: 5,
            },
        }),
        [],
        "Dirty audit ids without a loaded session must be omitted from the sync queue",
    );
}

function testUnchangedAnswersDoNotCreateDirtyState(): void {
    const session = buildEditableSession();
    const result = applyLocalQuestionAnswerChange({
        session,
        sectionKey: "section_a",
        questionKey: "question_a",
        answers: { quantity: "some" },
        nextVersion: 4,
        dirtySections: {},
    });

    assertDeepEqual(result.dirtySections, {}, "Unchanged answers must not mark the draft dirty");
    assertEqual(
        result.didChange,
        false,
        "Unchanged answers must be detected before touching state",
    );
}

function testEditableSessionsApplyQuestionAnswerChanges(): void {
    const session = buildEditableSession();
    const nextAnswers: QuestionResponsePayload = {
        quantity: "updated",
        diversity: "high",
    };
    const result = applyLocalQuestionAnswerChange({
        session,
        sectionKey: "section_a",
        questionKey: "question_a",
        answers: nextAnswers,
        nextVersion: 6,
        dirtySections: {},
    });

    assertEqual(result.didChange, true, "Editable sessions must report changed answers");
    assertDeepEqual(
        result.session.sections,
        {
            section_a: buildSectionAState(nextAnswers),
        },
        "Editable writes must update the returned section answers",
    );
    assertDeepEqual(
        result.session.aggregate.sections,
        {
            section_a: buildSectionAState(nextAnswers),
        },
        "Editable writes must update the returned aggregate section answers",
    );
    assertDeepEqual(
        session.sections,
        {
            section_a: buildSectionAState({ quantity: "some" }),
        },
        "Editable writes must not mutate the original session sections",
    );
    assertDeepEqual(
        session.aggregate.sections,
        {
            section_a: buildSectionAState({ quantity: "some" }),
        },
        "Editable writes must not mutate the original aggregate sections",
    );
    assertDeepEqual(
        result.dirtySections,
        {
            [session.audit_id]: {
                section_a: 6,
            },
        },
        "Editable writes must mark the section dirty with the supplied version",
    );
}

function testUnchangedAnswersIgnoreRecordKeyOrder(): void {
    const session = buildEditableSession();
    const reorderedSection = buildSectionAState({
        quantity: "some",
        diversity: "high",
    });
    const reorderedSession: AuditSession = {
        ...session,
        sections: {
            ...session.sections,
            section_a: reorderedSection,
        },
        aggregate: {
            ...session.aggregate,
            sections: {
                ...session.aggregate.sections,
                section_a: reorderedSection,
            },
        },
    };
    const result = applyLocalQuestionAnswerChange({
        session: reorderedSession,
        sectionKey: "section_a",
        questionKey: "question_a",
        answers: {
            diversity: "high",
            quantity: "some",
        },
        nextVersion: 5,
        dirtySections: {},
    });

    assertDeepEqual(
        result.dirtySections,
        {},
        "Logically equal answer payloads must ignore record key order",
    );
    assertEqual(result.didChange, false, "Shuffled answer keys must not produce a local write");
}

function testPausedSessionsRemainEditable(): void {
    const session = buildPausedSession();
    const result = applyLocalQuestionAnswerChange({
        session,
        sectionKey: "section_a",
        questionKey: "question_a",
        answers: { quantity: "paused-update" },
        nextVersion: 7,
        dirtySections: {},
    });

    assertEqual(isAuditSessionEditable(session), true, "Paused sessions must still be editable");
    assertEqual(result.didChange, true, "Paused sessions must accept local question changes");
    assertDeepEqual(
        result.dirtySections,
        {
            [session.audit_id]: {
                section_a: 7,
            },
        },
        "Paused session changes must still mark the section dirty",
    );
}

function testDirtyMetaOnlyAuditsRemainSyncableWhenEditable(): void {
    const session = buildEditableSession();

    assertDeepEqual(
        buildSyncableAuditIds({
            sessionsByAuditId: {
                [session.audit_id]: session,
            },
            dirtySections: {},
            dirtyPreAudit: {},
            dirtyMeta: {
                [session.audit_id]: 12,
            },
        }),
        [session.audit_id],
        "Editable audits with only dirty meta must remain syncable",
    );
}

function testDirtySectionsOnlyAuditsRemainSyncableWhenEditable(): void {
    const session = buildEditableSession();

    assertDeepEqual(
        buildSyncableAuditIds({
            sessionsByAuditId: {
                [session.audit_id]: session,
            },
            dirtySections: {
                [session.audit_id]: {
                    section_a: 14,
                },
            },
            dirtyPreAudit: {},
            dirtyMeta: {},
        }),
        [session.audit_id],
        "Editable audits with non-empty dirty sections must remain syncable",
    );
}

function testDirtyPreAuditOnlyAuditsRemainSyncableWhenEditable(): void {
    const session = buildEditableSession();

    assertDeepEqual(
        buildSyncableAuditIds({
            sessionsByAuditId: {
                [session.audit_id]: session,
            },
            dirtySections: {},
            dirtyPreAudit: {
                [session.audit_id]: 13,
            },
            dirtyMeta: {},
        }),
        [session.audit_id],
        "Editable audits with only dirty pre-audit state must remain syncable",
    );
}

function testUnchangedChecklistAnswersDoNotCreateDirtyState(): void {
    const session = buildSessionWithQuestionPayload(
        "IN_PROGRESS",
        buildChecklistPayload(["other"], "Original checklist details"),
    );
    const result = applyLocalQuestionAnswerChange({
        session,
        sectionKey: "section_a",
        questionKey: "question_a",
        answers: buildChecklistPayload(["other"], "Original checklist details"),
        nextVersion: 15,
        dirtySections: {},
    });

    assertEqual(
        result.didChange,
        false,
        "Unchanged checklist-shaped answers must not create dirty state",
    );
    assertDeepEqual(
        result.dirtySections,
        {},
        "Unchanged checklist-shaped answers must leave dirty sections untouched",
    );
}

function testChangedChecklistAnswersCreateDirtyState(): void {
    const session = buildSessionWithQuestionPayload(
        "IN_PROGRESS",
        buildChecklistPayload(["other"], "Original checklist details"),
    );
    const nextAnswers = buildChecklistPayload(["other", "secondary"], "Updated checklist details");
    const result = applyLocalQuestionAnswerChange({
        session,
        sectionKey: "section_a",
        questionKey: "question_a",
        answers: nextAnswers,
        nextVersion: 16,
        dirtySections: {},
    });

    assertEqual(result.didChange, true, "Changed checklist-shaped answers must dirty the audit");
    assertDeepEqual(
        result.session.sections,
        {
            section_a: buildSectionAState(nextAnswers),
        },
        "Changed checklist-shaped answers must update the returned session section",
    );
    assertDeepEqual(
        result.session.aggregate.sections,
        {
            section_a: buildSectionAState(nextAnswers),
        },
        "Changed checklist-shaped answers must update the returned aggregate section",
    );
    assertDeepEqual(
        result.dirtySections,
        {
            [session.audit_id]: {
                section_a: 16,
            },
        },
        "Changed checklist-shaped answers must mark the section dirty",
    );
}

function testChangedChecklistAnswersCloneNestedValues(): void {
    const session = buildSessionWithQuestionPayload(
        "IN_PROGRESS",
        buildChecklistPayload(["other"], "Original checklist details"),
    );
    const result = applyLocalQuestionAnswerChange({
        session,
        sectionKey: "section_a",
        questionKey: "question_a",
        answers: buildChecklistPayload(["other", "secondary"], "Updated checklist details"),
        nextVersion: 17,
        dirtySections: {},
    });
    const returnedPayload = readSectionAQuestionPayload(result.session);
    const selectedOptionKeys = returnedPayload["selected_option_keys"];
    if (!Array.isArray(selectedOptionKeys)) {
        throw new TypeError(
            "Expected selected_option_keys to be an array in the returned payload.",
        );
    }
    const otherDetails = returnedPayload["other_details"];
    if (typeof otherDetails !== "object" || otherDetails === null || Array.isArray(otherDetails)) {
        throw new TypeError(
            "Expected other_details to be a string record in the returned payload.",
        );
    }

    selectedOptionKeys.push("mutated");
    otherDetails["text"] = "Mutated checklist details";

    assertDeepEqual(
        readSectionAQuestionPayload(session),
        buildChecklistPayload(["other"], "Original checklist details"),
        "Checklist payload updates must clone nested values so the original session stays unchanged",
    );
    assertDeepEqual(
        session.aggregate.sections,
        {
            section_a: buildSectionAState(
                buildChecklistPayload(["other"], "Original checklist details"),
            ),
        },
        "Checklist payload updates must keep the original aggregate section unchanged",
    );
}

function testSubmittedSessionsRejectLocalWrites(): void {
    const session = buildSubmittedSession();
    const result = applyLocalQuestionAnswerChange({
        session,
        sectionKey: "section_a",
        questionKey: "question_a",
        answers: { quantity: "different" },
        nextVersion: 4,
        dirtySections: {},
    });

    assertEqual(result.didChange, false, "Submitted sessions must reject local question writes");
    assertDeepEqual(result.dirtySections, {}, "Submitted writes must not create dirty state");
    assertDeepEqual(result.session, session, "Submitted writes must preserve the original session");
}

function testSaveAcknowledgementRejectsAuditIdMismatches(): void {
    assertThrows(
        () => {
            clearAcknowledgedDirtyState({
                auditId: "99999999-9999-4999-8999-999999999999",
                currentDirtySections: {
                    "11111111-1111-4111-8111-111111111111": {
                        section_a: 4,
                    },
                },
                currentDirtyPreAudit: {},
                currentDirtyMeta: {},
                snapshot: {
                    auditId: "11111111-1111-4111-8111-111111111111",
                    expectedRevision: 4,
                    metaVersion: null,
                    preAuditVersion: null,
                    sectionVersions: { section_a: 4 },
                },
            });
        },
        "Dirty state acknowledgement audit id mismatch",
        "Mismatched audit ids must not silently no-op",
    );
}

function testSaveAcknowledgementKeepsNewerLocalVersionsDirty(): void {
    const cleared = clearAcknowledgedDirtyState({
        auditId: "11111111-1111-4111-8111-111111111111",
        currentDirtySections: {
            "11111111-1111-4111-8111-111111111111": {
                section_a: 4,
                section_b: 10,
            },
        },
        currentDirtyPreAudit: {
            "11111111-1111-4111-8111-111111111111": 11,
        },
        currentDirtyMeta: {
            "11111111-1111-4111-8111-111111111111": 2,
        },
        snapshot: {
            auditId: "11111111-1111-4111-8111-111111111111",
            expectedRevision: 4,
            metaVersion: 2,
            preAuditVersion: 7,
            sectionVersions: { section_a: 4 },
        },
    });

    assertDeepEqual(
        cleared,
        {
            dirtySections: {
                "11111111-1111-4111-8111-111111111111": {
                    section_b: 10,
                },
            },
            dirtyPreAudit: {
                "11111111-1111-4111-8111-111111111111": 11,
            },
            dirtyMeta: {},
        },
        "Ack should clear only the exact versions included in the outbound snapshot",
    );
}

/**
 * Run the focused sync-core regression checks.
 */
function main(): void {
    testSubmittedSessionsAreExcludedFromTheSyncQueue();
    testUnknownDirtyAuditsAreExcludedFromTheSyncQueue();
    testUnchangedAnswersDoNotCreateDirtyState();
    testEditableSessionsApplyQuestionAnswerChanges();
    testUnchangedAnswersIgnoreRecordKeyOrder();
    testPausedSessionsRemainEditable();
    testUnchangedSectionNotesDoNotCreateDirtyState();
    testChangedSectionNotesCreateDirtyState();
    testSubmittedSessionsRejectLocalSectionNoteWrites();
    testUnchangedPreAuditDoesNotCreateDirtyState();
    testChangedPreAuditCreatesDirtyState();
    testSubmittedSessionsRejectLocalPreAuditWrites();
    testDirtyMetaOnlyAuditsRemainSyncableWhenEditable();
    testDirtySectionsOnlyAuditsRemainSyncableWhenEditable();
    testDirtyPreAuditOnlyAuditsRemainSyncableWhenEditable();
    testUnchangedChecklistAnswersDoNotCreateDirtyState();
    testChangedChecklistAnswersCreateDirtyState();
    testChangedChecklistAnswersCloneNestedValues();
    testSubmittedSessionsRejectLocalWrites();
    testSaveAcknowledgementRejectsAuditIdMismatches();
    testSaveAcknowledgementKeepsNewerLocalVersionsDirty();
}

main();
