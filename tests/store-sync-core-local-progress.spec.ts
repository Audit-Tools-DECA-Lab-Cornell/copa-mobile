import { describe, expect, it } from "vitest";

import {
    applyLocalFinalCommentsChange,
    applyLocalPreAuditChange,
    applyLocalQuestionAnswerChange,
    applyLocalSectionNoteChange,
} from "lib/audit/store-sync-core";
import { auditSessionSchema, playspaceInstrumentSchema } from "lib/audit/types";

import type { AuditSession, PlayspaceInstrument } from "lib/audit/types";

/**
 * One section, one required scaled question. Answering "provision: yes"
 * completes the question (it gates no follow-up scales).
 */
const instrument: PlayspaceInstrument = playspaceInstrumentSchema.parse({
    instrument_key: "pvua_test",
    instrument_name: "Test Instrument",
    instrument_version: "1.0",
    current_sheet: "Sheet1",
    source_files: [],
    preamble: [],
    execution_modes: [
        { key: "audit", label: "Audit", description: null },
        { key: "survey", label: "Survey", description: null },
    ],
    pre_audit_questions: [
        {
            key: "place_size",
            label: "Place size",
            description: null,
            input_type: "single_select",
            required: true,
            options: [
                { key: "small", label: "Small" },
                { key: "large", label: "Large" },
            ],
            page_key: "space_setup",
            visible_modes: ["audit", "survey", "both"],
        },
    ],
    scale_guidance: [],
    sections: [
        {
            section_key: "section_a",
            title: "Section A",
            description: null,
            instruction: "Rate each element.",
            notes_prompt: null,
            questions: [
                {
                    question_key: "q1",
                    mode: "audit",
                    constructs: ["play_value"],
                    domains: [],
                    section_key: "section_a",
                    prompt: "Is the equipment present?",
                    question_type: "scaled",
                    scales: [
                        {
                            key: "provision",
                            title: "Provision",
                            prompt: "Rate provision",
                            options: [
                                {
                                    key: "yes",
                                    label: "Yes",
                                    addition_value: 1,
                                    boost_value: 0,
                                    allows_follow_up_scales: false,
                                    is_not_applicable: false,
                                    is_unsure: false,
                                },
                                {
                                    key: "no",
                                    label: "No",
                                    addition_value: 0,
                                    boost_value: 0,
                                    allows_follow_up_scales: false,
                                    is_not_applicable: false,
                                    is_unsure: false,
                                },
                            ],
                        },
                    ],
                    options: [],
                    required: true,
                    display_if: null,
                    notes_prompt: null,
                },
            ],
        },
    ],
    legal_documents: [],
});

const emptyPreAudit = {
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

const completedPreAudit = {
    ...emptyPreAudit,
    place_size: "small",
};

/**
 * Build an audit session. Defaults: IN_PROGRESS, instrument attached, pre-audit
 * incomplete, q1 unanswered — so ready_to_submit starts false.
 */
function buildSession(overrides: {
    status?: "IN_PROGRESS" | "PAUSED" | "SUBMITTED";
    withInstrument?: boolean;
    preAuditComplete?: boolean;
    q1Answered?: boolean;
}): AuditSession {
    const { status = "IN_PROGRESS", withInstrument = true, preAuditComplete = false, q1Answered = false } = overrides;

    const preAudit = preAuditComplete ? completedPreAudit : emptyPreAudit;
    const q1Responses = q1Answered ? { provision: "yes" } : {};

    return auditSessionSchema.parse({
        audit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        audit_code: "TEST-001",
        project_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        project_name: "Test Project",
        place_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        place_name: "Test Place",
        place_type: "Public Playspace",
        allowed_execution_modes: ["audit", "survey"],
        selected_execution_mode: "audit",
        status,
        instrument_key: "pvua_test",
        instrument_version: "1.0",
        instrument: withInstrument ? instrument : undefined,
        schema_version: 1,
        revision: 0,
        started_at: "2026-06-20T10:00:00.000Z",
        submitted_at: null,
        total_minutes: null,
        meta: { execution_mode: "audit", final_comments: null },
        pre_audit: preAudit,
        sections: {
            section_a: {
                section_key: "section_a",
                note: null,
                responses: {
                    ...(q1Answered ? { q1: q1Responses } : {}),
                },
            },
        },
        aggregate: {
            schema_version: 1,
            revision: 0,
            meta: { execution_mode: "audit", final_comments: null },
            pre_audit: preAudit,
            sections: {
                section_a: {
                    section_key: "section_a",
                    note: null,
                    responses: {
                        ...(q1Answered ? { q1: q1Responses } : {}),
                    },
                },
            },
        },
        scores: {
            draft_progress_percent: q1Answered ? 100 : 0,
            execution_mode: "audit",
            audit: null,
            survey: null,
            overall: null,
            by_section: {},
            by_domain: {},
        },
        progress: {
            required_pre_audit_complete: preAuditComplete,
            visible_section_count: 1,
            completed_section_count: q1Answered ? 1 : 0,
            total_visible_questions: 1,
            answered_visible_questions: q1Answered ? 1 : 0,
            ready_to_submit: preAuditComplete && q1Answered,
            sections: [
                {
                    section_key: "section_a",
                    title: "Section A",
                    visible_question_count: 1,
                    answered_question_count: q1Answered ? 1 : 0,
                    is_complete: q1Answered,
                },
            ],
        },
    });
}

const emptyDirty = {
    dirtySections: {},
    dirtyPreAudit: {},
    dirtyMeta: {},
    dirtyStartedAt: {},
};

describe("applyLocalQuestionAnswerChange — progress recompute", () => {
    it("flips ready_to_submit when the last required question is answered offline (no server round-trip)", () => {
        // Session is otherwise complete: pre-audit done, q1 still unanswered.
        const session = buildSession({ preAuditComplete: true, q1Answered: false });
        expect(session.progress.ready_to_submit).toBe(false);

        const result = applyLocalQuestionAnswerChange({
            session,
            sectionKey: "section_a",
            questionKey: "q1",
            answers: { provision: "yes" },
            nextVersion: 1,
            dirtySections: emptyDirty.dirtySections,
        });

        expect(result.didChange).toBe(true);
        expect(result.session.progress.ready_to_submit).toBe(true);
        expect(result.session.progress.completed_section_count).toBe(1);
        expect(result.session.progress.answered_visible_questions).toBe(1);
        expect(result.session.scores.draft_progress_percent).toBe(100);
    });

    it("updates answered_visible_questions and draft_progress_percent on a partial answer", () => {
        const session = buildSession({ preAuditComplete: false, q1Answered: false });

        const result = applyLocalQuestionAnswerChange({
            session,
            sectionKey: "section_a",
            questionKey: "q1",
            answers: { provision: "yes" },
            nextVersion: 1,
            dirtySections: emptyDirty.dirtySections,
        });

        // Pre-audit not done so ready_to_submit is still false even though q1 is answered.
        expect(result.didChange).toBe(true);
        expect(result.session.progress.ready_to_submit).toBe(false);
        expect(result.session.progress.answered_visible_questions).toBe(1);
        expect(result.session.progress.required_pre_audit_complete).toBe(false);
        expect(result.session.scores.draft_progress_percent).toBe(100);
    });

    it("does not change progress or mark dirty on a no-op answer (same value)", () => {
        const session = buildSession({ preAuditComplete: true, q1Answered: true });
        const before = session.progress;

        const result = applyLocalQuestionAnswerChange({
            session,
            sectionKey: "section_a",
            questionKey: "q1",
            answers: { provision: "yes" }, // same as already stored
            nextVersion: 1,
            dirtySections: emptyDirty.dirtySections,
        });

        expect(result.didChange).toBe(false);
        expect(result.session.progress).toBe(before); // referential equality — unchanged object
        expect(result.dirtySections).toEqual({});
    });

    it("leaves progress unchanged when the instrument is not loaded", () => {
        const session = buildSession({ withInstrument: false, preAuditComplete: true, q1Answered: false });
        const progressBefore = session.progress;

        const result = applyLocalQuestionAnswerChange({
            session,
            sectionKey: "section_a",
            questionKey: "q1",
            answers: { provision: "yes" },
            nextVersion: 1,
            dirtySections: emptyDirty.dirtySections,
        });

        // The edit applies (answer stored, dirty flagged) but progress stays as-is.
        expect(result.didChange).toBe(true);
        expect(result.session.progress).toEqual(progressBefore);
    });
});

describe("applyLocalPreAuditChange — progress recompute", () => {
    it("sets required_pre_audit_complete when the required field is filled in", () => {
        const session = buildSession({ preAuditComplete: false, q1Answered: true });
        expect(session.progress.required_pre_audit_complete).toBe(false);
        expect(session.progress.ready_to_submit).toBe(false);

        const result = applyLocalPreAuditChange({
            session,
            values: { place_size: "small" },
            nextVersion: 1,
            dirtyPreAudit: emptyDirty.dirtyPreAudit,
        });

        expect(result.didChange).toBe(true);
        expect(result.session.progress.required_pre_audit_complete).toBe(true);
        // q1 is answered so completing pre-audit tips ready_to_submit to true.
        expect(result.session.progress.ready_to_submit).toBe(true);
    });

    it("does not recompute or mark dirty on a no-op pre-audit edit", () => {
        const session = buildSession({ preAuditComplete: true, q1Answered: false });
        const before = session.progress;

        const result = applyLocalPreAuditChange({
            session,
            values: { place_size: "small" }, // already stored
            nextVersion: 1,
            dirtyPreAudit: emptyDirty.dirtyPreAudit,
        });

        expect(result.didChange).toBe(false);
        expect(result.session.progress).toBe(before);
        expect(result.dirtyPreAudit).toEqual({});
    });

    it("leaves progress unchanged when the instrument is not loaded", () => {
        const session = buildSession({ withInstrument: false, preAuditComplete: false, q1Answered: false });
        const progressBefore = session.progress;

        const result = applyLocalPreAuditChange({
            session,
            values: { place_size: "small" },
            nextVersion: 1,
            dirtyPreAudit: emptyDirty.dirtyPreAudit,
        });

        expect(result.didChange).toBe(true);
        expect(result.session.progress).toEqual(progressBefore);
    });
});

describe("applyLocalSectionNoteChange — progress recompute", () => {
    it("recomputes progress after a section note is added", () => {
        const session = buildSession({ preAuditComplete: true, q1Answered: true });
        // ready_to_submit is already true; adding a note should not break that.
        expect(session.progress.ready_to_submit).toBe(true);

        const result = applyLocalSectionNoteChange({
            session,
            sectionKey: "section_a",
            note: "Observed during peak hours.",
            nextVersion: 1,
            dirtySections: emptyDirty.dirtySections,
        });

        expect(result.didChange).toBe(true);
        // Progress must still reflect the already-complete state.
        expect(result.session.progress.ready_to_submit).toBe(true);
        expect(result.session.progress.completed_section_count).toBe(1);
    });

    it("does not mark dirty on a no-op note edit (same note)", () => {
        const session = buildSession({ preAuditComplete: false, q1Answered: false });
        // Set an initial note by going through the change path first.
        const withNote = applyLocalSectionNoteChange({
            session,
            sectionKey: "section_a",
            note: "same note",
            nextVersion: 1,
            dirtySections: emptyDirty.dirtySections,
        });

        const before = withNote.session.progress;
        const result = applyLocalSectionNoteChange({
            session: withNote.session,
            sectionKey: "section_a",
            note: "same note",
            nextVersion: 2,
            dirtySections: withNote.dirtySections,
        });

        expect(result.didChange).toBe(false);
        expect(result.session.progress).toBe(before);
    });
});

describe("applyLocalFinalCommentsChange — progress recompute", () => {
    it("recomputes progress after final comments are saved", () => {
        const session = buildSession({ preAuditComplete: true, q1Answered: true });
        expect(session.progress.ready_to_submit).toBe(true);

        const result = applyLocalFinalCommentsChange({
            session,
            finalComments: "Overall the space was well-maintained.",
            nextVersion: 1,
            dirtyMeta: emptyDirty.dirtyMeta,
        });

        expect(result.didChange).toBe(true);
        // Final comments do not affect section completion, so ready_to_submit stays true.
        expect(result.session.progress.ready_to_submit).toBe(true);
        expect(result.session.meta.final_comments).toBe("Overall the space was well-maintained.");
    });

    it("does not mark dirty on a no-op final-comments edit (same value)", () => {
        const session = buildSession({ preAuditComplete: false, q1Answered: false });
        const withComments = applyLocalFinalCommentsChange({
            session,
            finalComments: "A note.",
            nextVersion: 1,
            dirtyMeta: emptyDirty.dirtyMeta,
        });

        const before = withComments.session.progress;
        const result = applyLocalFinalCommentsChange({
            session: withComments.session,
            finalComments: "A note.",
            nextVersion: 2,
            dirtyMeta: withComments.dirtyMeta,
        });

        expect(result.didChange).toBe(false);
        expect(result.session.progress).toBe(before);
    });

    it("leaves progress unchanged when the instrument is not loaded", () => {
        const session = buildSession({ withInstrument: false, preAuditComplete: true, q1Answered: true });
        const progressBefore = session.progress;

        const result = applyLocalFinalCommentsChange({
            session,
            finalComments: "Notes added offline.",
            nextVersion: 1,
            dirtyMeta: emptyDirty.dirtyMeta,
        });

        expect(result.didChange).toBe(true);
        expect(result.session.progress).toEqual(progressBefore);
    });
});

describe("edit paths — submitted session guard", () => {
    it("applyLocalQuestionAnswerChange returns didChange=false for SUBMITTED sessions", () => {
        const session = buildSession({ status: "SUBMITTED", preAuditComplete: true, q1Answered: false });

        const result = applyLocalQuestionAnswerChange({
            session,
            sectionKey: "section_a",
            questionKey: "q1",
            answers: { provision: "yes" },
            nextVersion: 1,
            dirtySections: emptyDirty.dirtySections,
        });

        expect(result.didChange).toBe(false);
    });

    it("applyLocalPreAuditChange returns didChange=false for SUBMITTED sessions", () => {
        const session = buildSession({ status: "SUBMITTED", preAuditComplete: false, q1Answered: false });

        const result = applyLocalPreAuditChange({
            session,
            values: { place_size: "small" },
            nextVersion: 1,
            dirtyPreAudit: emptyDirty.dirtyPreAudit,
        });

        expect(result.didChange).toBe(false);
    });
});
