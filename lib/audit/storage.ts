import { requireOptionalNativeModule } from "expo-modules-core";
import { persistedAuditStateSchema, type PersistedAuditState } from "lib/audit/types";

const AUDIT_STATE_STORAGE_KEY = "playspace.audit.state.v1";
const AUDIT_STATE_INDEX_KEY = `${AUDIT_STATE_STORAGE_KEY}.index`;
const AUDIT_STATE_PART_PREFIX = `${AUDIT_STATE_STORAGE_KEY}.part.`;
const SECURE_STORE_CHUNK_SIZE = 1500;

let inMemoryAuditState: string | null = null;
let secureStoreApiCache: SecureStoreApi | null | undefined;

interface SecureStoreApi {
    readonly setItemAsync: (key: string, value: string) => Promise<void>;
    readonly getItemAsync: (key: string) => Promise<string | null>;
    readonly deleteItemAsync: (key: string) => Promise<void>;
    readonly isAvailableAsync?: () => Promise<boolean>;
}

type SetValueWithKeyAsyncFunction = (
    value: string,
    key: string,
    options?: Record<string, unknown>,
) => Promise<void>;
type GetValueWithKeyAsyncFunction = (
    key: string,
    options?: Record<string, unknown>,
) => Promise<string | null>;
type DeleteValueWithKeyAsyncFunction = (
    key: string,
    options?: Record<string, unknown>,
) => Promise<void>;

/**
 * Persist the latest instrument and audit sessions for offline use.
 *
 * @param state Validated persisted audit state.
 */
export async function savePersistedAuditState(state: PersistedAuditState): Promise<void> {
    const serializedState = JSON.stringify(state);
    const localStorageApi = resolveLocalStorageApi();
    if (localStorageApi !== null) {
        localStorageApi.setItem(AUDIT_STATE_STORAGE_KEY, serializedState);
        inMemoryAuditState = serializedState;
        return;
    }

    const secureStoreApi = await resolveSecureStoreApi();
    if (secureStoreApi === null) {
        inMemoryAuditState = serializedState;
        return;
    }

    try {
        await saveChunkedSecureStoreValue(secureStoreApi, serializedState);
    } catch {
        inMemoryAuditState = serializedState;
    }
}

/**
 * Read and validate the last persisted audit state snapshot.
 *
 * @returns Stored audit state when valid, otherwise null.
 */
export async function readPersistedAuditState(): Promise<PersistedAuditState | null> {
    const localStorageApi = resolveLocalStorageApi();
    let rawValue: string | null = null;

    if (localStorageApi !== null) {
        rawValue = localStorageApi.getItem(AUDIT_STATE_STORAGE_KEY);
    } else {
        const secureStoreApi = await resolveSecureStoreApi();
        if (secureStoreApi !== null) {
            try {
                rawValue = await readChunkedSecureStoreValue(secureStoreApi);
            } catch {
                rawValue = inMemoryAuditState;
            }
        } else {
            rawValue = inMemoryAuditState;
        }
    }

    if (rawValue === null) {
        return null;
    }

    try {
        const parsedValue: unknown = JSON.parse(rawValue);
        const parsedState = persistedAuditStateSchema.safeParse(parsedValue);
        if (!parsedState.success) {
            await clearPersistedAuditState();
            return null;
        }

        return parsedState.data;
    } catch {
        await clearPersistedAuditState();
        return null;
    }
}

/**
 * Clear any persisted offline audit state.
 */
export async function clearPersistedAuditState(): Promise<void> {
    inMemoryAuditState = null;

    const localStorageApi = resolveLocalStorageApi();
    if (localStorageApi !== null) {
        localStorageApi.removeItem(AUDIT_STATE_STORAGE_KEY);
        return;
    }

    const secureStoreApi = await resolveSecureStoreApi();
    if (secureStoreApi === null) {
        return;
    }

    try {
        const existingIndexValue = await secureStoreApi.getItemAsync(AUDIT_STATE_INDEX_KEY);
        const partCount = parseChunkCount(existingIndexValue);
        for (let index = 0; index < partCount; index += 1) {
            await secureStoreApi.deleteItemAsync(`${AUDIT_STATE_PART_PREFIX}${index}`);
        }
        await secureStoreApi.deleteItemAsync(AUDIT_STATE_INDEX_KEY);
    } catch {
        // Ignore cleanup failures for optional offline storage.
    }
}

/**
 * Resolve browser localStorage when available.
 *
 * @returns Local storage API on supported runtimes, otherwise null.
 */
function resolveLocalStorageApi(): Storage | null {
    if (typeof globalThis.localStorage === "undefined") {
        return null;
    }

    return globalThis.localStorage;
}

/**
 * Persist a large serialized payload across multiple secure-store keys.
 *
 * @param secureStoreApi Normalized secure-store API.
 * @param serializedState JSON payload to persist.
 */
async function saveChunkedSecureStoreValue(
    secureStoreApi: SecureStoreApi,
    serializedState: string,
): Promise<void> {
    const previousIndexValue = await secureStoreApi.getItemAsync(AUDIT_STATE_INDEX_KEY);
    const previousPartCount = parseChunkCount(previousIndexValue);

    const nextParts: string[] = [];
    for (let offset = 0; offset < serializedState.length; offset += SECURE_STORE_CHUNK_SIZE) {
        nextParts.push(serializedState.slice(offset, offset + SECURE_STORE_CHUNK_SIZE));
    }

    for (let index = 0; index < nextParts.length; index += 1) {
        const partValue = nextParts[index];
        if (partValue === undefined) {
            continue;
        }
        await secureStoreApi.setItemAsync(`${AUDIT_STATE_PART_PREFIX}${index}`, partValue);
    }

    for (let index = nextParts.length; index < previousPartCount; index += 1) {
        await secureStoreApi.deleteItemAsync(`${AUDIT_STATE_PART_PREFIX}${index}`);
    }

    await secureStoreApi.setItemAsync(AUDIT_STATE_INDEX_KEY, String(nextParts.length));
    inMemoryAuditState = serializedState;
}

/**
 * Read a chunked serialized payload from secure-store.
 *
 * @param secureStoreApi Normalized secure-store API.
 * @returns Reassembled JSON string when present, otherwise null.
 */
async function readChunkedSecureStoreValue(secureStoreApi: SecureStoreApi): Promise<string | null> {
    const indexValue = await secureStoreApi.getItemAsync(AUDIT_STATE_INDEX_KEY);
    const partCount = parseChunkCount(indexValue);
    if (partCount <= 0) {
        return inMemoryAuditState;
    }

    const parts: string[] = [];
    for (let index = 0; index < partCount; index += 1) {
        const partValue = await secureStoreApi.getItemAsync(`${AUDIT_STATE_PART_PREFIX}${index}`);
        if (partValue === null) {
            return inMemoryAuditState;
        }
        parts.push(partValue);
    }

    const reassembledValue = parts.join("");
    inMemoryAuditState = reassembledValue;
    return reassembledValue;
}

/**
 * Parse a stored chunk-count string safely.
 *
 * @param value Raw stored count.
 * @returns Non-negative integer chunk count.
 */
function parseChunkCount(value: string | null): number {
    if (value === null) {
        return 0;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return 0;
    }
    return parsedValue;
}

/**
 * Resolve secure-store safely for native runtimes.
 *
 * @returns Normalized secure-store API when available.
 */
async function resolveSecureStoreApi(): Promise<SecureStoreApi | null> {
    if (secureStoreApiCache !== undefined) {
        return secureStoreApiCache;
    }

    try {
        const optionalNativeModule: unknown = requireOptionalNativeModule("ExpoSecureStore");
        const resolvedApi = toSecureStoreApi(optionalNativeModule);
        if (resolvedApi === null) {
            secureStoreApiCache = null;
            return null;
        }

        const isAvailable = resolvedApi.isAvailableAsync
            ? await resolvedApi.isAvailableAsync()
            : true;
        secureStoreApiCache = isAvailable ? resolvedApi : null;
        return secureStoreApiCache;
    } catch {
        secureStoreApiCache = null;
        return null;
    }
}

/**
 * Validate imported secure-store module shape.
 *
 * @param value Unknown imported module.
 * @returns True when the required methods are present.
 */
function isSecureStoreApi(value: unknown): value is SecureStoreApi {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.setItemAsync === "function" &&
        typeof value.getItemAsync === "function" &&
        typeof value.deleteItemAsync === "function"
    );
}

/**
 * Normalize optional secure-store modules across Expo runtimes.
 *
 * @param value Unknown optional native module.
 * @returns Normalized API or null when unavailable.
 */
function toSecureStoreApi(value: unknown): SecureStoreApi | null {
    if (!isRecord(value)) {
        return null;
    }

    if (isSecureStoreApi(value)) {
        return value;
    }

    const setValueWithKeyAsync = toSetValueWithKeyAsyncFunction(value.setValueWithKeyAsync);
    const getValueWithKeyAsync = toGetValueWithKeyAsyncFunction(value.getValueWithKeyAsync);
    const deleteValueWithKeyAsync = toDeleteValueWithKeyAsyncFunction(
        value.deleteValueWithKeyAsync,
    );
    if (
        setValueWithKeyAsync === null ||
        getValueWithKeyAsync === null ||
        deleteValueWithKeyAsync === null
    ) {
        return null;
    }

    const isAvailableAsync = toIsAvailableAsyncFunction(value.isAvailableAsync);
    return {
        setItemAsync: async (key: string, storedValue: string) => {
            await setValueWithKeyAsync(storedValue, key);
        },
        getItemAsync: async (key: string) => {
            return await getValueWithKeyAsync(key);
        },
        deleteItemAsync: async (key: string) => {
            await deleteValueWithKeyAsync(key);
        },
        ...(isAvailableAsync !== null ? { isAvailableAsync } : {}),
    };
}

/**
 * Check that an unknown value is a non-null object map.
 *
 * @param value Unknown value.
 * @returns True when the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * Coerce unknown values to the legacy secure-store setter signature.
 *
 * @param value Unknown function value.
 * @returns Typed function or null.
 */
function toSetValueWithKeyAsyncFunction(value: unknown): SetValueWithKeyAsyncFunction | null {
    return typeof value === "function" ? (value as SetValueWithKeyAsyncFunction) : null;
}

/**
 * Coerce unknown values to the legacy secure-store getter signature.
 *
 * @param value Unknown function value.
 * @returns Typed function or null.
 */
function toGetValueWithKeyAsyncFunction(value: unknown): GetValueWithKeyAsyncFunction | null {
    return typeof value === "function" ? (value as GetValueWithKeyAsyncFunction) : null;
}

/**
 * Coerce unknown values to the legacy secure-store delete signature.
 *
 * @param value Unknown function value.
 * @returns Typed function or null.
 */
function toDeleteValueWithKeyAsyncFunction(value: unknown): DeleteValueWithKeyAsyncFunction | null {
    return typeof value === "function" ? (value as DeleteValueWithKeyAsyncFunction) : null;
}

/**
 * Coerce unknown values to the secure-store availability check signature.
 *
 * @param value Unknown function value.
 * @returns Typed function or null.
 */
function toIsAvailableAsyncFunction(value: unknown): (() => Promise<boolean>) | null {
    return typeof value === "function" ? (value as () => Promise<boolean>) : null;
}
