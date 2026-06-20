import Constants from "expo-constants";
import { customEvent } from "vexo-analytics";
import { useEffect, useMemo, useState } from "react";

import { createModuleLogger } from "lib/logger";

export const TESTING_MIGRATION_EVENTS = {
    screenViewed: "migration_screen_viewed",
    primaryCtaTapped: "migration_primary_cta_tapped",
    secondaryCtaTapped: "migration_secondary_cta_tapped",
} as const;

export type BuildChannel = "development" | "preview" | "internal" | "closed" | "production";

interface ExpoTestingMigrationConfig {
    readonly buildChannel: BuildChannel;
    readonly deprecatedInternalBuild: boolean;
    readonly remoteConfigUrl: string | null;
    readonly closedTestUrl: string | null;
}

interface RemoteTestingMigrationConfig {
    readonly deprecatedInternalBuilds?: readonly string[];
    readonly deprecatedChannels?: readonly BuildChannel[];
    readonly closedTestUrl?: string;
    readonly blocked?: boolean;
}

interface TestingMigrationDecision {
    readonly shouldBlock: boolean;
    readonly closedTestUrl: string | null;
    readonly buildChannel: BuildChannel;
}

const log = createModuleLogger("testing-migration");
const BUILD_CHANNELS = new Set<BuildChannel>(["development", "preview", "internal", "closed", "production"]);
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function readExtraRecord(): Record<string, unknown> {
    const extra = Constants.expoConfig?.extra;
    return extra !== null && typeof extra === "object" ? extra : {};
}

function parseBuildChannel(value: unknown): BuildChannel {
    if (typeof value === "string" && BUILD_CHANNELS.has(value as BuildChannel)) {
        return value as BuildChannel;
    }

    return "development";
}

function parseBoolean(value: unknown): boolean {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        return TRUE_VALUES.has(value.trim().toLowerCase());
    }

    return false;
}

function parseOptionalUrl(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function parseStringArray(value: unknown): readonly string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return strings.length > 0 ? strings : undefined;
}

function parseChannelArray(value: unknown): readonly BuildChannel[] | undefined {
    const strings = parseStringArray(value);
    if (typeof strings === "undefined") {
        return undefined;
    }

    const channels = strings.filter((item): item is BuildChannel => BUILD_CHANNELS.has(item as BuildChannel));
    return channels.length > 0 ? channels : undefined;
}

function getRemoteConfig(rawConfig: unknown): RemoteTestingMigrationConfig | null {
    if (rawConfig === null || typeof rawConfig !== "object") {
        return null;
    }

    const record = rawConfig as Record<string, unknown>;
    const deprecatedInternalBuilds = parseStringArray(record.deprecatedInternalBuilds);
    const deprecatedChannels = parseChannelArray(record.deprecatedChannels);
    const closedTestUrl = parseOptionalUrl(record.closedTestUrl);

    return {
        ...(typeof deprecatedInternalBuilds !== "undefined" ? { deprecatedInternalBuilds } : {}),
        ...(typeof deprecatedChannels !== "undefined" ? { deprecatedChannels } : {}),
        ...(closedTestUrl !== null ? { closedTestUrl } : {}),
        ...(typeof record.blocked === "boolean" ? { blocked: record.blocked } : {}),
    };
}

export function getTestingMigrationConfig(): ExpoTestingMigrationConfig {
    const extra = readExtraRecord();
    const testingMigration =
        extra.testingMigration !== null && typeof extra.testingMigration === "object"
            ? (extra.testingMigration as Record<string, unknown>)
            : {};

    return {
        buildChannel: parseBuildChannel(extra.buildChannel),
        deprecatedInternalBuild: parseBoolean(testingMigration.deprecatedInternalBuild),
        remoteConfigUrl: parseOptionalUrl(testingMigration.remoteConfigUrl),
        closedTestUrl: parseOptionalUrl(testingMigration.closedTestUrl),
    };
}

function getAppVersion(): string | null {
    const version = Constants.expoConfig?.version;
    return typeof version === "string" && version.trim().length > 0 ? version : null;
}

function remoteConfigBlocksCurrentBuild(
    buildChannel: BuildChannel,
    appVersion: string | null,
    remoteConfig: RemoteTestingMigrationConfig | null,
): boolean {
    if (remoteConfig === null) {
        return false;
    }

    if (remoteConfig.blocked === true) {
        return true;
    }

    if (remoteConfig.deprecatedChannels?.includes(buildChannel) === true) {
        return true;
    }

    if (appVersion !== null && remoteConfig.deprecatedInternalBuilds?.includes(appVersion) === true) {
        return true;
    }

    return false;
}

function decideTestingMigrationGate(
    localConfig: ExpoTestingMigrationConfig,
    remoteConfig: RemoteTestingMigrationConfig | null,
): TestingMigrationDecision {
    const remoteClosedTestUrl = remoteConfig?.closedTestUrl;
    const closedTestUrl = typeof remoteClosedTestUrl === "string" ? remoteClosedTestUrl : localConfig.closedTestUrl;

    if (localConfig.buildChannel !== "internal") {
        return {
            shouldBlock: false,
            closedTestUrl,
            buildChannel: localConfig.buildChannel,
        };
    }

    const shouldBlock =
        localConfig.deprecatedInternalBuild ||
        remoteConfigBlocksCurrentBuild(localConfig.buildChannel, getAppVersion(), remoteConfig);

    return {
        shouldBlock,
        closedTestUrl,
        buildChannel: localConfig.buildChannel,
    };
}

async function fetchRemoteTestingMigrationConfig(
    remoteConfigUrl: string,
): Promise<RemoteTestingMigrationConfig | null> {
    const response = await fetch(remoteConfigUrl, {
        headers: { Accept: "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Testing migration config request failed with ${String(response.status)}`);
    }

    return getRemoteConfig(await response.json());
}

export function useTestingMigrationGate(): TestingMigrationDecision {
    const localConfig = useMemo(() => getTestingMigrationConfig(), []);
    const [remoteConfig, setRemoteConfig] = useState<RemoteTestingMigrationConfig | null>(null);

    useEffect(() => {
        if (localConfig.remoteConfigUrl === null) {
            return;
        }

        let isMounted = true;

        fetchRemoteTestingMigrationConfig(localConfig.remoteConfigUrl)
            .then((config) => {
                if (isMounted) {
                    setRemoteConfig(config);
                }
            })
            .catch((error: unknown) => {
                log.withError(error).warn("testing migration remote config fetch failed");
            });

        return () => {
            isMounted = false;
        };
    }, [localConfig.remoteConfigUrl]);

    return useMemo(() => decideTestingMigrationGate(localConfig, remoteConfig), [localConfig, remoteConfig]);
}

type TestingMigrationEventName = (typeof TESTING_MIGRATION_EVENTS)[keyof typeof TESTING_MIGRATION_EVENTS];

export function recordTestingMigrationEvent(eventName: TestingMigrationEventName): void {
    try {
        customEvent(eventName, { source: "testing_migration" });
    } catch (error: unknown) {
        log.withError(error).warn("testing migration analytics event failed");
    }

    log.withMetadata({ event: eventName }).info("testing migration telemetry event");
}
