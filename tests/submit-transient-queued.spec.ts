import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProjectPlaceKey } from "lib/audit/pair-key";
import { submitOutbox } from "lib/audit/outbox/outbox-storage";
import { auditSessionSchema, playspaceInstrumentSchema } from "lib/audit/types";
import type { AuthSession } from "lib/auth/types";
import { usePlayspaceAuditStore } from "stores/audit-store";

// Controls the status code that the mocked `submitAudit` throws, so a single
// suite can exercise both the transient (queued) and terminal (blocked) paths.
const apiCtrl = vi.hoisted(() => ({ submitStatus: 0 }));

const mmkvData = vi.hoisted(() => new Map<string, string>());

vi.mock("react-native-mmkv", () => ({
    createMMKV: () => ({
        getString: (key: string) => mmkvData.get(key),
        set: (key: string, value: string) => {
            mmkvData.set(key, value);
        },
        remove: (key: string) => {
            mmkvData.delete(key);
        },
        getAllKeys: () => [...mmkvData.keys()],
    }),
}));

// The device reports "online" so submit takes the live path (not the offline
// branch); the mocked `submitAudit` is what fails, mimicking a connected-but-
// unreachable network.
vi.mock("expo-network", () => ({
    getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
}));

vi.mock("lib/api-base-url", () => ({
    getApiBaseUrl: () => "http://127.0.0.1:8000",
}));

vi.mock("lib/i18n", () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
}));

vi.mock("lib/audit/bundled-instrument", () => ({
    getBundledInstrument: () => null,
}));

vi.mock("lib/services/instrument-sync", () => ({
    syncInstrument: async () => null,
}));

// Keep the real api module (PlayspaceAuditApiError, requestJson, etc.) but make
// the submit call fail with a configurable status code and stub the fire-and-
// forget beacons so the test never touches the network.
vi.mock("lib/audit/api", async (importOriginal) => {
    const actual = await importOriginal<typeof import("lib/audit/api")>();
    return {
        ...actual,
        submitAudit: vi.fn(async () => {
            throw new actual.PlayspaceAuditApiError("network unreachable", apiCtrl.submitStatus);
        }),
        recordSubmitIntentAsync: vi.fn(async () => undefined),
        notifySubmitFailureAsync: vi.fn(async () => undefined),
    };
});

const instrument = playspaceInstrumentSchema.parse({
    instrument_key: "pvua_v5_2",
    instrument_name: "PVUA",
    instrument_version: "5.2",
    current_sheet: "Sheet1",
    source_files: [],
    preamble: [],
    execution_modes: [{ key: "audit", label: "Audit", description: null }],
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

const USER_ID = "submitter-user";
const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const PLACE_ID = "33333333-3333-4333-8333-333333333333";

function buildSession() {
    return auditSessionSchema.parse({
        audit_id: AUDIT_ID,
        audit_code: "AUD-001",
        project_id: PROJECT_ID,
        project_name: "Project Alpha",
        place_id: PLACE_ID,
        place_name: "Place Alpha",
        place_type: "Public Playspace",
        allowed_execution_modes: ["audit"],
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
        meta: { execution_mode: "audit", final_comments: null },
        aggregate: {
            schema_version: 1,
            revision: 3,
            meta: { execution_mode: "audit", final_comments: null },
            pre_audit: emptyPreAudit,
            sections: { section_a: { section_key: "section_a", note: null, responses: {} } },
        },
        pre_audit: emptyPreAudit,
        sections: { section_a: { section_key: "section_a", note: null, responses: {} } },
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

function seedCleanAudit(): void {
    const session = buildSession();
    const blob = JSON.stringify({
        storage_user_id: USER_ID,
        instrument: null,
        sessions_by_audit_id: { [session.audit_id]: session },
        sessions_by_pair_key: { [getProjectPlaceKey(session.project_id, session.place_id)]: session },
        dirty_sections: {},
        dirty_pre_audit: {},
        dirty_meta: {},
        dirty_started_at: {},
        sync_state_by_audit_id: {},
        local_change_counter: 1,
        last_successful_sync_at: null,
    });
    mmkvData.set(`audit.state.v4.${encodeURIComponent(USER_ID)}`, blob);
}

const fakeSession = { user: { id: USER_ID } } as unknown as AuthSession;

describe("submit while connected-but-unreachable", () => {
    beforeEach(async () => {
        await usePlayspaceAuditStore.getState().detachStoredState();
        mmkvData.clear();
        submitOutbox.remove(USER_ID, AUDIT_ID);
        apiCtrl.submitStatus = 0;
    });

    it("keeps a transiently-failed submit queued instead of surfacing an error", async () => {
        apiCtrl.submitStatus = 0; // 0 = network/unreachable → retryable
        seedCleanAudit();
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        // The submit resolves (does not throw) with the still-in-progress session.
        const result = await usePlayspaceAuditStore.getState().submitAuditSession(fakeSession, AUDIT_ID);
        expect(result.status).toBe("IN_PROGRESS");

        const state = usePlayspaceAuditStore.getState();
        // Audit is parked as queued (locked, calm) - not a hard failure.
        expect(state.syncStateByAuditId[AUDIT_ID]?.phase).toBe("queued_submit");
        // No red error banner.
        expect(state.errorMessage).toBeNull();
        // The durable outbox op is retained for automatic delivery.
        expect(submitOutbox.get(USER_ID, AUDIT_ID)).not.toBeNull();
    });

    it("surfaces a terminal submit failure as a blocked state that throws", async () => {
        apiCtrl.submitStatus = 400; // 400 = validation → terminal, not retryable
        seedCleanAudit();
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        await expect(usePlayspaceAuditStore.getState().submitAuditSession(fakeSession, AUDIT_ID)).rejects.toBeDefined();

        const state = usePlayspaceAuditStore.getState();
        expect(state.syncStateByAuditId[AUDIT_ID]?.phase).toBe("blocked_validation");
        expect(state.errorMessage).not.toBeNull();
    });
});
