import type { AssignmentRoles, ExecutionMode } from "lib/audit/types";
import type { TFunction } from "i18next";

/** Status labels used for place cards and summaries. */
export type LocalizedPlaceStatus = "not_started" | "in_progress" | "submitted";
type RelativeTimeUnit = "minute" | "hour" | "day";

const LANGUAGE_LOCALE_MAP = {
    en: "en-NZ",
    de: "de-DE",
} as const;

/**
 * Resolve a supported locale tag from the active i18n language.
 *
 * @param language Active i18n language.
 * @returns BCP 47 locale tag for date/time formatting.
 */
export function getLocaleTag(language: string): string {
    const normalizedLanguage = language.trim().toLowerCase();
    return normalizedLanguage.startsWith("de") ? LANGUAGE_LOCALE_MAP.de : LANGUAGE_LOCALE_MAP.en;
}

/**
 * Format a short relative-time label for place activity.
 *
 * @param startedAt Audit start timestamp.
 * @param submittedAt Audit submit timestamp.
 * @param language Active i18n language.
 * @param t Translation function.
 * @returns Localized relative-time label.
 */
export function formatRelativeTimeLabel(
    startedAt: string | null,
    submittedAt: string | null,
    language: string,
    t: TFunction,
): string {
    const timestamp = submittedAt ?? startedAt;
    if (timestamp === null) {
        return t("common:status.notStarted");
    }

    const parsedTimestamp = Date.parse(timestamp);
    if (Number.isNaN(parsedTimestamp)) {
        return t("common:status.notStarted");
    }

    const diffMs = Math.max(0, Date.now() - parsedTimestamp);
    if (diffMs < 60_000) {
        return t("common:time.justNow");
    }
    const relativeTime = getRelativeTimeParts(diffMs);
    const formatter = createRelativeTimeFormatter(language);
    if (formatter !== null) {
        return formatter.format(relativeTime.value, relativeTime.unit);
    }

    return formatRelativeTimeFallback(relativeTime.unit, Math.abs(relativeTime.value), t);
}

/**
 * Format a long date label for dashboard headings.
 *
 * @param language Active i18n language.
 * @param value Optional date value.
 * @returns Localized calendar date string.
 */
export function formatLongDateLabel(language: string, value: Date = new Date()): string {
    return new Intl.DateTimeFormat(getLocaleTag(language), {
        month: "long",
        day: "numeric",
        year: "numeric",
        weekday: "long",
    }).format(value);
}

/**
 * Format a localized calendar date from an ISO timestamp.
 *
 * @param value ISO timestamp.
 * @param language Active i18n language.
 * @returns Localized date string or an empty string when invalid.
 */
export function formatLocalizedDate(value: string, language: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return new Intl.DateTimeFormat(getLocaleTag(language)).format(date);
}

/**
 * Format a localized time label from an ISO timestamp.
 *
 * @param value ISO timestamp.
 * @param language Active i18n language.
 * @returns Localized time string or an empty string when invalid.
 */
export function formatLocalizedTime(value: string, language: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return new Intl.DateTimeFormat(getLocaleTag(language), {
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

/**
 * Map a local place status code to a translated label.
 *
 * @param status Local status value.
 * @param t Translation function.
 * @returns User-facing status label.
 */
export function getPlaceStatusLabel(status: LocalizedPlaceStatus, t: TFunction): string {
    switch (status) {
        case "in_progress":
            return t("common:status.inProgress");
        case "submitted":
            return t("common:status.submitted");
        case "not_started":
        default:
            return t("common:status.notStarted");
    }
}

/**
 * Format assignment roles for the execute overview.
 *
 * @param roles Roles granted for the current audit assignment.
 * @param t Translation function.
 * @returns Human-readable translated role label.
 */
export function getAssignmentRolesLabel(roles: AssignmentRoles, t: TFunction): string {
    const hasAuditor = roles.includes("auditor");
    const hasPlaceAdmin = roles.includes("place_admin");

    if (hasAuditor && hasPlaceAdmin) {
        return t("common:roles.auditorAndPlaceAdmin");
    }
    if (hasPlaceAdmin) {
        return t("common:roles.placeAdmin");
    }
    return t("common:roles.auditor");
}

/**
 * Format a short translated execution mode label for headers.
 *
 * @param mode Execution mode stored on the audit session.
 * @param t Translation function.
 * @returns Localized compact mode label.
 */
export function getExecutionModeShortLabel(mode: ExecutionMode | null, t: TFunction): string {
    if (mode === null) {
        return "";
    }
    return t(`audit:modeShort.${mode}`);
}

/**
 * Convert an elapsed time delta into the most appropriate relative-time unit.
 *
 * @param diffMs Elapsed time in milliseconds.
 * @returns Signed relative-time value and unit for formatter APIs.
 */
function getRelativeTimeParts(diffMs: number): Readonly<{ value: number; unit: RelativeTimeUnit }> {
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) {
        return { value: -minutes, unit: "minute" };
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return { value: -hours, unit: "hour" };
    }

    return { value: -Math.floor(hours / 24), unit: "day" };
}

/**
 * Create a runtime relative-time formatter when the current JS engine supports it.
 *
 * @param language Active i18n language.
 * @returns Formatter instance or null when unavailable.
 */
function createRelativeTimeFormatter(language: string): Intl.RelativeTimeFormat | null {
    if (typeof Intl !== "object" || typeof Intl.RelativeTimeFormat !== "function") {
        return null;
    }

    try {
        return new Intl.RelativeTimeFormat(getLocaleTag(language), {
            numeric: "always",
            style: "short",
        });
    } catch {
        return null;
    }
}

/**
 * Format relative time labels without relying on `Intl.RelativeTimeFormat`.
 *
 * @param unit Relative-time unit.
 * @param count Absolute unit count.
 * @param t Translation function.
 * @returns Localized relative-time label.
 */
function formatRelativeTimeFallback(unit: RelativeTimeUnit, count: number, t: TFunction): string {
    switch (unit) {
        case "minute":
            return t("common:time.minuteAgo", { count });
        case "hour":
            return t("common:time.hourAgo", { count });
        case "day":
        default:
            return t("common:time.dayAgo", { count });
    }
}
