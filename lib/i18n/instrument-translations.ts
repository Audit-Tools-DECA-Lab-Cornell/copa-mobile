import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePlayspaceAuditStore } from "stores/audit-store";

import { deInstrumentTranslations } from "./locales/de/instrument";
import { enInstrumentTranslations } from "./locales/en/instrument";
import { frInstrumentTranslations } from "./locales/fr/instrument";
import { hiInstrumentTranslations } from "./locales/hi/instrument";
import { jaInstrumentTranslations } from "./locales/ja/instrument";

import type {
    ChoiceOption,
    InstrumentQuestion,
    InstrumentSection,
    PlayspaceInstrument,
    PreAuditQuestion,
    QuestionScale,
    ScaleDefinition,
    ScaleKey,
    ScaleOption,
} from "lib/audit/types";
/**
 * Supported instrument translation locales.
 */
export type InstrumentLocale = "en" | "de" | "fr" | "hi" | "ja";

/**
 * Localized copy for a choice-like option.
 */
export type InstrumentOptionTranslation = Readonly<{
    label?: string;
    description?: string | null;
}>;

/**
 * Localized copy for a pre-audit question.
 */
export type InstrumentPreAuditQuestionTranslation = Readonly<{
    label?: string;
    description?: string | null;
    options?: Readonly<Record<string, InstrumentOptionTranslation>>;
}>;

/**
 * Localized copy for a scale and its options.
 */
export type InstrumentScaleTranslation = Readonly<{
    title?: string;
    prompt?: string;
    description?: string;
    options?: Readonly<Record<string, InstrumentOptionTranslation>>;
}>;

/**
 * Localized copy for a question prompt.
 */
export type InstrumentQuestionTranslation = Readonly<{
    prompt?: string;
}>;

/**
 * Localized copy for a section and its child questions.
 */
export type InstrumentSectionTranslation = Readonly<{
    title?: string;
    description?: string | null;
    instruction?: string;
    notesPrompt?: string | null;
    questions?: Readonly<Record<string, InstrumentQuestionTranslation>>;
}>;

/**
 * Compact translation bundle keyed by stable instrument identifiers.
 */
export type InstrumentTranslations = Readonly<{
    metadata?: Readonly<{
        instrumentName?: string;
        currentSheet?: string;
    }>;
    preamble?: readonly string[];
    executionModes?: Readonly<Record<string, InstrumentOptionTranslation>>;
    preAuditQuestions?: Readonly<Record<string, InstrumentPreAuditQuestionTranslation>>;
    scales?: Readonly<Record<ScaleKey, InstrumentScaleTranslation>>;
    sections?: Readonly<Record<string, InstrumentSectionTranslation>>;
}>;

const INSTRUMENT_TRANSLATIONS_BY_LOCALE: Readonly<Record<InstrumentLocale, InstrumentTranslations>> = {
    en: enInstrumentTranslations,
    de: deInstrumentTranslations,
    fr: frInstrumentTranslations,
    hi: hiInstrumentTranslations,
    ja: jaInstrumentTranslations,
};

/**
 * Normalize any i18n language tag to an instrument locale.
 *
 * @param languageTag Current i18n language tag.
 * @returns The best matching instrument locale.
 */
export function normalizeInstrumentLocale(languageTag: string | undefined): InstrumentLocale {
    if (typeof languageTag !== "string" || languageTag.length === 0) {
        return "en";
    }

    const [languageCode] = languageTag.toLowerCase().split("-");
    if (languageCode === "de") {
        return "de";
    }

    if (languageCode === "fr") {
        return "fr";
    }

    if (languageCode === "hi") {
        return "hi";
    }

    if (languageCode === "ja") {
        return "ja";
    }

    return "en";
}

/**
 * Read a translated string when present, otherwise keep the raw base copy.
 *
 * @param baseValue English source text from the raw instrument.
 * @param translatedValue Localized text override.
 * @returns The translated text or the base value when missing.
 */
function resolveString(baseValue: string, translatedValue: string | undefined): string {
    if (translatedValue === undefined) {
        return baseValue;
    }

    if (baseValue.includes("**") && !hasBalancedBoldMarkers(translatedValue)) {
        return baseValue;
    }

    return translatedValue;
}

/**
 * Read a translated nullable string when present, otherwise keep the raw base copy.
 *
 * @param baseValue English source text from the raw instrument.
 * @param translatedValue Localized text override.
 * @returns The translated text, explicit null, or the base value when missing.
 */
function resolveNullableString(
    baseValue: string | null | undefined,
    translatedValue: string | null | undefined,
): string | null | undefined {
    if (translatedValue === null) {
        return null;
    }

    if (typeof translatedValue === "string") {
        if (typeof baseValue === "string" && baseValue.includes("**") && !hasBalancedBoldMarkers(translatedValue)) {
            return baseValue;
        }

        return translatedValue;
    }

    return baseValue;
}

/**
 * Ensure markdown-style bold markers remain balanced after translation.
 *
 * @param value Candidate translated string.
 * @returns True when `**` markers appear in balanced pairs.
 */
function hasBalancedBoldMarkers(value: string): boolean {
    return (value.match(/\*\*/g) ?? []).length % 2 === 0;
}

/**
 * Apply localized copy to a reusable choice option.
 *
 * @param baseOption Source option from the raw instrument.
 * @param translation Localized option copy.
 * @returns The localized option with English fallback.
 */
function localizeChoiceOption(
    baseOption: ChoiceOption,
    translation: InstrumentOptionTranslation | undefined,
): ChoiceOption {
    return {
        ...baseOption,
        label: resolveString(baseOption.label, translation?.label),
        description: resolveNullableString(baseOption.description, translation?.description),
    };
}

/**
 * Apply localized copy to a reusable scale option.
 *
 * @param baseOption Source scale option from the raw instrument.
 * @param translation Localized scale option copy.
 * @returns The localized scale option with English fallback.
 */
function localizeScaleOption(
    baseOption: ScaleOption,
    translation: InstrumentOptionTranslation | undefined,
): ScaleOption {
    return {
        ...baseOption,
        label: resolveString(baseOption.label, translation?.label),
    };
}

/**
 * Apply localized copy to a scale guidance definition.
 *
 * @param baseScale Source scale guidance from the raw instrument.
 * @param translation Localized scale copy.
 * @returns The localized scale guidance with English fallback.
 */
function localizeScaleDefinition(
    baseScale: ScaleDefinition,
    translation: InstrumentScaleTranslation | undefined,
): ScaleDefinition {
    return {
        ...baseScale,
        title: resolveString(baseScale.title, translation?.title),
        prompt: resolveString(baseScale.prompt, translation?.prompt),
        description: resolveString(baseScale.description, translation?.description),
        options: baseScale.options.map((option) => localizeScaleOption(option, translation?.options?.[option.key])),
    };
}

/**
 * Apply localized copy to a question scale instance.
 *
 * @param baseScale Source question scale from the raw instrument.
 * @param translation Localized scale copy.
 * @returns The localized question scale with English fallback.
 */
function localizeQuestionScale(
    baseScale: QuestionScale,
    translation: InstrumentScaleTranslation | undefined,
): QuestionScale {
    return {
        ...baseScale,
        title: resolveString(baseScale.title, translation?.title),
        prompt: resolveString(baseScale.prompt, translation?.prompt),
        options: baseScale.options.map((option) => localizeScaleOption(option, translation?.options?.[option.key])),
    };
}

/**
 * Apply localized copy to a pre-audit question.
 *
 * @param baseQuestion Source pre-audit question from the raw instrument.
 * @param translation Localized question copy.
 * @returns The localized pre-audit question with English fallback.
 */
function localizePreAuditQuestion(
    baseQuestion: PreAuditQuestion,
    translation: InstrumentPreAuditQuestionTranslation | undefined,
): PreAuditQuestion {
    return {
        ...baseQuestion,
        label: resolveString(baseQuestion.label, translation?.label),
        description: resolveNullableString(baseQuestion.description, translation?.description),
        options: baseQuestion.options.map((option) => localizeChoiceOption(option, translation?.options?.[option.key])),
    };
}

/**
 * Apply localized copy to an individual section question.
 *
 * @param baseQuestion Source question from the raw instrument.
 * @param translation Localized question copy.
 * @param scaleTranslations Shared scale translations keyed by scale ID.
 * @returns The localized question with English fallback.
 */
function localizeInstrumentQuestion(
    baseQuestion: InstrumentQuestion,
    translation: InstrumentQuestionTranslation | undefined,
    scaleTranslations: InstrumentTranslations["scales"] | undefined,
): InstrumentQuestion {
    return {
        ...baseQuestion,
        prompt: resolveString(baseQuestion.prompt, translation?.prompt),
        scales: baseQuestion.scales.map((scale) => localizeQuestionScale(scale, scaleTranslations?.[scale.key])),
    };
}

/**
 * Apply localized copy to an instrument section and its questions.
 *
 * @param baseSection Source section from the raw instrument.
 * @param translation Localized section copy.
 * @param scaleTranslations Shared scale translations keyed by scale ID.
 * @returns The localized section with English fallback.
 */
function localizeInstrumentSection(
    baseSection: InstrumentSection,
    translation: InstrumentSectionTranslation | undefined,
    scaleTranslations: InstrumentTranslations["scales"] | undefined,
): InstrumentSection {
    return {
        ...baseSection,
        title: resolveString(baseSection.title, translation?.title),
        description: resolveNullableString(baseSection.description, translation?.description),
        instruction: resolveString(baseSection.instruction, translation?.instruction),
        notes_prompt: resolveNullableString(baseSection.notes_prompt, translation?.notesPrompt),
        questions: baseSection.questions.map((question) =>
            localizeInstrumentQuestion(question, translation?.questions?.[question.question_key], scaleTranslations),
        ),
    };
}

/**
 * Resolve the compact translation bundle for a given language tag.
 *
 * @param languageTag Current i18n language tag.
 * @returns The best matching compact translation bundle.
 */
export function getInstrumentTranslations(languageTag: string | undefined): InstrumentTranslations {
    return INSTRUMENT_TRANSLATIONS_BY_LOCALE[normalizeInstrumentLocale(languageTag)];
}

/**
 * Merge localized display copy into the raw structural instrument definition.
 *
 * @param baseInstrument Raw English instrument that remains the structural source of truth.
 * @param translations Compact localized display copy keyed by stable IDs.
 * @returns A localized instrument with English fallback for missing entries.
 */
export function localizeInstrument(
    baseInstrument: PlayspaceInstrument,
    translations: InstrumentTranslations,
): PlayspaceInstrument {
    const scaleTranslations = translations.scales;

    return {
        ...baseInstrument,
        instrument_name: resolveString(baseInstrument.instrument_name, translations.metadata?.instrumentName),
        current_sheet: resolveString(baseInstrument.current_sheet, translations.metadata?.currentSheet),
        preamble: baseInstrument.preamble.map((paragraph, index) => translations.preamble?.[index] ?? paragraph),
        execution_modes: baseInstrument.execution_modes.map((mode) =>
            localizeChoiceOption(mode, translations.executionModes?.[mode.key]),
        ),
        pre_audit_questions: baseInstrument.pre_audit_questions.map((question) =>
            localizePreAuditQuestion(question, translations.preAuditQuestions?.[question.key]),
        ),
        scale_guidance: baseInstrument.scale_guidance.map((scale) =>
            localizeScaleDefinition(scale, scaleTranslations?.[scale.key]),
        ),
        sections: baseInstrument.sections.map((section) =>
            localizeInstrumentSection(section, translations.sections?.[section.section_key], scaleTranslations),
        ),
    };
}

/**
 * Read the fully localized instrument for the active i18n language.
 *
 * The hook subscribes to the `instrument` namespace so callers react to language changes
 * without requiring screen files to know about the translation bundle internals.
 *
 * @returns The localized playspace instrument for the active language.
 */
export function useLocalizedInstrument(): PlayspaceInstrument | null {
    const { i18n } = useTranslation(["instrument"]);
    const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
    const baseInstrument = usePlayspaceAuditStore((state) => state.instrument);

    return useMemo(() => {
        if (!baseInstrument) {
            return null;
        }
        const translations = getInstrumentTranslations(activeLanguage);
        return localizeInstrument(baseInstrument, translations);
    }, [activeLanguage, baseInstrument]);
}
