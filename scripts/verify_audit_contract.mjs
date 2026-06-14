import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

import { Buffer } from "node:buffer";
import ts from "typescript";

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const MODULE_CACHE = new Map();

function resolveTsModulePath(fromFilePath, moduleSpecifier) {
    if (moduleSpecifier.startsWith("lib/")) {
        return path.resolve(REPO_ROOT, `${moduleSpecifier}.ts`);
    }

    if (moduleSpecifier.startsWith("./") || moduleSpecifier.startsWith("../")) {
        const resolvedPath = path.resolve(path.dirname(fromFilePath), moduleSpecifier);
        return resolvedPath.endsWith(".ts") ? resolvedPath : `${resolvedPath}.ts`;
    }

    return null;
}

function loadTsModule(filePath) {
    const normalizedPath = path.resolve(filePath);
    const cachedModule = MODULE_CACHE.get(normalizedPath);
    if (cachedModule !== undefined) {
        return cachedModule.exports;
    }

    const sourceText = readFileSync(normalizedPath, "utf8");
    const transpiled = ts.transpileModule(sourceText, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
        },
    }).outputText;

    const module = { exports: {} };
    MODULE_CACHE.set(normalizedPath, module);
    const script = new vm.Script(transpiled, { filename: normalizedPath });
    script.runInNewContext({
        module,
        exports: module.exports,
        require(moduleSpecifier) {
            const tsModulePath = resolveTsModulePath(normalizedPath, moduleSpecifier);
            if (tsModulePath !== null) {
                return loadTsModule(tsModulePath);
            }
            return require(moduleSpecifier);
        },
        __dirname: path.dirname(normalizedPath),
        __filename: normalizedPath,
        console,
        process,
        Buffer,
        setTimeout,
        clearTimeout,
    });

    return module.exports;
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

const { auditDraftSaveSchema, auditScoreTotalsSchema, auditSessionSchema } = loadTsModule(
    path.resolve(REPO_ROOT, "lib/audit/types.ts"),
);
const { getActiveScaleKeysForQuestion, getVisibleSections, getInstrumentSectionLocalProgress } = loadTsModule(
    path.resolve(REPO_ROOT, "lib/audit/selectors.ts"),
);
const {
    calculateQuestionScores,
    formatPercentage,
    getCombinedConstructScore,
    getEffectiveAuditScoreTotals,
    hasUnsureVariants,
} = loadTsModule(path.resolve(REPO_ROOT, "lib/audit/score-helpers.ts"));

const instrumentFixture = {
    instrument_key: "pvua_demo",
    instrument_name: "Demo COPA Instrument",
    instrument_version: "1.0",
    current_sheet: "Demo Sheet",
    source_files: [],
    preamble: [],
    execution_modes: [
        {
            key: "survey",
            label: "Survey",
        },
    ],
    pre_audit_questions: [],
    scale_guidance: [],
    sections: [
        {
            section_key: "section_demo",
            title: "Demo Section",
            description: null,
            instruction: "Answer the demo questions.",
            notes_prompt: null,
            questions: [
                {
                    question_key: "q_simple",
                    mode: "survey",
                    constructs: ["usability"],
                    domains: ["Demo"],
                    section_key: "section_demo",
                    prompt: "Simple prompt",
                    question_type: "scaled",
                    required: true,
                    display_if: null,
                    options: [],
                    scales: [
                        {
                            key: "provision",
                            title: "Provision",
                            prompt: "Provision prompt",
                            options: [
                                {
                                    key: "no",
                                    label: "No",
                                    addition_value: 0,
                                    boost_value: 0,
                                    allows_follow_up_scales: false,
                                    is_not_applicable: false,
                                    is_unsure: false,
                                },
                                {
                                    key: "a_little_bit",
                                    label: "A little bit",
                                    addition_value: 1,
                                    boost_value: 1,
                                    allows_follow_up_scales: true,
                                    is_not_applicable: false,
                                    is_unsure: false,
                                },
                            ],
                        },
                    ],
                },
                {
                    question_key: "q_follow_up",
                    mode: "survey",
                    constructs: ["play_value"],
                    domains: ["Demo"],
                    section_key: "section_demo",
                    prompt: "Follow-up prompt",
                    question_type: "scaled",
                    required: true,
                    display_if: null,
                    options: [],
                    scales: [
                        {
                            key: "provision",
                            title: "Provision",
                            prompt: "Provision prompt",
                            options: [
                                {
                                    key: "no",
                                    label: "No",
                                    addition_value: 0,
                                    boost_value: 0,
                                    allows_follow_up_scales: false,
                                    is_not_applicable: false,
                                    is_unsure: false,
                                },
                                {
                                    key: "a_lot",
                                    label: "A lot",
                                    addition_value: 2,
                                    boost_value: 2,
                                    allows_follow_up_scales: true,
                                    is_not_applicable: false,
                                    is_unsure: false,
                                },
                            ],
                        },
                        {
                            key: "variety",
                            title: "Variety",
                            prompt: "Variety prompt",
                            options: [
                                {
                                    key: "not_applicable",
                                    label: "Not applicable",
                                    addition_value: 0,
                                    boost_value: 1,
                                    allows_follow_up_scales: false,
                                    is_not_applicable: true,
                                    is_unsure: false,
                                },
                                {
                                    key: "some_variety",
                                    label: "Some variety",
                                    addition_value: 2,
                                    boost_value: 2,
                                    allows_follow_up_scales: false,
                                    is_not_applicable: false,
                                    is_unsure: false,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};

const targetSection = instrumentFixture.sections[0];
const targetQuestion = targetSection.questions.find((question) => question.scales.length > 1);
assert(targetQuestion !== undefined, "Expected an instrument question with follow-up scales.");

const sessionFixture = {
    audit_id: "11111111-1111-4111-8111-111111111111",
    audit_code: "PVUA-DEMO-001",
    project_id: "22222222-2222-4222-8222-222222222222",
    project_name: "Demo Project",
    place_id: "33333333-3333-4333-8333-333333333333",
    place_name: "Demo Place",
    place_type: "Neighborhood Playspace",
    allowed_execution_modes: ["survey", "audit", "both"],
    selected_execution_mode: "survey",
    status: "IN_PROGRESS",
    instrument_key: instrumentFixture.instrument_key,
    instrument_version: instrumentFixture.instrument_version,
    instrument: instrumentFixture,
    schema_version: 1,
    revision: 3,
    aggregate: {
        schema_version: 1,
        revision: 3,
        meta: { execution_mode: "survey" },
        pre_audit: {
            place_size: "medium",
            current_users_0_5: "none",
            current_users_6_12: "some",
            current_users_13_17: "none",
            current_users_18_plus: "none",
            playspace_busyness: "some",
            season: "spring",
            weather_conditions: ["windy"],
            wind_conditions: "calm",
        },
        sections: {
            [targetSection.section_key]: {
                section_key: targetSection.section_key,
                note: "Local draft note",
                responses: {
                    [targetSection.questions[0].question_key]: {
                        provision: "a_little_bit",
                    },
                    [targetQuestion.question_key]: {
                        provision: "a_lot",
                        [targetQuestion.scales[1].key]: targetQuestion.scales[1].options[1].key,
                    },
                },
            },
        },
    },
    started_at: "2026-03-24T10:00:00Z",
    submitted_at: null,
    total_minutes: null,
    meta: { execution_mode: "survey" },
    pre_audit: {
        place_size: "medium",
        current_users_0_5: "none",
        current_users_6_12: "some",
        current_users_13_17: "none",
        current_users_18_plus: "none",
        playspace_busyness: "some",
        season: "spring",
        weather_conditions: ["windy"],
        wind_conditions: "calm",
    },
    sections: {
        [targetSection.section_key]: {
            section_key: targetSection.section_key,
            note: "Local draft note",
            responses: {
                [targetSection.questions[0].question_key]: {
                    provision: "a_little_bit",
                },
                [targetQuestion.question_key]: {
                    provision: "a_lot",
                    [targetQuestion.scales[1].key]: targetQuestion.scales[1].options[1].key,
                },
            },
        },
    },
    scores: {
        draft_progress_percent: 12.5,
        execution_mode: "survey",
        audit: null,
        survey: null,
        overall: null,
        by_section: {},
        by_domain: {},
        unsure_answer_count: 1,
        unsure_variants: {
            unsure_as_zero: {
                execution_mode: "survey",
                audit: null,
                survey: {
                    provision_total: 0,
                    provision_total_max: 2,
                    variety_total: 0,
                    variety_total_max: 1,
                    challenge_total: 0,
                    challenge_total_max: 0,
                    sociability_total: 0,
                    sociability_total_max: 0,
                    play_value_total: 0,
                    play_value_total_max: 2,
                    usability_total: 0,
                    usability_total_max: 0,
                },
                overall: null,
                by_section: {},
                by_domain: {},
            },
            unsure_as_max: {
                execution_mode: "survey",
                audit: null,
                survey: {
                    provision_total: 2,
                    provision_total_max: 2,
                    variety_total: 1,
                    variety_total_max: 1,
                    challenge_total: 0,
                    challenge_total_max: 0,
                    sociability_total: 0,
                    sociability_total_max: 0,
                    play_value_total: 2,
                    play_value_total_max: 2,
                    usability_total: 0,
                    usability_total_max: 0,
                },
                overall: null,
                by_section: {},
                by_domain: {},
            },
        },
    },
    progress: {
        required_pre_audit_complete: true,
        visible_section_count: 1,
        completed_section_count: 0,
        total_visible_questions: 1,
        answered_visible_questions: 0,
        ready_to_submit: false,
        sections: [
            {
                section_key: targetSection.section_key,
                title: targetSection.title,
                visible_question_count: targetSection.questions.length,
                answered_question_count: 1,
                is_complete: false,
            },
        ],
    },
};

const parsedSession = auditSessionSchema.parse(sessionFixture);
assert(parsedSession.aggregate.revision === 3, "Expected aggregate revision to parse.");
assert(hasUnsureVariants(parsedSession.scores), "Expected unsure variants to parse.");
assert(
    getEffectiveAuditScoreTotals(parsedSession.scores, "unsure_as_max")?.play_value_total === 2,
    "Expected unsure-as-max totals to parse.",
);
assert(parsedSession.sections[targetSection.section_key] !== undefined, "Expected section payload.");

const visibleSections = getVisibleSections(
    parsedSession.instrument,
    parsedSession.selected_execution_mode,
    Object.fromEntries(
        Object.entries(parsedSession.sections).map(([sectionKey, sectionState]) => [
            sectionKey,
            sectionState.responses,
        ]),
    ),
);
assert(visibleSections.length > 0, "Expected visible sections for survey mode.");

getInstrumentSectionLocalProgress(parsedSession, visibleSections[0]);

const hiddenFollowUpAnswers = getActiveScaleKeysForQuestion(targetQuestion, {
    provision: "no",
});
assert(
    hiddenFollowUpAnswers.length === 1 && hiddenFollowUpAnswers[0] === "provision",
    "Expected provision=no to hide follow-up scales.",
);

const parsedSaveAck = auditDraftSaveSchema.parse({
    audit_id: sessionFixture.audit_id,
    status: "IN_PROGRESS",
    schema_version: 1,
    revision: 4,
    draft_progress_percent: 18.75,
    saved_at: "2026-03-24T10:05:00Z",
});
assert(parsedSaveAck.revision === 4, "Expected draft save ack revision to parse.");

const parsedScoreTotals = auditScoreTotalsSchema.parse({
    provision_total: 1,
    provision_total_max: 2,
    variety_total: 1,
    variety_total_max: 2,
    challenge_total: 2,
    challenge_total_max: 2,
    sociability_total: 1,
    sociability_total_max: 2,
    play_value_total: 6,
    play_value_total_max: 18,
    usability_total: 6,
    usability_total_max: 18,
});
assert(parsedScoreTotals.play_value_total_max === 18, "Expected max score fields to parse.");
assert(getCombinedConstructScore(parsedScoreTotals) === 12, "Expected combined construct total to remain stable.");

const scoreFixtureQuestion = {
    question_key: "q_construct",
    mode: "audit",
    constructs: ["play_value", "usability"],
    domains: ["Construct Demo"],
    section_key: "section_constructs",
    prompt: "Demo prompt",
    question_type: "scaled",
    required: true,
    display_if: null,
    options: [],
    scales: [
        {
            key: "provision",
            title: "Provision",
            prompt: "Provision prompt",
            options: [
                {
                    key: "no",
                    label: "No",
                    addition_value: 0,
                    boost_value: 0,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: false,
                },
                {
                    key: "some",
                    label: "Some",
                    addition_value: 1,
                    boost_value: 1,
                    allows_follow_up_scales: true,
                    is_not_applicable: false,
                    is_unsure: false,
                },
                {
                    key: "a_lot",
                    label: "A lot",
                    addition_value: 2,
                    boost_value: 2,
                    allows_follow_up_scales: true,
                    is_not_applicable: false,
                    is_unsure: false,
                },
            ],
        },
        {
            key: "variety",
            title: "Variety",
            prompt: "Variety prompt",
            options: [
                {
                    key: "not_applicable",
                    label: "Not applicable",
                    addition_value: 0,
                    boost_value: 1,
                    allows_follow_up_scales: false,
                    is_not_applicable: true,
                    is_unsure: false,
                },
                {
                    key: "some_variety",
                    label: "Some variety",
                    addition_value: 2,
                    boost_value: 2,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: false,
                },
                {
                    key: "a_lot_of_variety",
                    label: "A lot of variety",
                    addition_value: 3,
                    boost_value: 3,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: false,
                },
                {
                    key: "unsure",
                    label: "Unsure",
                    addition_value: 0,
                    boost_value: 1,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: true,
                },
            ],
        },
        {
            key: "challenge",
            title: "Challenge",
            prompt: "Challenge prompt",
            options: [
                {
                    key: "not_applicable",
                    label: "Not applicable",
                    addition_value: 0,
                    boost_value: 1,
                    allows_follow_up_scales: false,
                    is_not_applicable: true,
                    is_unsure: false,
                },
                {
                    key: "some_challenge",
                    label: "Some challenge",
                    addition_value: 2,
                    boost_value: 2,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: false,
                },
                {
                    key: "a_lot_of_challenge",
                    label: "A lot of challenge",
                    addition_value: 3,
                    boost_value: 3,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: false,
                },
            ],
        },
        {
            key: "sociability",
            title: "Sociability",
            prompt: "Sociability prompt",
            options: [
                {
                    key: "none",
                    label: "None",
                    addition_value: 1,
                    boost_value: 1,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: false,
                },
                {
                    key: "pairs",
                    label: "Pairs",
                    addition_value: 2,
                    boost_value: 2,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: false,
                },
                {
                    key: "groups",
                    label: "Groups",
                    addition_value: 3,
                    boost_value: 3,
                    allows_follow_up_scales: false,
                    is_not_applicable: false,
                    is_unsure: false,
                },
            ],
        },
    ],
};

const calculatedQuestionScores = calculateQuestionScores(scoreFixtureQuestion, {
    provision: "some",
    variety: "some_variety",
    challenge: "a_lot_of_challenge",
    sociability: "pairs",
});
assert(calculatedQuestionScores.provision_total === 1, "Expected question score helper to return provision total.");
assert(
    calculatedQuestionScores.play_value_total_max === 18,
    "Expected question score helper to return construct max.",
);
const excludedUnsureScores = calculateQuestionScores(scoreFixtureQuestion, {
    provision: "some",
    variety: "unsure",
});
assert(excludedUnsureScores.variety_total_max === 0, "Expected unsure answers to be excluded by default.");
assert(formatPercentage(6, 18) === "33.3%", "Expected percentage formatter to use compact percent text.");

console.log("Mobile audit contract verification passed.");
