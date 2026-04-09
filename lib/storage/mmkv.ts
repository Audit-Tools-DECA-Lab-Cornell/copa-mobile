import { createMMKV } from "react-native-mmkv";
import { setAtPath, internal } from "@legendapp/state";
import type {
    Change,
    ObservablePersistLocal,
    PersistMetadata,
    PersistOptionsLocal,
} from "@legendapp/state";
import { createModuleLogger } from "lib/logger";

const log = createModuleLogger("mmkv-storage");

/**
 * Shared MMKV storage instance for general-purpose app persistence
 * (preferences, audit state, etc.). Using a single instance with distinct
 * key prefixes keeps file overhead low on device.
 */
export const mmkvStorage = createMMKV({ id: "playspace.storage" });

const { safeParse, safeStringify } = internal;
const MetadataSuffix = "__m";

/**
 * Legend State local-persistence plugin for react-native-mmkv v4.
 *
 * The upstream ObservablePersistMMKV targets MMKV v3 (class constructor,
 * `storage.delete()`). MMKV v4 ships `createMMKV()` and `storage.remove()`.
 * This adapter bridges the two so Legend State's `persistObservable` works
 * transparently with the v4 API.
 */
export class ObservablePersistMMKV4 implements ObservablePersistLocal {
    private data: Record<string, unknown> = {};

    /** @inheritdoc */
    getTable<T = Record<string, unknown>>(
        table: string,
        _config: PersistOptionsLocal,
        init: object,
    ): T {
        if (this.data[table] === undefined) {
            try {
                const raw = mmkvStorage.getString(table);
                this.data[table] = raw === undefined ? init : safeParse(raw);
            } catch {
                log.withMetadata({ table: table }).error("failed to parse table from MMKV");
            }
        }
        return this.data[table] as T;
    }

    /** @inheritdoc */
    getMetadata(table: string, config: PersistOptionsLocal): PersistMetadata {
        return this.getTable(table + MetadataSuffix, config, {});
    }

    /** @inheritdoc */
    set(table: string, changes: Change[], _config: PersistOptionsLocal): void {
        if (this.data[table] === undefined || this.data[table] === null) {
            this.data[table] = {};
        }
        for (const change of changes) {
            const { path, valueAtPath, pathTypes } = change;
            this.data[table] = setAtPath(
                this.data[table] as Record<string, unknown>,
                path,
                pathTypes,
                valueAtPath,
            );
        }
        this.save(table);
    }

    /** @inheritdoc */
    setMetadata(table: string, metadata: PersistMetadata, _config: PersistOptionsLocal): void {
        this.data[table + MetadataSuffix] = metadata;
        this.save(table + MetadataSuffix);
    }

    /** @inheritdoc */
    deleteTable(table: string, _config: PersistOptionsLocal): void {
        delete this.data[table];
        mmkvStorage.remove(table);
    }

    /** @inheritdoc */
    deleteMetadata(table: string, config: PersistOptionsLocal): void {
        this.deleteTable(table + MetadataSuffix, config);
    }

    private save(table: string): void {
        const value = this.data[table];
        if (value === undefined) {
            mmkvStorage.remove(table);
            return;
        }
        try {
            mmkvStorage.set(table, safeStringify(value));
        } catch (err) {
            log.withError(err).error("failed to save table to MMKV");
        }
    }
}
