import { useEffect, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";

const DEFAULT_SCREENSHOT_SCROLL_DELAY_MS = 350;

type ScreenshotAutomationParamValue = string | string[] | undefined;

interface UseScreenshotScrollAutomationConfig {
    readonly contentReady: boolean;
    readonly rerunKey?: number | string;
    readonly scrollToOffset: (offset: number) => void;
}

/**
 * Applies screenshot-only scroll automation from route params injected by the
 * simulator capture script.
 *
 * @param config Readiness and scroll callback for the active screen.
 */
export function useScreenshotScrollAutomation({
    contentReady,
    rerunKey,
    scrollToOffset,
}: Readonly<UseScreenshotScrollAutomationConfig>): void {
    const params = useLocalSearchParams();
    const rawScrollDelayMs = params["__screenshotScrollDelayMs"];
    const rawScrollY = params["__screenshotScrollY"];

    const scrollOffset = useMemo(() => {
        return parseNonNegativeInteger(rawScrollY);
    }, [rawScrollY]);
    const scrollDelayMs = useMemo(() => {
        const parsedDelay = parseNonNegativeInteger(rawScrollDelayMs);
        return parsedDelay ?? DEFAULT_SCREENSHOT_SCROLL_DELAY_MS;
    }, [rawScrollDelayMs]);

    useEffect(() => {
        if (!contentReady || scrollOffset === null) {
            return;
        }

        const timeoutId = setTimeout(() => {
            scrollToOffset(scrollOffset);
        }, scrollDelayMs);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [contentReady, rerunKey, scrollDelayMs, scrollOffset, scrollToOffset]);
}

/**
 * Reads a single route parameter value when the router provides either a
 * string or string array.
 *
 * @param value Raw route parameter value.
 * @returns First string value or null when not present.
 */
function readSingleParam(value: ScreenshotAutomationParamValue): string | null {
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
    }
    return null;
}

/**
 * Parses a non-negative integer route parameter.
 *
 * @param value Raw route parameter value.
 * @returns Parsed integer or null when the value is missing or invalid.
 */
function parseNonNegativeInteger(value: ScreenshotAutomationParamValue): number | null {
    const rawValue = readSingleParam(value)?.trim();
    if (rawValue === undefined || rawValue.length === 0) {
        return null;
    }
    if (!/^\d+$/.test(rawValue)) {
        return null;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
        return null;
    }

    return parsedValue;
}
