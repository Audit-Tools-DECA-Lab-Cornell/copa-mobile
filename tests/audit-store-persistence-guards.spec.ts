import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProjectPlaceKey } from "lib/audit/pair-key";
import { auditSessionSchema, playspaceInstrumentSchema } from "lib/audit/types";
import { usePlayspaceAuditStore } from "stores/audit-store";

import type { AuditSyncStateByAuditId, DirtySections } from "lib/audit/types";

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
    }),
}));

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

const instrument = playspaceInstrumentSchema.parse({
    instrument_key: "pvua_v5_2",
    instrument_name: "PVUA",
    instrument_version: "5.2",
    current_sheet: "Sheet1",
    source_files: [],
    preamble: [],
    execution_modes: [
        { key: "audit", label: "Audit", description: null },
        { key: "survey", label: "Survey", description: null },
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
            final_comments: null,
        },
        aggregate: {
            schema_version: 1,
            revision: 3,
            meta: {
                execution_mode: "audit",
                final_comments: null,
            },
            pre_audit: emptyPreAudit,
            sections: {
                section_a: {
                    section_key: "section_a",
                    note: null,
                    responses: {},
                },
            },
        },
        pre_audit: emptyPreAudit,
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

function storageKeyFor(userId: string): string {
    return `audit.state.v4.${encodeURIComponent(userId)}`;
}

function seedPersistedBlob(
    userId: string,
    overrides: {
        dirtySections?: DirtySections;
        syncStateByAuditId?: AuditSyncStateByAuditId;
    } = {},
): string {
    const session = buildSession();
    const blob = JSON.stringify({
        storage_user_id: userId,
        instrument: null,
        sessions_by_audit_id: { [session.audit_id]: session },
        sessions_by_pair_key: { [getProjectPlaceKey(session.project_id, session.place_id)]: session },
        dirty_sections: overrides.dirtySections ?? {},
        dirty_pre_audit: {},
        dirty_meta: {},
        dirty_started_at: {},
        sync_state_by_audit_id: overrides.syncStateByAuditId ?? {},
        local_change_counter: 1,
        last_successful_sync_at: null,
    });
    mmkvData.set(storageKeyFor(userId), blob);
    return blob;
}

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";

describe("hydrate quarantine", () => {
    beforeEach(async () => {
        await usePlayspaceAuditStore.getState().detachStoredState();
        mmkvData.clear();
    });

    it("quarantines an unreadable snapshot instead of deleting it", async () => {
        const userId = "quarantine-user";
        const storageKey = storageKeyFor(userId);
        const raw = '{"sessions_by_audit_id": 42}';
        mmkvData.set(storageKey, raw);

        await usePlayspaceAuditStore.getState().hydrate(userId);

        expect(mmkvData.get(storageKey)).toBeUndefined();
        const quarantineKeys = [...mmkvData.keys()].filter((key) => key.startsWith(`${storageKey}.quarantine.`));
        expect(quarantineKeys).toHaveLength(1);
        expect(mmkvData.get(quarantineKeys[0] as string)).toBe(raw);
        expect(usePlayspaceAuditStore.getState().isHydrated).toBe(true);
    });
});

describe("sign-out guard", () => {
    beforeEach(async () => {
        await usePlayspaceAuditStore.getState().detachStoredState();
        mmkvData.clear();
    });

    it("reports un-synced work from the persisted snapshot without hydrating", () => {
        seedPersistedBlob("queued-user", {
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "queued_submit", detail: null, updated_at: "2026-06-11T00:00:00.000Z" },
            },
        });

        expect(usePlayspaceAuditStore.getState().hasUnsyncedAuditWork("queued-user")).toBe(true);
    });

    it("reports no un-synced work for a clean snapshot or a missing one", () => {
        seedPersistedBlob("clean-user", {
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "submitted", detail: null, updated_at: "2026-06-11T00:00:00.000Z" },
            },
        });

        expect(usePlayspaceAuditStore.getState().hasUnsyncedAuditWork("clean-user")).toBe(false);
        expect(usePlayspaceAuditStore.getState().hasUnsyncedAuditWork("never-seen-user")).toBe(false);
    });

    it("treats an unreadable snapshot as un-synced work", () => {
        mmkvData.set(storageKeyFor("broken-user"), "###corrupt###");

        expect(usePlayspaceAuditStore.getState().hasUnsyncedAuditWork("broken-user")).toBe(true);
    });

    it("keeps the snapshot across detach and still reports work after re-login", async () => {
        const userId = "field-auditor";
        seedPersistedBlob(userId, {
            dirtySections: { [AUDIT_ID]: { section_a: 2 } },
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "dirty", detail: null, updated_at: "2026-06-11T00:00:00.000Z" },
            },
        });

        await usePlayspaceAuditStore.getState().hydrate(userId);
        expect(usePlayspaceAuditStore.getState().hasUnsyncedAuditWork(userId)).toBe(true);

        await usePlayspaceAuditStore.getState().detachStoredState();
        expect(mmkvData.get(storageKeyFor(userId))).toBeDefined();
        expect(usePlayspaceAuditStore.getState().currentUserId).toBeNull();
        expect(usePlayspaceAuditStore.getState().hasUnsyncedAuditWork(userId)).toBe(true);

        await usePlayspaceAuditStore.getState().hydrate(userId);
        expect(usePlayspaceAuditStore.getState().hasUnsyncedAuditWork(userId)).toBe(true);
        await usePlayspaceAuditStore.getState().detachStoredState();
    });

    it("clearStoredState removes the snapshot for an account with no pending work", async () => {
        seedPersistedBlob("clean-logout-user", {
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "submitted", detail: null, updated_at: "2026-06-11T00:00:00.000Z" },
            },
        });

        await usePlayspaceAuditStore.getState().clearStoredState("clean-logout-user");
        expect(mmkvData.get(storageKeyFor("clean-logout-user"))).toBeUndefined();
    });
});
