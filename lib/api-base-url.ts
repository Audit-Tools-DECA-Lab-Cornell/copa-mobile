import { NativeModules } from "react-native";

const DEFAULT_API_PORT = "8000";
const DEFAULT_API_BASE_URL = `http://127.0.0.1:${DEFAULT_API_PORT}`;

interface BundleLocation {
    readonly protocol: string;
    readonly hostname: string;
    readonly port: string;
}

/**
 * Resolve the backend base URL for local mobile development.
 *
 * This prefers an explicit `EXPO_PUBLIC_API_BASE_URL`, but when that value
 * points to loopback from a device-based runtime it derives the host from the
 * currently loaded JS bundle and keeps the backend on the expected API port.
 *
 * @returns Sanitized backend base URL without a trailing slash.
 */
export function getApiBaseUrl(): string {
    const configuredValue = readConfiguredApiBaseUrl();
    const bundleLocation = readBundleLocation();

    if (configuredValue === null) {
        return bundleLocation === null
            ? DEFAULT_API_BASE_URL
            : buildBaseUrl({
                  protocol: "http:",
                  hostname: bundleLocation.hostname,
                  port: DEFAULT_API_PORT,
              });
    }

    const configuredUrl = tryParseUrl(configuredValue);
    if (configuredUrl === null) {
        return bundleLocation === null
            ? DEFAULT_API_BASE_URL
            : buildBaseUrl({
                  protocol: "http:",
                  hostname: bundleLocation.hostname,
                  port: DEFAULT_API_PORT,
              });
    }

    if (
        bundleLocation !== null &&
        isLoopbackHostname(configuredUrl.hostname) &&
        !isLoopbackHostname(bundleLocation.hostname)
    ) {
        const derivedPort =
            configuredUrl.port.length > 0 && configuredUrl.port !== bundleLocation.port
                ? configuredUrl.port
                : DEFAULT_API_PORT;

        return buildBaseUrl({
            protocol: configuredUrl.protocol,
            hostname: bundleLocation.hostname,
            port: derivedPort,
        });
    }

    return stripTrailingSlash(configuredValue);
}

/**
 * Read the configured API base URL when present.
 *
 * @returns Trimmed configured URL or null.
 */
function readConfiguredApiBaseUrl(): string | null {
    const configuredValue = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (typeof configuredValue !== "string") {
        return null;
    }

    const trimmedValue = configuredValue.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
}

/**
 * Read the current JS bundle location exposed by React Native.
 *
 * @returns Parsed bundle location or null when unavailable.
 */
function readBundleLocation(): BundleLocation | null {
    const scriptUrl = readBundleScriptUrl();
    if (scriptUrl === null) {
        return null;
    }

    const parsedUrl = tryParseUrl(scriptUrl);
    if (parsedUrl === null || parsedUrl.hostname.length === 0) {
        return null;
    }

    return {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
    };
}

/**
 * Read the script URL from the native `SourceCode` module.
 *
 * @returns Raw bundle script URL or null.
 */
function readBundleScriptUrl(): string | null {
    const sourceCodeModule = Reflect.get(NativeModules, "SourceCode");
    if (typeof sourceCodeModule !== "object" || sourceCodeModule === null) {
        return null;
    }

    const scriptUrl = Reflect.get(sourceCodeModule, "scriptURL");
    return typeof scriptUrl === "string" && scriptUrl.trim().length > 0 ? scriptUrl : null;
}

/**
 * Parse a URL safely.
 *
 * @param rawValue Unknown URL string.
 * @returns Parsed URL or null when invalid.
 */
function tryParseUrl(rawValue: string): URL | null {
    try {
        return new URL(rawValue);
    } catch {
        return null;
    }
}

/**
 * Check whether a hostname is a loopback address.
 *
 * @param hostname Candidate hostname.
 * @returns True when the hostname is local-only.
 */
function isLoopbackHostname(hostname: string): boolean {
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

/**
 * Build a normalized URL string from explicit pieces.
 *
 * @param location URL location parts.
 * @returns Normalized URL string without a trailing slash.
 */
function buildBaseUrl(location: BundleLocation): string {
    const url = new URL(`${location.protocol}//${location.hostname}`);
    if (location.port.length > 0) {
        url.port = location.port;
    }
    return stripTrailingSlash(url.toString());
}

/**
 * Remove a trailing slash from a URL string.
 *
 * @param rawValue URL string.
 * @returns URL without a trailing slash.
 */
function stripTrailingSlash(rawValue: string): string {
    return rawValue.replace(/\/$/, "");
}
