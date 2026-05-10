import { describe, expect, it } from "vitest";

import { COMMENT_ROW_SENTINEL } from "lib/audit/export-types";
import { buildSingleAuditResponseRows } from "lib/audit/export-row-builders";
import { auditSessionSchema, playspaceInstrumentSchema } from "lib/audit/types";

describe("audit export row builders", () => {
    it("emits a question comment row when a response stores question_note", () => {
        const instrument = playspaceInstrumentSchema.parse({
            instrument_key: "pvua_v5_2",
            instrument_name: "PVUA",
            instrument_version: "5.2",
            current_sheet: "Sheet1",
            source_files: [],
            preamble: [],
            execution_modes: [
                {
                    key: "audit",
                    label: "Audit",
                    description: null,
                },
            ],
            pre_audit_questions: [],
            scale_guidance: [],
            sections: [
                {
                    section_key: "section_13_natural_play_features",
                    title: "Natural Play Features",
                    description: null,
                    instruction: "Read each statement.",
                    notes_prompt: null,
                    questions: [
                        {
                            question_key: "q_13_1",
                            mode: "audit",
                            constructs: ["play_value"],
                            domains: ["Natural Play Features"],
                            section_key: "section_13_natural_play_features",
                            prompt: "This playspace has climbable vegetation.",
                            question_type: "scaled",
                            required: true,
                            display_if: null,
                            notes_prompt: "Any comments?",
                            options: [],
                            scales: [
                                {
                                    key: "provision",
                                    title: "Provision",
                                    prompt: "How much is provided?",
                                    options: [
                                        {
                                            key: "a_lot",
                                            label: "A lot",
                                            addition_value: 2,
                                            boost_value: 2,
                                            allows_follow_up_scales: true,
                                            is_not_applicable: false,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            legal_documents: [],
        });

        const auditSession = auditSessionSchema.parse({
            audit_id: "11111111-1111-4111-8111-111111111111",
            audit_code: "AUD-001",
            project_id: "22222222-2222-4222-8222-222222222222",
            project_name: "Project Alpha",
            place_id: "33333333-3333-4333-8333-333333333333",
            place_name: "Place Alpha",
            place_type: "Public Playspace",
            allowed_execution_modes: ["audit"],
            selected_execution_mode: "audit",
            status: "SUBMITTED",
            instrument_key: "pvua_v5_2",
            instrument_version: "5.2",
            instrument,
            schema_version: 1,
            revision: 3,
            started_at: "2026-05-01T12:00:00.000Z",
            submitted_at: "2026-05-01T12:30:00.000Z",
            total_minutes: 30,
            meta: {
                execution_mode: "audit",
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
                section_13_natural_play_features: {
                    section_key: "section_13_natural_play_features",
                    note: null,
                    responses: {
                        q_13_1: {
                            provision: "a_lot",
                            question_note: "Add more accessible branches for climbing.",
                        },
                    },
                },
            },
            scores: {
                draft_progress_percent: 100,
                execution_mode: "audit",
                audit: {
                    provision_total: 2,
                    provision_total_max: 2,
                    diversity_total: 0,
                    diversity_total_max: 0,
                    challenge_total: 0,
                    challenge_total_max: 0,
                    sociability_total: 0,
                    sociability_total_max: 0,
                    play_value_total: 2,
                    play_value_total_max: 2,
                    usability_total: 0,
                    usability_total_max: 0,
                },
                survey: null,
                overall: {
                    provision_total: 2,
                    provision_total_max: 2,
                    diversity_total: 0,
                    diversity_total_max: 0,
                    challenge_total: 0,
                    challenge_total_max: 0,
                    sociability_total: 0,
                    sociability_total_max: 0,
                    play_value_total: 2,
                    play_value_total_max: 2,
                    usability_total: 0,
                    usability_total_max: 0,
                },
                by_section: {
                    section_13_natural_play_features: {
                        provision_total: 2,
                        provision_total_max: 2,
                        diversity_total: 0,
                        diversity_total_max: 0,
                        challenge_total: 0,
                        challenge_total_max: 0,
                        sociability_total: 0,
                        sociability_total_max: 0,
                        play_value_total: 2,
                        play_value_total_max: 2,
                        usability_total: 0,
                        usability_total_max: 0,
                    },
                },
                by_domain: {
                    natural_play_features: {
                        provision_total: 2,
                        provision_total_max: 2,
                        diversity_total: 0,
                        diversity_total_max: 0,
                        challenge_total: 0,
                        challenge_total_max: 0,
                        sociability_total: 0,
                        sociability_total_max: 0,
                        play_value_total: 2,
                        play_value_total_max: 2,
                        usability_total: 0,
                        usability_total_max: 0,
                    },
                },
            },
            progress: {
                required_pre_audit_complete: true,
                visible_section_count: 1,
                completed_section_count: 1,
                total_visible_questions: 1,
                answered_visible_questions: 1,
                ready_to_submit: true,
                sections: [
                    {
                        section_key: "section_13_natural_play_features",
                        title: "Natural Play Features",
                        visible_question_count: 1,
                        answered_question_count: 1,
                        is_complete: true,
                    },
                ],
            },
        });

        const rows = buildSingleAuditResponseRows(
            {
                auditSession,
                context: null,
                auditorProfile: null,
            },
            instrument,
        );

        expect(rows).toEqual(
            expect.arrayContaining([
                [
                    "13.1",
                    COMMENT_ROW_SENTINEL,
                    "",
                    "",
                    "",
                    "",
                    "Add more accessible branches for climbing.",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ],
            ]),
        );
    });
});
