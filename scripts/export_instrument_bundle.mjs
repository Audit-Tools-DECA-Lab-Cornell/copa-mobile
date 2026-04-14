import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { BASE_PLAYSPACE_INSTRUMENT } from "../lib/instrument.ts";
import { enInstrumentTranslations } from "../lib/i18n/locales/en/instrument.ts";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(SCRIPT_PATH, "..", "..");

/**
 * Convert a locale code into the export prefix used by instrument locale files.
 *
 * Examples:
 * - "de" -> "de"
 * - "pt-br" -> "ptBr"
 *
 * @param {string} locale Locale code passed to the CLI.
 * @returns {string} Safe identifier prefix for the locale export name.
 */
function toInstrumentExportPrefix(locale) {
    const segments = locale
        .trim()
        .split(/[^A-Za-z0-9]+/)
        .filter((segment) => segment.length > 0)
        .map((segment) => segment.toLowerCase());

    if (segments.length === 0) {
        throw new Error(`Invalid locale "${locale}".`);
    }

    const [firstSegment, ...remainingSegments] = segments;
    return [
        firstSegment,
        ...remainingSegments.map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`),
    ].join("");
}

/**
 * Keep an override string when provided, otherwise fall back to the base value.
 *
 * @param {string} baseValue Canonical English source text.
 * @param {string | undefined} overrideValue Locale override value.
 * @returns {string} Resolved text value.
 */
function mergeString(baseValue, overrideValue) {
    return typeof overrideValue === "string" ? overrideValue : baseValue;
}

/**
 * Keep an explicit null override when present, otherwise fall back to the base value.
 *
 * @param {string | null | undefined} baseValue Canonical English nullable text.
 * @param {string | null | undefined} overrideValue Locale override value.
 * @returns {string | null | undefined} Resolved nullable text value.
 */
function mergeNullableString(baseValue, overrideValue) {
    if (overrideValue === null) {
        return null;
    }

    return typeof overrideValue === "string" ? overrideValue : baseValue;
}

/**
 * Apply translation overrides to a reusable option-like structure.
 *
 * @param {{ label: string, description?: string | null }} baseOption Canonical option copy.
 * @param {{ label?: string, description?: string | null } | undefined} translation Optional locale override.
 * @returns {{ label: string, description?: string | null }} Localized option translation.
 */
function mergeChoiceOption(baseOption, translation) {
    return {
        label: mergeString(baseOption.label, translation?.label),
        description: mergeNullableString(baseOption.description, translation?.description),
    };
}

/**
 * Build the fully resolved compact translation bundle from the raw instrument and
 * optional locale-specific overrides.
 *
 * @param {typeof BASE_PLAYSPACE_INSTRUMENT} baseInstrument Canonical instrument definition.
 * @param {Record<string, unknown>} localeOverrides Partial locale translation overrides.
 * @returns {Record<string, unknown>} Fully resolved compact translation bundle.
 */
function buildResolvedInstrumentBundle(baseInstrument, localeOverrides) {
    const metadataOverrides =
        typeof localeOverrides.metadata === "object" && localeOverrides.metadata !== null
            ? localeOverrides.metadata
            : {};
    const preambleOverrides = Array.isArray(localeOverrides.preamble) ? localeOverrides.preamble : [];
    const executionModeOverrides =
        typeof localeOverrides.executionModes === "object" && localeOverrides.executionModes !== null
            ? localeOverrides.executionModes
            : {};
    const preAuditOverrides =
        typeof localeOverrides.preAuditQuestions === "object" && localeOverrides.preAuditQuestions !== null
            ? localeOverrides.preAuditQuestions
            : {};
    const scaleOverrides =
        typeof localeOverrides.scales === "object" && localeOverrides.scales !== null ? localeOverrides.scales : {};
    const sectionOverrides =
        typeof localeOverrides.sections === "object" && localeOverrides.sections !== null
            ? localeOverrides.sections
            : {};

    const bundle = {
        metadata: {
            instrumentName: mergeString(baseInstrument.instrument_name, metadataOverrides.instrumentName),
            currentSheet: mergeString(baseInstrument.current_sheet, metadataOverrides.currentSheet),
        },
        preamble: baseInstrument.preamble.map((paragraph, index) => {
            const overrideValue = preambleOverrides[index];
            return typeof overrideValue === "string" ? overrideValue : paragraph;
        }),
        executionModes: Object.fromEntries(
            baseInstrument.execution_modes.map((mode) => {
                const translation = executionModeOverrides[mode.key];
                return [mode.key, mergeChoiceOption(mode, translation)];
            }),
        ),
        preAuditQuestions: Object.fromEntries(
            baseInstrument.pre_audit_questions.map((question) => {
                const questionTranslation = preAuditOverrides[question.key];
                const optionTranslations =
                    typeof questionTranslation?.options === "object" && questionTranslation.options !== null
                        ? questionTranslation.options
                        : {};

                return [
                    question.key,
                    {
                        label: mergeString(question.label, questionTranslation?.label),
                        description: mergeNullableString(question.description, questionTranslation?.description),
                        options: Object.fromEntries(
                            question.options.map((option) => [
                                option.key,
                                mergeChoiceOption(option, optionTranslations[option.key]),
                            ]),
                        ),
                    },
                ];
            }),
        ),
        scales: Object.fromEntries(
            baseInstrument.scale_guidance.map((scale) => {
                const scaleTranslation = scaleOverrides[scale.key];
                const optionTranslations =
                    typeof scaleTranslation?.options === "object" && scaleTranslation.options !== null
                        ? scaleTranslation.options
                        : {};

                return [
                    scale.key,
                    {
                        title: mergeString(scale.title, scaleTranslation?.title),
                        prompt: mergeString(scale.prompt, scaleTranslation?.prompt),
                        description: mergeString(scale.description, scaleTranslation?.description),
                        options: Object.fromEntries(
                            scale.options.map((option) => [
                                option.key,
                                {
                                    label: mergeString(option.label, optionTranslations[option.key]?.label),
                                },
                            ]),
                        ),
                    },
                ];
            }),
        ),
        sections: Object.fromEntries(
            baseInstrument.sections.map((section) => {
                const sectionTranslation = sectionOverrides[section.section_key];
                const questionTranslations =
                    typeof sectionTranslation?.questions === "object" && sectionTranslation.questions !== null
                        ? sectionTranslation.questions
                        : {};

                return [
                    section.section_key,
                    {
                        title: mergeString(section.title, sectionTranslation?.title),
                        description: mergeNullableString(section.description, sectionTranslation?.description),
                        instruction: mergeString(section.instruction, sectionTranslation?.instruction),
                        notesPrompt: mergeNullableString(section.notes_prompt, sectionTranslation?.notesPrompt),
                        questions: Object.fromEntries(
                            section.questions.map((question) => [
                                question.question_key,
                                {
                                    prompt: mergeString(
                                        question.prompt,
                                        questionTranslations[question.question_key]?.prompt,
                                    ),
                                },
                            ]),
                        ),
                    },
                ];
            }),
        ),
    };

    return bundle;
}

/**
 * Load the current instrument translation override bundle for a locale, returning
 * an empty object when the locale file does not exist yet.
 *
 * @param {string} locale Target locale code.
 * @returns {Promise<Record<string, unknown>>} Existing locale bundle or an empty object.
 */
async function loadCurrentLocaleBundle(locale) {
    const localeFilePath = resolve(REPO_ROOT, "lib", "i18n", "locales", locale, "instrument.ts");

    if (!existsSync(localeFilePath)) {
        return {};
    }

    const localeModule = await import(pathToFileURL(localeFilePath).href);
    const exportName = `${toInstrumentExportPrefix(locale)}InstrumentTranslations`;
    const localeBundle = localeModule[exportName];

    if (typeof localeBundle !== "object" || localeBundle === null) {
        throw new Error(
            `Expected ${exportName} to export an object from ${localeFilePath}, but got ${typeof localeBundle}.`,
        );
    }

    return localeBundle;
}

/**
 * Print CLI usage information and exit.
 *
 * @param {number} code Process exit code.
 * @returns {never}
 */
function exitWithUsage(code) {
    console.error(
        [
            "Usage:",
            "  bun scripts/export_instrument_bundle.mjs source <locale>",
            "  bun scripts/export_instrument_bundle.mjs current <locale>",
        ].join("\n"),
    );
    process.exit(code);
}

/**
 * Entry point for the helper CLI.
 *
 * @returns {Promise<void>} Completion signal for the async CLI flow.
 */
async function main() {
    const [, , mode, locale] = process.argv;

    if (typeof mode !== "string" || typeof locale !== "string") {
        exitWithUsage(1);
    }

    if (mode === "source") {
        const bundle = buildResolvedInstrumentBundle(BASE_PLAYSPACE_INSTRUMENT, enInstrumentTranslations);
        process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
        return;
    }

    if (mode === "current") {
        const bundle = await loadCurrentLocaleBundle(locale);
        process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
        return;
    }

    exitWithUsage(1);
}

void main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
});
