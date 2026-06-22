/**
 * Unit tests for the `reopenQueuedSubmit` store action.
 *
 * The action is a race-guarded cancel: it only acts when the audit's current
 * sync phase is exactly `"queued_submit"`. It removes the durable outbox op
 * and transitions the phase to `"dirty"` (unsaved fragments present) or
 * `"idle"` (no fragments), then calls `saveNow`.
 *
 * The tests hydrate the store via the same MMKV-seed path used by
 * `audit-store-persistence-guards.spec.ts` so the mocking strategy is
 * identical.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProjectPlaceKey } from "lib/audit/pair-key";
import { createSubmitOp } from "lib/audit/outbox/outbox-core";
import { submitOutbox } from "lib/audit/outbox/outbox-storage";
import { auditSessionSchema, playspaceInstrumentSchema } from "lib/audit/types";
import { usePlayspaceAuditStore } from "stores/audit-store";

import type { AuditSyncStateByAuditId, DirtySections } from "lib/audit/types";

// ---------------------------------------------------------------------------
// Shared MMKV fake — same shape as the persistence-guards spec.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fixture data — minimal instrument + session builder.
// ---------------------------------------------------------------------------

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
        audit_id: AUDIT_ID,
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

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "test-auditor";

function storageKeyFor(userId: string): string {
    return `audit.state.v4.${encodeURIComponent(userId)}`;
}

function seedPersistedBlob(
    userId: string,
    overrides: {
        dirtySections?: DirtySections;
        dirtyMeta?: Record<string, number>;
        dirtyPreAudit?: Record<string, number>;
        syncStateByAuditId?: AuditSyncStateByAuditId;
    } = {},
): void {
    const session = buildSession();
    const blob = JSON.stringify({
        storage_user_id: userId,
        instrument: null,
        sessions_by_audit_id: { [session.audit_id]: session },
        sessions_by_pair_key: { [getProjectPlaceKey(session.project_id, session.place_id)]: session },
        dirty_sections: overrides.dirtySections ?? {},
        dirty_pre_audit: overrides.dirtyPreAudit ?? {},
        dirty_meta: overrides.dirtyMeta ?? {},
        dirty_started_at: {},
        sync_state_by_audit_id: overrides.syncStateByAuditId ?? {},
        local_change_counter: 1,
        last_successful_sync_at: null,
    });
    mmkvData.set(storageKeyFor(userId), blob);
}

// ---------------------------------------------------------------------------
// Helper: read the persisted phase back from MMKV (what saveNow wrote).
// ---------------------------------------------------------------------------

function readPersistedPhase(userId: string, auditId: string): string | null {
    const raw = mmkvData.get(storageKeyFor(userId));
    if (raw === undefined) return null;
    const parsed = JSON.parse(raw) as { sync_state_by_audit_id?: Record<string, { phase?: string }> };
    return parsed.sync_state_by_audit_id?.[auditId]?.phase ?? null;
}

function outboxHasOp(userId: string, auditId: string): boolean {
    return submitOutbox.get(userId, auditId) !== null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reopenQueuedSubmit — no-op when phase is not queued_submit", () => {
    beforeEach(async () => {
        await usePlayspaceAuditStore.getState().detachStoredState();
        mmkvData.clear();
    });

    // `restorePersistedSyncState` normalizes certain phases on hydrate before the
    // store's in-memory state is set. The seeded phase and the effective in-memory
    // phase can therefore differ; `reopenQueuedSubmit` reads the in-memory phase,
    // so the guard fires on the normalized value. These cases exercise all non-
    // `queued_submit` phases as they appear AFTER normalization:
    //
    // • "submitting" → normalized to "resolving_submit" on hydrate
    // • "submitted"  → normalized to null (dropped); no sync entry survives
    // • "idle"       → passes through unchanged
    // • "dirty"      → passes through when fragments exist; null when none
    //
    // In each case: reopenQueuedSubmit must be a no-op (outbox op untouched).

    it("no-ops when seeded phase is 'submitting' (normalizes to 'resolving_submit' on hydrate)", async () => {
        seedPersistedBlob(USER_ID, {
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "submitting", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(true);
        // After hydrate the phase is "resolving_submit" — not queued_submit, so
        // reopenQueuedSubmit is a no-op and the persisted phase stays as-is.
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBe("resolving_submit");

        await usePlayspaceAuditStore.getState().detachStoredState();
        submitOutbox.remove(USER_ID, AUDIT_ID);
    });

    it("no-ops when seeded phase is 'submitted' (normalized to null/dropped on hydrate)", async () => {
        // "submitted" normalizes to null via normalizeHydratedSyncPhase, so after
        // hydrate there is no sync entry for this audit. The in-memory phase read
        // by the guard is undefined → not queued_submit → no-op.
        seedPersistedBlob(USER_ID, {
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "submitted", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(true);
        // "submitted" is dropped on hydrate — no sync entry persisted.
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBeNull();

        await usePlayspaceAuditStore.getState().detachStoredState();
        submitOutbox.remove(USER_ID, AUDIT_ID);
    });

    it("no-ops when phase is 'idle'", async () => {
        seedPersistedBlob(USER_ID, {
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "idle", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(true);
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBe("idle");

        await usePlayspaceAuditStore.getState().detachStoredState();
        submitOutbox.remove(USER_ID, AUDIT_ID);
    });

    it("no-ops when phase is 'dirty' (with dirty fragments present)", async () => {
        // "dirty" with fragments survives hydrate as "dirty".
        seedPersistedBlob(USER_ID, {
            dirtySections: { [AUDIT_ID]: { section_a: 1 } },
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "dirty", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(true);
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBe("dirty");

        await usePlayspaceAuditStore.getState().detachStoredState();
        submitOutbox.remove(USER_ID, AUDIT_ID);
    });

    it("no-ops when there is no sync state entry for the audit (implicitly idle)", async () => {
        // No sync state entry — effective phase is idle (or dirty if fragments
        // exist, but we seed none here, so effective phase is idle).
        seedPersistedBlob(USER_ID, { syncStateByAuditId: {} });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(true);
        // No sync state entry exists (seeded empty map, hydrate drops nothing).
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBeNull();

        await usePlayspaceAuditStore.getState().detachStoredState();
        submitOutbox.remove(USER_ID, AUDIT_ID);
    });
});

describe("reopenQueuedSubmit — transitions from queued_submit with dirty fragments", () => {
    beforeEach(async () => {
        await usePlayspaceAuditStore.getState().detachStoredState();
        mmkvData.clear();
    });

    it("removes the outbox op and transitions to 'dirty' when dirty sections remain", async () => {
        seedPersistedBlob(USER_ID, {
            dirtySections: { [AUDIT_ID]: { section_a: 2 } },
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "queued_submit", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(false);
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBe("dirty");

        await usePlayspaceAuditStore.getState().detachStoredState();
    });

    it("removes the outbox op and transitions to 'dirty' when dirty meta remains", async () => {
        seedPersistedBlob(USER_ID, {
            dirtyMeta: { [AUDIT_ID]: 5 },
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "queued_submit", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(false);
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBe("dirty");

        await usePlayspaceAuditStore.getState().detachStoredState();
    });

    it("removes the outbox op and transitions to 'dirty' when dirty pre-audit remains", async () => {
        seedPersistedBlob(USER_ID, {
            dirtyPreAudit: { [AUDIT_ID]: 3 },
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "queued_submit", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(false);
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBe("dirty");

        await usePlayspaceAuditStore.getState().detachStoredState();
    });
});

describe("reopenQueuedSubmit — transitions from queued_submit with no dirty fragments", () => {
    beforeEach(async () => {
        await usePlayspaceAuditStore.getState().detachStoredState();
        mmkvData.clear();
    });

    it("removes the outbox op and transitions to 'idle' when no dirty fragments exist", async () => {
        // Typical clean offline submit: answers flushed before submit, so no
        // dirty sections/meta/pre-audit remain in the persisted blob.
        seedPersistedBlob(USER_ID, {
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "queued_submit", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(false);
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBe("idle");

        await usePlayspaceAuditStore.getState().detachStoredState();
    });

    it("removes the outbox op and transitions to 'idle' when dirty sections map is empty", async () => {
        // dirtySections has an entry for the audit but with zero section keys
        // — `hasDirtyFragmentsForAudit` treats this as no dirty fragments.
        seedPersistedBlob(USER_ID, {
            dirtySections: { [AUDIT_ID]: {} },
            syncStateByAuditId: {
                [AUDIT_ID]: { phase: "queued_submit", detail: null, updated_at: "2026-06-21T00:00:00.000Z" },
            },
        });
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));
        await usePlayspaceAuditStore.getState().hydrate(USER_ID);

        usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);

        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(false);
        expect(readPersistedPhase(USER_ID, AUDIT_ID)).toBe("idle");

        await usePlayspaceAuditStore.getState().detachStoredState();
    });
});

describe("reopenQueuedSubmit — no-op when no user is signed in", () => {
    beforeEach(async () => {
        await usePlayspaceAuditStore.getState().detachStoredState();
        mmkvData.clear();
    });

    it("does not throw and leaves the outbox untouched when currentUserId is null", () => {
        // No hydrate call — currentUserId remains null.
        // Seed an op so we can verify it is not removed.
        submitOutbox.put(USER_ID, createSubmitOp(AUDIT_ID, "2026-06-21T00:00:00.000Z"));

        // Phase is undefined (no in-memory state), so the guard fires and
        // reopenQueuedSubmit returns without touching the outbox.
        expect(() => {
            usePlayspaceAuditStore.getState().reopenQueuedSubmit(AUDIT_ID);
        }).not.toThrow();

        // The outbox op planted for USER_ID is still there.
        expect(outboxHasOp(USER_ID, AUDIT_ID)).toBe(true);

        submitOutbox.remove(USER_ID, AUDIT_ID);
    });
});
