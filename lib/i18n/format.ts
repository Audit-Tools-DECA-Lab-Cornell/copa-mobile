import type { ExecutionMode } from "lib/audit/types";
import type { TFunction } from "i18next";

/** Status labels used for place cards and summaries. */
export type LocalizedPlaceStatus = "not_started" | "in_progress" | "submitted";
type RelativeTimeUnit = "minute" | "hour" | "day";
type DurationUnit = "minute" | "hour" | "day" | "month";

interface LocalizedDurationPart {
    readonly value: number;
    readonly unit: DurationUnit;
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const DAYS_PER_MONTH = 30;
const MINUTES_PER_MONTH = DAYS_PER_MONTH * MINUTES_PER_DAY;

const EXECUTION_MODE_SHORT_FALLBACKS: Record<ExecutionMode, string> = {
    audit: "Onsite only",
    survey: "Survey only",
    both: "Survey & onsite",
};

const LANGUAGE_LOCALE_MAP = {
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    hi: "hi-IN",
    ja: "ja-JP",
} as const;

/**
 * Resolve a supported locale tag from the active i18n language.
 *
 * @param language Active i18n language.
 * @returns BCP 47 locale tag for date/time formatting.
 */
export function getLocaleTag(language: string): string {
    const normalizedLanguage = language.trim().toLowerCase();
    switch (normalizedLanguage) {
        case "de":
            return LANGUAGE_LOCALE_MAP.de;
        case "fr":
            return LANGUAGE_LOCALE_MAP.fr;
        case "hi":
            return LANGUAGE_LOCALE_MAP.hi;
        case "ja":
            return LANGUAGE_LOCALE_MAP.ja;
        default:
            return LANGUAGE_LOCALE_MAP.en;
    }
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
 * Format a localized date-time label from an ISO timestamp.
 *
 * @param value ISO timestamp.
 * @param language Active i18n language.
 * @returns Localized date and time string or an empty string when invalid.
 */
export function formatLocalizedDateTime(value: string, language: string): string {
    const dateLabel = formatLocalizedDate(value, language);
    if (dateLabel.length === 0) {
        return "";
    }

    const timeLabel = formatLocalizedTime(value, language);
    return timeLabel.length === 0 ? dateLabel : `${dateLabel} at ${timeLabel}`;
}

/**
 * Format an elapsed audit duration from total minutes into more readable
 * localized units.
 *
 * Durations stay in minutes for short sessions, switch to hours/minutes for
 * same-day sessions, then days/hours, and finally months/days for very long
 * audits. Month values are approximated as 30-day periods because the source
 * data only stores total minutes and not calendar boundaries.
 *
 * @param totalMinutes Total elapsed audit minutes.
 * @param language Active i18n language.
 * @returns Localized duration string or an empty string when invalid.
 */
export function formatLocalizedDurationFromMinutes(totalMinutes: number, language: string): string {
    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
        return "";
    }

    const normalizedMinutes = Math.floor(totalMinutes);
    const durationParts = getLocalizedDurationParts(normalizedMinutes);
    const formattedParts = durationParts.map((part) => {
        return formatLocalizedDurationUnit(part, language);
    });

    return formatLocalizedList(formattedParts, language);
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

    const translationKey = `audit:modeShort.${mode}`;
    const translatedLabel = t(translationKey);

    if (translatedLabel === translationKey || translatedLabel.trim().length === 0) {
        return EXECUTION_MODE_SHORT_FALLBACKS[mode];
    }

    return translatedLabel;
}

/**
 * Choose the most readable pair of duration units for an elapsed minute count.
 *
 * @param totalMinutes Whole elapsed minutes.
 * @returns Ordered duration parts for display.
 */
function getLocalizedDurationParts(totalMinutes: number): readonly LocalizedDurationPart[] {
    if (totalMinutes < MINUTES_PER_HOUR) {
        return [{ value: totalMinutes, unit: "minute" }];
    }

    if (totalMinutes < MINUTES_PER_DAY) {
        const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
        const minutes = totalMinutes % MINUTES_PER_HOUR;
        return minutes === 0
            ? [{ value: hours, unit: "hour" }]
            : [
                  { value: hours, unit: "hour" },
                  { value: minutes, unit: "minute" },
              ];
    }

    if (totalMinutes < MINUTES_PER_MONTH) {
        const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
        const remainingHours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
        return remainingHours === 0
            ? [{ value: days, unit: "day" }]
            : [
                  { value: days, unit: "day" },
                  { value: remainingHours, unit: "hour" },
              ];
    }

    const months = Math.floor(totalMinutes / MINUTES_PER_MONTH);
    const remainingDays = Math.floor((totalMinutes % MINUTES_PER_MONTH) / MINUTES_PER_DAY);
    return remainingDays === 0
        ? [{ value: months, unit: "month" }]
        : [
              { value: months, unit: "month" },
              { value: remainingDays, unit: "day" },
          ];
}

/**
 * Format one localized duration unit with the runtime unit formatter when
 * available, then fall back to a simple English label.
 *
 * @param part Duration fragment to localize.
 * @param language Active i18n language.
 * @returns Localized unit label.
 */
function formatLocalizedDurationUnit(part: LocalizedDurationPart, language: string): string {
    if (language.toLowerCase().startsWith("en")) {
        const unit = part.value === 1 ? part.unit : `${part.unit}s`;
        return `${part.value.toString()} ${unit}`;
    }
    return new Intl.NumberFormat(getLocaleTag(language), {
        style: "currency",
        unit: part.unit,
        unitDisplay: "long",
    }).format(part.value);
}

/**
 * Join localized duration fragments with a locale-aware conjunction when
 * possible.
 *
 * @param parts Preformatted localized duration fragments.
 * @param language Active i18n language.
 * @returns Joined duration label.
 */
function formatLocalizedList(parts: readonly string[], language: string): string {
    if (parts.length === 0) {
        return "";
    }

    if (parts.length === 1) {
        const [firstPart] = parts;
        return firstPart ?? "";
    }

    if (typeof Intl !== "object" || typeof Intl.ListFormat !== "function") {
        return parts.join(", ");
    }

    try {
        return new Intl.ListFormat(getLocaleTag(language), {
            style: "long",
            type: "conjunction",
        }).format(parts);
    } catch {
        return parts.join(", ");
    }
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
