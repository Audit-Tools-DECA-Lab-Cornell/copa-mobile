import { createModuleLogger } from "lib/logger";

const log = createModuleLogger("audit-persistence-guards");

/**
 * Minimal synchronous key-value surface needed by the persistence guards.
 * Structurally matches the shared MMKV instance used by the audit store.
 */
export interface KeyValueStorageLike {
    getString(key: string): string | undefined;
    set(key: string, value: string): void;
    remove(key: string): void;
}

interface QuarantineUnreadableSnapshotArgs {
    readonly storage: KeyValueStorageLike;
    readonly storageKey: string;
    readonly raw: string;
    readonly quarantinedAtIso: string;
}

interface QuarantineUnreadableSnapshotResult {
    readonly quarantined: boolean;
    readonly quarantineKey: string;
}

/**
 * Preserve an unreadable persisted audit snapshot under a quarantine key
 * instead of deleting it.
 *
 * A validation failure on hydrate usually means a persisted-schema change
 * shipped without a matching data migration. The raw blob can be the only
 * copy of un-synced field work, so the primary key is removed only after the
 * quarantine copy is written successfully; when the copy fails, the original
 * key stays in place and the next launch retries.
 *
 * @param args Storage handle, primary key, raw blob, and quarantine timestamp.
 * @returns Whether the snapshot was quarantined and under which key.
 */
export function quarantineUnreadableSnapshot(
    args: QuarantineUnreadableSnapshotArgs,
): QuarantineUnreadableSnapshotResult {
    const quarantineKey = `${args.storageKey}.quarantine.${args.quarantinedAtIso}`;

    try {
        args.storage.set(quarantineKey, args.raw);
    } catch (error) {
        log.withError(error).error("failed to write quarantine copy; keeping original snapshot key");
        return { quarantined: false, quarantineKey };
    }

    args.storage.remove(args.storageKey);
    log.withMetadata({ storageKey: args.storageKey, quarantineKey }).error(
        "persisted audit state failed validation; raw snapshot quarantined for recovery",
    );
    return { quarantined: true, quarantineKey };
}
