import { BASE_PLAYSPACE_INSTRUMENT } from "../instrument";
import {
    applyLocalExecutionModeChange,
    canEditAuditInputs,
    deriveLocalDraftProgress,
    shouldPersistCleanupWrite,
} from "./store-sync-core";
import type {
    AuditMeta,
    AuditPreAuditValues,
    AuditSectionState,
    AuditSession,
    AuditStatus,
    DirtyMeta,
    ExecutionMode,
    PlayspaceInstrument,
    QuestionResponsePayload,
    QuestionScale,
} from "./types";

interface SessionFixtureOverrides {
    readonly instrument?: PlayspaceInstrument;
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
 * Clone one response payload so fixtures never share nested references.
 *
 * @param answers Source payload.
 * @returns Cloned payload with copied arrays and records.
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
 * Clone one section fixture.
 *
 * @param section Source section state.
 * @param sectionKey Fallback key when the section is undefined.
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
 * @param meta Source meta block.
 * @returns Cloned meta block.
 */
function cloneMeta(meta: AuditMeta): AuditMeta {
    return {
        execution_mode: meta.execution_mode,
    };
}

/**
 * Clone one pre-audit value block.
 *
 * @param preAudit Source pre-audit values.
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
 * Clone a section-state record.
 *
 * @param sections Source section map.
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
 * Build the shared quantity scale used by the focused progress fixtures.
 *
 * @returns One quantity scale with two answer choices.
 */
function buildQuantityScale(): QuestionScale {
    return {
        key: "quantity",
        title: "Quantity",
        prompt: "How much?",
        options: [
            {
                key: "none",
                label: "None",
                addition_value: 0,
                boost_value: 0,
                allows_follow_up_scales: false,
                is_not_applicable: false,
            },
            {
                key: "some",
                label: "Some",
                addition_value: 1,
                boost_value: 0,
                allows_follow_up_scales: false,
                is_not_applicable: false,
            },
        ],
    };
}

/**
 * Build a minimal instrument whose visible questions match the default session fixture.
 *
 * @returns Minimal playspace instrument for local-write regression tests.
 */
function buildDefaultInstrument(): PlayspaceInstrument {
    const quantityScale = buildQuantityScale();
    return {
        ...BASE_PLAYSPACE_INSTRUMENT,
        pre_audit_questions: [],
        sections: [
            {
                section_key: "section_a",
                title: "Section A",
                description: null,
                instruction: "Answer the default section.",
                notes_prompt: null,
                questions: [
                    {
                        question_key: "question_a",
                        mode: "audit",
                        constructs: ["usability"],
                        domains: ["domain_a"],
                        section_key: "section_a",
                        prompt: "Default audit question",
                        question_type: "scaled",
                        scales: [quantityScale],
                        options: [],
                        required: true,
                        display_if: null,
                    },
                ],
            },
        ],
    };
}

/**
 * Build an instrument where one answered question becomes hidden after a mode change.
 *
 * @returns Instrument with one audit-only and one survey-only question in the same section.
 */
function buildModeSwitchInstrument(): PlayspaceInstrument {
    const quantityScale = buildQuantityScale();
    return {
        ...BASE_PLAYSPACE_INSTRUMENT,
        pre_audit_questions: [],
        sections: [
            {
                section_key: "section_a",
                title: "Section A",
                description: null,
                instruction: "Answer the section.",
                notes_prompt: null,
                questions: [
                    {
                        question_key: "question_visible",
                        mode: "audit",
                        constructs: ["usability"],
                        domains: ["domain_a"],
                        section_key: "section_a",
                        prompt: "Audit-only question",
                        question_type: "scaled",
                        scales: [quantityScale],
                        options: [],
                        required: true,
                        display_if: null,
                    },
                    {
                        question_key: "question_hidden",
                        mode: "survey",
                        constructs: ["play_value"],
                        domains: ["domain_b"],
                        section_key: "section_a",
                        prompt: "Survey-only question",
                        question_type: "scaled",
                        scales: [quantityScale],
                        options: [],
                        required: true,
                        display_if: null,
                    },
                ],
            },
        ],
    };
}

/**
 * Build the default section map used by the editable draft fixtures.
 *
 * @returns Canonical section-state map.
 */
function buildDefaultSections(): Record<string, AuditSectionState> {
    return {
        section_a: {
            section_key: "section_a",
            note: null,
            responses: {
                question_a: {
                    quantity: "some",
                },
            },
        },
    };
}

/**
 * Build the mode-switch section map with both visible and hidden answers present.
 *
 * @returns Section-state map that preserves hidden answers across mode switches.
 */
function buildModeSwitchSections(): Record<string, AuditSectionState> {
    return {
        section_a: {
            section_key: "section_a",
            note: "Existing note",
            responses: {
                question_visible: {
                    quantity: "some",
                },
                question_hidden: {
                    quantity: "some",
                },
            },
        },
    };
}

/**
 * Build the default pre-audit block used by the focused regression tests.
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
 * Build a focused audit session fixture for local-write regressions.
 *
 * @param status Audit lifecycle status for the fixture.
 * @param overrides Optional session overrides.
 * @returns Minimal valid session data for the pure helper tests.
 */
function buildSession(status: AuditStatus, overrides: SessionFixtureOverrides = {}): AuditSession {
    const selectedExecutionMode =
        overrides.selected_execution_mode ?? overrides.meta?.execution_mode ?? "audit";
    const instrument = overrides.instrument ?? buildDefaultInstrument();
    const meta = cloneMeta(overrides.meta ?? { execution_mode: selectedExecutionMode });
    const preAudit = clonePreAuditValues(overrides.pre_audit ?? buildDefaultPreAudit());
    const sections = cloneSectionsMap(overrides.sections ?? buildDefaultSections());

    return {
        audit_id: "11111111-1111-4111-8111-111111111111",
        audit_code: "AUD-001",
        project_id: "22222222-2222-4222-8222-222222222222",
        project_name: "Project",
        place_id: "33333333-3333-4333-8333-333333333333",
        place_name: "Place",
        place_type: "playspace",
        allowed_execution_modes: ["audit", "survey", "both"],
        selected_execution_mode: selectedExecutionMode,
        status,
        instrument_key: instrument.instrument_key,
        instrument_version: instrument.instrument_version,
        instrument,
        schema_version: 1,
        revision: 3,
        aggregate: {
            schema_version: 1,
            revision: 3,
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
            visible_section_count: 1,
            completed_section_count: 0,
            total_visible_questions: 1,
            answered_visible_questions: 0,
            ready_to_submit: false,
            sections: [],
        },
    };
}

/**
 * Build an editable session fixture.
 *
 * @param overrides Optional session overrides.
 * @returns In-progress session fixture.
 */
function buildEditableSession(overrides: SessionFixtureOverrides = {}): AuditSession {
    return buildSession("IN_PROGRESS", overrides);
}

/**
 * Verify that a local mode change updates both execution-mode fields and dirties meta.
 */
function testLocalModeChangeUpdatesBothModeFieldsAndMarksDirtyMeta(): void {
    const session = buildEditableSession();
    const initialDirtyMeta: DirtyMeta = {
        "99999999-9999-4999-8999-999999999999": 3,
    };
    const result = applyLocalExecutionModeChange({
        session,
        executionMode: "survey",
        nextVersion: 41,
        dirtyMeta: initialDirtyMeta,
    });

    assertEqual(result.didChange, true, "Changing the execution mode must report a local change");
    assertEqual(
        result.session.selected_execution_mode,
        "survey",
        "Changing the execution mode must update the selected mode",
    );
    assertEqual(
        result.session.meta.execution_mode,
        "survey",
        "Changing the execution mode must update the meta mode",
    );
    assertEqual(
        result.session.aggregate.meta.execution_mode,
        "survey",
        "Changing the execution mode must update the aggregate meta mode",
    );
    assertEqual(
        result.session.scores.execution_mode,
        "survey",
        "Changing the execution mode must update the local score mode",
    );
    assertDeepEqual(
        result.dirtyMeta,
        {
            "99999999-9999-4999-8999-999999999999": 3,
            [session.audit_id]: 41,
        },
        "Changing the execution mode must mark dirty meta with the supplied version",
    );
    assertEqual(
        session.selected_execution_mode,
        "audit",
        "Changing the execution mode must not mutate the original session",
    );
}

/**
 * Verify that submit-in-flight sessions become locally read-only.
 */
function testSubmitInFlightLockRejectsInputEdits(): void {
    const session = buildEditableSession();

    assertEqual(
        canEditAuditInputs({
            session,
            phase: "submitting",
        }),
        false,
        "Submitting audits must reject input edits",
    );
    assertEqual(
        canEditAuditInputs({
            session,
            phase: "resolving_submit",
        }),
        false,
        "Submit-resolution audits must reject input edits",
    );
    assertEqual(
        canEditAuditInputs({
            session,
            phase: "dirty",
        }),
        true,
        "Dirty editable drafts must continue accepting input edits",
    );
}

/**
 * Verify that cleanup guards skip no-op writes.
 */
function testUnchangedCleanupWriteReturnsFalse(): void {
    assertEqual(
        shouldPersistCleanupWrite({
            currentValue: {
                season: "summer",
                weather_conditions: ["sunny", "warm"],
            },
            nextValue: {
                season: "summer",
                weather_conditions: ["sunny", "warm"],
            },
        }),
        false,
        "Cleanup writes must skip unchanged values",
    );
}

/**
 * Verify that hidden answers survive a local mode switch and progress recomputes from canonical state.
 */
function testHiddenAnswersSurviveModeChangeAndProgressRecomputes(): void {
    const session = buildEditableSession({
        instrument: buildModeSwitchInstrument(),
        selected_execution_mode: "survey",
        meta: { execution_mode: "survey" },
        sections: buildModeSwitchSections(),
    });
    const result = applyLocalExecutionModeChange({
        session,
        executionMode: "audit",
        nextVersion: 42,
        dirtyMeta: {},
    });
    const hiddenAnswers = result.session.sections["section_a"]?.responses["question_hidden"];

    assertDeepEqual(
        hiddenAnswers,
        {
            quantity: "some",
        },
        "Changing the execution mode must preserve answers that become hidden",
    );

    const localProgress = deriveLocalDraftProgress(result.session);
    if (typeof localProgress.draftProgressPercent !== "number") {
        throw new TypeError("Expected local progress recomputation to return a numeric percent.");
    }

    assertEqual(
        localProgress.draftProgressPercent,
        100,
        "Changing the execution mode must recompute local progress from canonical state",
    );
    assertEqual(
        result.session.progress.total_visible_questions,
        1,
        "Changing the execution mode must update the local visible-question count",
    );
}

/**
 * Run the focused local-write regression checks for Task 6.
 */
function main(): void {
    testLocalModeChangeUpdatesBothModeFieldsAndMarksDirtyMeta();
    testSubmitInFlightLockRejectsInputEdits();
    testUnchangedCleanupWriteReturnsFalse();
    testHiddenAnswersSurviveModeChangeAndProgressRecomputes();
}

main();
