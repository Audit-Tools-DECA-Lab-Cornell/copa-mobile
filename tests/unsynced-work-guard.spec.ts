import { describe, expect, it } from "vitest";

import { quarantineUnreadableSnapshot, type KeyValueStorageLike } from "lib/audit/persistence-guards";
import { hasUnsyncedLocalAuditWork } from "lib/audit/store-sync-core";

import type { AuditSyncState } from "lib/audit/types";

function buildSyncState(phase: AuditSyncState["phase"]): AuditSyncState {
    return {
        phase,
        detail: null,
        updated_at: "2026-06-11T00:00:00.000Z",
    };
}

const emptyDirtyState = {
    dirtyMeta: {},
    dirtyPreAudit: {},
    dirtySections: {},
    dirtyStartedAt: {},
    syncStateByAuditId: {},
};

describe("hasUnsyncedLocalAuditWork", () => {
    it("reports no work when all dirty maps and sync states are empty", () => {
        expect(hasUnsyncedLocalAuditWork(emptyDirtyState)).toBe(false);
    });

    it("reports work for any dirty fragment", () => {
        expect(hasUnsyncedLocalAuditWork({ ...emptyDirtyState, dirtyMeta: { "audit-1": 1 } })).toBe(true);
        expect(hasUnsyncedLocalAuditWork({ ...emptyDirtyState, dirtyPreAudit: { "audit-1": 2 } })).toBe(true);
        expect(hasUnsyncedLocalAuditWork({ ...emptyDirtyState, dirtySections: { "audit-1": { section_a: 3 } } })).toBe(
            true,
        );
        expect(hasUnsyncedLocalAuditWork({ ...emptyDirtyState, dirtyStartedAt: { "audit-1": true } })).toBe(true);
    });

    it("ignores empty per-audit section maps and cleared started-at flags", () => {
        expect(hasUnsyncedLocalAuditWork({ ...emptyDirtyState, dirtySections: { "audit-1": {} } })).toBe(false);
        expect(hasUnsyncedLocalAuditWork({ ...emptyDirtyState, dirtyStartedAt: { "audit-1": false } })).toBe(false);
    });

    it("treats every phase except idle and submitted as un-synced work", () => {
        const unsyncedPhases: AuditSyncState["phase"][] = [
            "dirty",
            "saving",
            "conflict",
            "submitting",
            "resolving_submit",
            "blocked_network",
            "blocked_auth",
            "blocked_validation",
            "blocked_server",
            "queued_submit",
        ];
        for (const phase of unsyncedPhases) {
            expect(
                hasUnsyncedLocalAuditWork({
                    ...emptyDirtyState,
                    syncStateByAuditId: { "audit-1": buildSyncState(phase) },
                }),
            ).toBe(true);
        }

        expect(
            hasUnsyncedLocalAuditWork({
                ...emptyDirtyState,
                syncStateByAuditId: {
                    "audit-1": buildSyncState("idle"),
                    "audit-2": buildSyncState("submitted"),
                },
            }),
        ).toBe(false);
    });
});

function createFakeStorage(initial: Record<string, string> = {}): {
    storage: KeyValueStorageLike;
    entries: Map<string, string>;
} {
    const entries = new Map(Object.entries(initial));
    return {
        storage: {
            getString: (key) => entries.get(key),
            set: (key, value) => {
                entries.set(key, value);
            },
            remove: (key) => {
                entries.delete(key);
            },
        },
        entries,
    };
}

describe("quarantineUnreadableSnapshot", () => {
    it("copies the raw blob to a quarantine key before removing the primary key", () => {
        const { storage, entries } = createFakeStorage({ "audit.state.v4.user": "{broken" });

        const result = quarantineUnreadableSnapshot({
            storage,
            storageKey: "audit.state.v4.user",
            raw: "{broken",
            quarantinedAtIso: "2026-06-11T10:00:00.000Z",
        });

        expect(result.quarantined).toBe(true);
        expect(result.quarantineKey).toBe("audit.state.v4.user.quarantine.2026-06-11T10:00:00.000Z");
        expect(entries.get(result.quarantineKey)).toBe("{broken");
        expect(entries.has("audit.state.v4.user")).toBe(false);
    });

    it("keeps the primary key when the quarantine copy cannot be written", () => {
        const { storage, entries } = createFakeStorage({ "audit.state.v4.user": "{broken" });
        const failingStorage: KeyValueStorageLike = {
            ...storage,
            set: () => {
                throw new Error("storage full");
            },
        };

        const result = quarantineUnreadableSnapshot({
            storage: failingStorage,
            storageKey: "audit.state.v4.user",
            raw: "{broken",
            quarantinedAtIso: "2026-06-11T10:00:00.000Z",
        });

        expect(result.quarantined).toBe(false);
        expect(entries.get("audit.state.v4.user")).toBe("{broken");
    });
});
