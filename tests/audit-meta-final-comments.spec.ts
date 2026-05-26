import { describe, expect, it } from "vitest";

import {
    applyFetchedSessionSnapshot,
    applyLocalAuditStartChange,
    applyLocalExecutionModeChange,
    buildDraftPatchSnapshot,
} from "lib/audit/store-sync-core";
import { auditSessionSchema, playspaceInstrumentSchema } from "lib/audit/types";

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
        {
            key: "survey",
            label: "Survey",
            description: null,
        },
    ],
    pre_audit_questions: [],
    scale_guidance: [],
    sections: [
        {
            section_key: "section_a",
            title: "Section A",
            description: null,
            instruction: "Read each statement.",
            notes_prompt: null,
            questions: [],
        },
    ],
    legal_documents: [],
});

function buildSession() {
    return auditSessionSchema.parse({
        audit_id: "11111111-1111-4111-8111-111111111111",
        audit_code: "AUD-001",
        project_id: "22222222-2222-4222-8222-222222222222",
        project_name: "Project Alpha",
        place_id: "33333333-3333-4333-8333-333333333333",
        place_name: "Place Alpha",
        place_type: "Public Playspace",
        allowed_execution_modes: ["audit", "survey"],
        selected_execution_mode: "audit",
        status: "IN_PROGRESS",
        instrument_key: "pvua_v5_2",
        instrument_version: "5.2",
        instrument,
        schema_version: 1,
        revision: 3,
        started_at: "2026-05-01T12:00:00.000Z",
        submitted_at: null,
        total_minutes: null,
        meta: {
            execution_mode: "audit",
            final_comments: "Watch drainage near the north entry after heavy rain.",
        },
        aggregate: {
            schema_version: 1,
            revision: 3,
            meta: {
                execution_mode: "audit",
                final_comments: "Watch drainage near the north entry after heavy rain.",
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
                section_a: {
                    section_key: "section_a",
                    note: null,
                    responses: {},
                },
            },
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
            section_a: {
                section_key: "section_a",
                note: null,
                responses: {},
            },
        },
        scores: {
            draft_progress_percent: 100,
            execution_mode: "audit",
            audit: null,
            survey: null,
            overall: null,
            by_section: {},
            by_domain: {},
        },
        progress: {
            required_pre_audit_complete: true,
            visible_section_count: 1,
            completed_section_count: 1,
            total_visible_questions: 0,
            answered_visible_questions: 0,
            ready_to_submit: true,
            sections: [
                {
                    section_key: "section_a",
                    title: "Section A",
                    visible_question_count: 0,
                    answered_question_count: 0,
                    is_complete: true,
                },
            ],
        },
    });
}

function buildPristineSession() {
    const session = buildSession();
    return auditSessionSchema.parse({
        ...session,
        selected_execution_mode: null,
        meta: {
            execution_mode: null,
            final_comments: null,
        },
        aggregate: {
            ...session.aggregate,
            meta: {
                execution_mode: null,
                final_comments: null,
            },
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
            section_a: {
                section_key: "section_a",
                note: null,
                responses: {},
            },
        },
        scores: {
            ...session.scores,
            draft_progress_percent: 0,
            execution_mode: null,
        },
        progress: {
            ...session.progress,
            required_pre_audit_complete: false,
            answered_visible_questions: 0,
            ready_to_submit: false,
        },
    });
}

describe("audit meta final comments", () => {
    it("includes final comments in dirty meta draft patches", () => {
        const session = buildSession();

        const snapshot = buildDraftPatchSnapshot({
            auditId: session.audit_id,
            session,
            dirtyMeta: { [session.audit_id]: 4 },
            dirtyPreAudit: {},
            dirtySections: {},
            dirtyStartedAt: {},
        });

        expect(snapshot?.patch.meta).toEqual({
            execution_mode: "audit",
            final_comments: "Watch drainage near the north entry after heavy rain.",
        });
    });

    it("preserves final comments when execution mode changes locally", () => {
        const session = buildSession();

        const result = applyLocalExecutionModeChange({
            session,
            executionMode: "survey",
            nextVersion: 4,
            dirtyMeta: {},
        });

        expect(result.didChange).toBe(true);
        expect(result.session.meta.final_comments).toBe("Watch drainage near the north entry after heavy rain.");
        expect(result.session.aggregate.meta.final_comments).toBe(
            "Watch drainage near the north entry after heavy rain.",
        );
    });

    it("stamps the local start time when a pristine audit is first opened", () => {
        const session = buildPristineSession();

        const result = applyLocalAuditStartChange({
            session,
            startedAt: "2026-05-10T08:30:00.000Z",
            dirtyStartedAt: {},
        });

        expect(result.didChange).toBe(true);
        expect(result.session.started_at).toBe("2026-05-10T08:30:00.000Z");
    });

    it("does not restamp the local start time after setup has begun", () => {
        const session = buildSession();

        const result = applyLocalAuditStartChange({
            session,
            startedAt: "2026-05-10T08:30:00.000Z",
            dirtyStartedAt: {},
        });

        expect(result.didChange).toBe(false);
        expect(result.session.started_at).toBe("2026-05-01T12:00:00.000Z");
    });

    it("preserves a later local start time across server refreshes", () => {
        const currentSession = auditSessionSchema.parse({
            ...buildPristineSession(),
            started_at: "2026-05-10T08:30:00.000Z",
        });
        const fetchedSession = auditSessionSchema.parse({
            ...buildPristineSession(),
            revision: 4,
            aggregate: {
                ...buildPristineSession().aggregate,
                revision: 4,
            },
            started_at: "2026-05-01T12:00:00.000Z",
        });

        const result = applyFetchedSessionSnapshot({
            currentSession,
            fetchedSession,
            dirtyMeta: {},
            dirtyPreAudit: {},
            dirtySections: {},
            dirtyStartedAt: {},
        });

        expect(result.session.started_at).toBe("2026-05-10T08:30:00.000Z");
    });

    it("flags dirty_started_at when a pristine audit is stamped locally", () => {
        const session = buildPristineSession();

        const result = applyLocalAuditStartChange({
            session,
            startedAt: "2026-05-10T08:30:00.000Z",
            dirtyStartedAt: {},
        });

        expect(result.didChange).toBe(true);
        expect(result.dirtyStartedAt[session.audit_id]).toBe(true);
    });

    it("emits started_at in the draft patch snapshot when only the started_at flag is dirty", () => {
        const session = auditSessionSchema.parse({
            ...buildPristineSession(),
            started_at: "2026-05-10T08:30:00.000Z",
        });

        const snapshot = buildDraftPatchSnapshot({
            auditId: session.audit_id,
            session,
            dirtyMeta: {},
            dirtyPreAudit: {},
            dirtySections: {},
            dirtyStartedAt: { [session.audit_id]: true },
        });

        expect(snapshot).not.toBeNull();
        expect(snapshot?.startedAtFlagged).toBe(true);
        expect(snapshot?.patch.started_at).toBe("2026-05-10T08:30:00.000Z");
        expect(snapshot?.patch.meta).toBeUndefined();
        expect(snapshot?.patch.pre_audit).toBeUndefined();
        expect(snapshot?.patch.sections).toEqual({});
    });

    it("omits started_at from the draft patch snapshot when the flag is not set", () => {
        const session = buildSession();

        const snapshot = buildDraftPatchSnapshot({
            auditId: session.audit_id,
            session,
            dirtyMeta: { [session.audit_id]: 7 },
            dirtyPreAudit: {},
            dirtySections: {},
            dirtyStartedAt: {},
        });

        expect(snapshot).not.toBeNull();
        expect(snapshot?.startedAtFlagged).toBe(false);
        expect(snapshot?.patch.started_at).toBeUndefined();
    });
});
