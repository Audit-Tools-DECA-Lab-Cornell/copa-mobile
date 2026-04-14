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

const { BASE_PLAYSPACE_INSTRUMENT } = loadTsModule(path.resolve(REPO_ROOT, "lib/instrument.ts"));
const { auditDraftSaveSchema, auditSessionSchema } = loadTsModule(path.resolve(REPO_ROOT, "lib/audit/types.ts"));
const { getActiveScaleKeysForQuestion, getVisibleSections, getInstrumentSectionLocalProgress } = loadTsModule(
    path.resolve(REPO_ROOT, "lib/audit/selectors.ts"),
);

const targetSection = BASE_PLAYSPACE_INSTRUMENT.sections[0];
const targetQuestion = targetSection.questions.find((question) => question.scales.length > 1);
assert(targetQuestion !== undefined, "Expected an instrument question with follow-up scales.");

const sessionFixture = {
    audit_id: "11111111-1111-4111-8111-111111111111",
    audit_code: "PVUA-DEMO-001",
    project_id: "22222222-2222-4222-8222-222222222222",
    project_name: "Demo Project",
    place_id: "33333333-3333-4333-8333-333333333333",
    place_name: "Demo Place",
    place_type: "playground",
    allowed_execution_modes: ["survey", "audit", "both"],
    selected_execution_mode: "survey",
    status: "IN_PROGRESS",
    instrument_key: BASE_PLAYSPACE_INSTRUMENT.instrument_key,
    instrument_version: BASE_PLAYSPACE_INSTRUMENT.instrument_version,
    instrument: BASE_PLAYSPACE_INSTRUMENT,
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
                        quantity: "a_little_bit",
                    },
                    [targetQuestion.question_key]: {
                        quantity: "a_lot",
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
                    quantity: "a_little_bit",
                },
                [targetQuestion.question_key]: {
                    quantity: "a_lot",
                    [targetQuestion.scales[1].key]: targetQuestion.scales[1].options[1].key,
                },
            },
        },
    },
    scores: {
        draft_progress_percent: 12.5,
        execution_mode: "survey",
        overall: null,
        by_section: {},
        by_domain: {},
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
    quantity: "no",
});
assert(
    hiddenFollowUpAnswers.length === 1 && hiddenFollowUpAnswers[0] === "quantity",
    "Expected quantity=no to hide follow-up scales.",
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

console.log("Mobile audit contract verification passed.");
