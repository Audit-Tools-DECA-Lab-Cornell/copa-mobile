import { describe, expect, it } from "vitest";

import { buildDomainReportRows } from "lib/audit/report-helpers";
import { auditSessionSchema, playspaceInstrumentSchema } from "lib/audit/types";

function buildInstrument() {
    return playspaceInstrumentSchema.parse({
        instrument_key: "pvua-v-test",
        instrument_name: "PVUA",
        instrument_version: "5.2",
        current_sheet: "sheet-1",
        source_files: ["instrument.json"],
        preamble: [],
        execution_modes: [
            {
                key: "audit",
                label: "Place Audit",
                description: null,
            },
        ],
        pre_audit_questions: [],
        scale_guidance: [],
        sections: [
            {
                section_key: "section_play",
                title: "Play",
                description: "Play section",
                instruction: "Answer the questions",
                notes_prompt: null,
                questions: [
                    {
                        question_key: "q_1_1",
                        mode: "audit",
                        constructs: ["play_value"],
                        domains: ["movement"],
                        section_key: "section_play",
                        prompt: "Play item with an explicit not applicable follow-up answer.",
                        question_type: "scaled",
                        required: true,
                        display_if: null,
                        notes_prompt: null,
                        options: [],
                        scales: [
                            {
                                key: "provision",
                                title: "Provision",
                                prompt: "Provision",
                                options: [
                                    {
                                        key: "a_lot",
                                        label: "A lot",
                                        addition_value: 2,
                                        boost_value: 1,
                                        allows_follow_up_scales: true,
                                        is_not_applicable: false,
                                    },
                                    {
                                        key: "no",
                                        label: "No",
                                        addition_value: 0,
                                        boost_value: 0,
                                        allows_follow_up_scales: false,
                                        is_not_applicable: false,
                                    },
                                ],
                            },
                            {
                                key: "variety",
                                title: "Variety",
                                prompt: "Variety",
                                options: [
                                    {
                                        key: "varied",
                                        label: "Varied",
                                        addition_value: 2,
                                        boost_value: 2,
                                        allows_follow_up_scales: false,
                                        is_not_applicable: false,
                                    },
                                    {
                                        key: "not_applicable",
                                        label: "Not applicable",
                                        addition_value: 0,
                                        boost_value: 1,
                                        allows_follow_up_scales: false,
                                        is_not_applicable: true,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        question_key: "q_1_2",
                        mode: "audit",
                        constructs: ["play_value"],
                        domains: ["movement"],
                        section_key: "section_play",
                        prompt: "Play item where follow-up scales were never shown.",
                        question_type: "scaled",
                        required: true,
                        display_if: null,
                        notes_prompt: null,
                        options: [],
                        scales: [
                            {
                                key: "provision",
                                title: "Provision",
                                prompt: "Provision",
                                options: [
                                    {
                                        key: "a_lot",
                                        label: "A lot",
                                        addition_value: 2,
                                        boost_value: 1,
                                        allows_follow_up_scales: true,
                                        is_not_applicable: false,
                                    },
                                    {
                                        key: "no",
                                        label: "No",
                                        addition_value: 0,
                                        boost_value: 0,
                                        allows_follow_up_scales: false,
                                        is_not_applicable: false,
                                    },
                                ],
                            },
                            {
                                key: "variety",
                                title: "Variety",
                                prompt: "Variety",
                                options: [
                                    {
                                        key: "varied",
                                        label: "Varied",
                                        addition_value: 2,
                                        boost_value: 2,
                                        allows_follow_up_scales: false,
                                        is_not_applicable: false,
                                    },
                                    {
                                        key: "not_applicable",
                                        label: "Not applicable",
                                        addition_value: 0,
                                        boost_value: 1,
                                        allows_follow_up_scales: false,
                                        is_not_applicable: true,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        question_key: "q_1_1_1",
                        mode: "audit",
                        constructs: [],
                        domains: [],
                        section_key: "section_play",
                        prompt: "Checklist follow-up for the first play item.",
                        question_type: "checklist",
                        required: false,
                        display_if: {
                            question_key: "q_1_1",
                            response_key: "provision",
                            any_of_option_keys: ["a_lot"],
                        },
                        notes_prompt: null,
                        scales: [],
                        options: [
                            {
                                key: "swing",
                                label: "Swing",
                                description: null,
                            },
                            {
                                key: "slide",
                                label: "Slide",
                                description: null,
                            },
                            {
                                key: "other",
                                label: "Other",
                                description: null,
                            },
                        ],
                    },
                ],
            },
        ],
        legal_documents: [],
    });
}

function buildScoreTotals() {
    return {
        provision_total: 2,
        provision_total_max: 2,
        variety_total: 0,
        variety_total_max: 2,
        challenge_total: 0,
        challenge_total_max: 0,
        sociability_total: 0,
        sociability_total_max: 0,
        play_value_total: 2,
        play_value_total_max: 4,
        usability_total: 0,
        usability_total_max: 0,
    };
}

function buildAuditSession() {
    const totals = buildScoreTotals();
    return auditSessionSchema.parse({
        audit_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        audit_code: "AUDIT-STATE-001",
        project_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        project_name: "Project Alpha",
        place_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        place_name: "Place One",
        place_type: "Public Playspace",
        allowed_execution_modes: ["audit"],
        selected_execution_mode: "audit",
        status: "SUBMITTED",
        instrument_key: "pvua-v-test",
        instrument_version: "5.2",
        started_at: "2026-05-01T12:00:00.000Z",
        submitted_at: "2026-05-01T12:30:00.000Z",
        total_minutes: 30,
        meta: {
            execution_mode: "audit",
            final_comments: null,
        },
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
            section_play: {
                section_key: "section_play",
                note: null,
                responses: {
                    q_1_1: {
                        provision: "a_lot",
                        variety: "not_applicable",
                    },
                    q_1_1_1: {
                        selected_option_keys: ["swing", "slide"],
                    },
                    q_1_2: {
                        provision: "no",
                    },
                },
            },
        },
        scores: {
            draft_progress_percent: 100,
            execution_mode: "audit",
            audit: totals,
            survey: null,
            overall: totals,
            by_section: {
                section_play: totals,
            },
            by_domain: {
                movement: totals,
            },
        },
        progress: {
            required_pre_audit_complete: true,
            visible_section_count: 1,
            completed_section_count: 1,
            total_visible_questions: 3,
            answered_visible_questions: 3,
            ready_to_submit: true,
            sections: [
                {
                    section_key: "section_play",
                    title: "Play",
                    visible_question_count: 3,
                    answered_question_count: 3,
                    is_complete: true,
                },
            ],
        },
    });
}

describe("report item states", () => {
    it("distinguishes explicit not-applicable answers from hidden follow-up scales", () => {
        const instrument = buildInstrument();
        const auditSession = buildAuditSession();

        const movementDomain = buildDomainReportRows(auditSession, instrument).find(
            (row) => row.domainKey === "movement",
        );

        expect(movementDomain).toBeDefined();
        const explicitNotApplicableRow = movementDomain?.questions.find((question) => question.questionKey === "q_1_1");
        const hiddenFollowUpRow = movementDomain?.questions.find((question) => question.questionKey === "q_1_2");

        expect(explicitNotApplicableRow?.varietyApplicable).toBe(true);
        expect(explicitNotApplicableRow?.varietyAnswered).toBe(true);
        expect(explicitNotApplicableRow?.varietyIsNotApplicable).toBe(true);
        expect(explicitNotApplicableRow?.followUpScalesAsked).toBe(true);

        expect(hiddenFollowUpRow?.varietyApplicable).toBe(true);
        expect(hiddenFollowUpRow?.varietyAnswered).toBe(false);
        expect(hiddenFollowUpRow?.varietyIsNotApplicable).toBe(false);
        expect(hiddenFollowUpRow?.followUpScalesAsked).toBe(false);
    });

    it("includes checklist follow-up rows that inherit the parent domain", () => {
        const instrument = buildInstrument();
        const auditSession = buildAuditSession();

        const movementDomain = buildDomainReportRows(auditSession, instrument).find(
            (row) => row.domainKey === "movement",
        );

        expect(movementDomain).toBeDefined();
        expect(movementDomain?.questions.map((question) => question.questionKey)).toContain("q_1_1_1");
    });
});
