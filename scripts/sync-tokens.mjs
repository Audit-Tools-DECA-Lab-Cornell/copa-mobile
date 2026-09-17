#!/usr/bin/env node
/**
 * Generates `lib/design-system.generated.ts` and `themes.generated.ts` from
 * `brand/tokens.json`.
 *
 * `brand/tokens.json` in THIS repo is a VENDORED copy; copa-frontend owns the
 * canonical file and stamps `meta.checksum` with a hash of the token payload.
 * This script refuses to build or pass when the stamp does not match the copy's
 * own contents, so editing colour here - rather than in copa-frontend - is a
 * hard failure instead of a silent divergence between the two apps.
 *
 * What each layer catches:
 *   - this script      : a locally edited vendored copy, or stale generated TS
 *   - verify-token-sync: a vendored copy that is simply out of date
 *
 * To change a colour: change it in copa-frontend, run its `tokens:build`, copy
 * the stamped file here, then run `bun run tokens:build`.
 *
 * Usage:
 *   bun run tokens:build   # write the generated files
 *   bun run tokens:check   # fail if they are stale or tampered with (CI)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = resolve(ROOT, "brand/tokens.json");
const CHECK = process.argv.includes("--check");
const INDENT = "    ";

/**
 * Stable checksum over the token payload, ignoring `meta` - which is where
 * copa-frontend stamps the checksum. Must match copa-frontend's implementation.
 */
function checksum(tokens) {
    const { meta: _meta, ...payload } = tokens;
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

function entries(map, depth) {
    const pad = INDENT.repeat(depth);
    return Object.entries(map)
        .map(([key, value]) => `${pad}${key}: ${JSON.stringify(value)}`)
        .join(",\n");
}

function header(tokens, regenerate) {
    return `/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source:      brand/tokens.json (checksum ${checksum(tokens)})
 * Regenerate:  ${regenerate}
 * Verify:      bun run tokens:check
 *
 * brand/tokens.json here is a VENDORED copy of copa-frontend/brand/tokens.json.
 * Colour is defined once, for both clients. Editing this file by hand will be
 * reverted by the next generator run and will fail CI.
 */`;
}

function renderDesignSystem(tokens) {
    const palettes = Object.entries(tokens.mobile.palettes)
        .map(([name, palette]) => `${INDENT}${name}: {\n${entries(palette, 2)}\n${INDENT}}`)
        .join(",\n");

    const scales = { ...tokens.scales.shared };
    for (const [key, value] of Object.entries(tokens.scales.platformOverrides ?? {})) {
        if (value.mobile !== null && value.mobile !== undefined) scales[key] = value.mobile;
    }
    const ordered = ["provision", "variety", "challenge", "sociability"];
    const scaleEntries = entries(
        Object.fromEntries(ordered.filter((key) => key in scales).map((key) => [key, scales[key]])),
        1,
    );

    return `${header(tokens, "bun run tokens:build")}

export const GENERATED_PALETTES = {
${palettes},
} as const;

/** Canonical PV scale accents for this platform, resolved from brand/tokens.json. */
export const GENERATED_SCALE_ACCENTS = {
${scaleEntries},
} as const;

/** Headline construct accents (Play Value / Usability). Mobile-only today - see knownDrift. */
export const GENERATED_CONSTRUCT_ACCENTS = {
${entries(tokens.scales.constructs, 1)},
} as const;
`;
}

function renderThemes(tokens) {
    const ramp = (values) => values.map((value) => `${INDENT}${JSON.stringify(value)}`).join(",\n");
    return `${header(tokens, "bun run tokens:build")}

/** Tamagui 12-step ramps. These drive every \`$1\`-\`$12\` token used across the app. */
export const GENERATED_DARK_RAMP: string[] = [
${ramp(tokens.mobile.tamaguiRamp.dark)},
];

export const GENERATED_LIGHT_RAMP: string[] = [
${ramp(tokens.mobile.tamaguiRamp.light)},
];
`;
}

/**
 * Recognised CSS colour forms. The generator emits these verbatim into TypeScript
 * and, on web, into CSS custom properties - where a malformed value fails silently
 * (the declaration is dropped and the element inherits). Nothing downstream can
 * catch that: `tsc` sees a string, and the baseline tests only reject empty values.
 * Phase 3 hand-edits ~300 of these, so the gate belongs here.
 * Kept identical to copa-frontend's copy - both scripts read the same token file.
 */
const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNCTIONAL = /^(rgb|rgba|hsl|hsla)\(([^()]*)\)$/;

/** @returns An error string when `value` is not a usable CSS colour, else null. */
function colorError(value) {
    if (typeof value !== "string") return `expected a string, got ${typeof value}`;
    const trimmed = value.trim();
    if (trimmed === "") return "empty string";
    if (trimmed !== value) return "has leading or trailing whitespace";
    if (HEX.test(trimmed)) return null;

    const functional = FUNCTIONAL.exec(trimmed);
    if (!functional) return "not a hex or rgb()/rgba()/hsl()/hsla() colour";

    const [, fn, body] = functional;
    const parts = body
        .split(/[,/]/)
        .map((part) => part.trim())
        .filter((part) => part !== "");
    if (parts.length < 3 || parts.length > 4) return `${fn}() needs 3 or 4 components, got ${parts.length}`;
    for (const part of parts) {
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)%?$/.test(part)) return `${fn}() component "${part}" is not a number`;
    }
    if (fn.startsWith("hsl") && !parts[1].endsWith("%")) return "hsl() saturation must be a percentage";
    if (fn.startsWith("hsl") && !parts[2].endsWith("%")) return "hsl() lightness must be a percentage";
    return null;
}

/**
 * Validates the whole token file - shape and colour syntax - before anything is
 * generated from it. Runs in both modes, so a malformed token can neither be
 * built nor pass CI.
 */
function validate(tokens) {
    const errors = [];
    const check = (path, value) => {
        const error = colorError(value);
        if (error) errors.push(`${path}: ${JSON.stringify(value)} - ${error}`);
    };

    const web = tokens.web?.palettes ?? {};
    let webKeys = null;
    for (const [theme, contrasts] of Object.entries(web)) {
        for (const [contrast, palette] of Object.entries(contrasts)) {
            const keys = Object.keys(palette).sort();
            if (webKeys === null) webKeys = keys;
            else if (keys.join() !== webKeys.join()) {
                errors.push(`web.palettes.${theme}.${contrast}: token set differs from the other modes`);
            }
            for (const [token, value] of Object.entries(palette)) {
                check(`web.palettes.${theme}.${contrast}.${token}`, value);
            }
        }
    }

    const mobile = tokens.mobile?.palettes ?? {};
    let mobileKeys = null;
    for (const [mode, palette] of Object.entries(mobile)) {
        const keys = Object.keys(palette).sort();
        if (mobileKeys === null) mobileKeys = keys;
        else if (keys.join() !== mobileKeys.join()) {
            errors.push(`mobile.palettes.${mode}: token set differs from the other modes`);
        }
        for (const [token, value] of Object.entries(palette)) {
            check(`mobile.palettes.${mode}.${token}`, value);
        }
    }

    for (const [name, ramp] of Object.entries(tokens.mobile?.tamaguiRamp ?? {})) {
        if (!Array.isArray(ramp) || ramp.length !== 12) {
            errors.push(`mobile.tamaguiRamp.${name}: expected 12 steps, got ${ramp?.length ?? "none"}`);
        }
        (ramp ?? []).forEach((value, index) => check(`mobile.tamaguiRamp.${name}[${index}]`, value));
    }

    for (const [token, value] of Object.entries(tokens.scales?.shared ?? {})) {
        check(`scales.shared.${token}`, value);
    }
    for (const [token, platforms] of Object.entries(tokens.scales?.platformOverrides ?? {})) {
        for (const [platform, value] of Object.entries(platforms)) {
            if (value !== null && value !== undefined) check(`scales.platformOverrides.${token}.${platform}`, value);
        }
    }
    for (const [token, value] of Object.entries(tokens.scales?.constructs ?? {})) {
        check(`scales.constructs.${token}`, value);
    }

    if (errors.length > 0) {
        console.error(`tokens: brand/tokens.json has ${errors.length} invalid token(s):`);
        for (const error of errors) console.error(`  ${error}`);
        process.exit(1);
    }
}

const tokens = JSON.parse(readFileSync(TOKENS, "utf8"));
validate(tokens);
const expected = checksum(tokens);

// This repo does not own brand/tokens.json, so a payload that disagrees with its
// stamp means the copy was edited here. Refuse in BOTH modes: building from it
// would bake a colour into the app that copa-frontend never published.
if (tokens.meta?.checksum !== expected) {
    console.error(
        `tokens: brand/tokens.json is not a faithful copy of copa-frontend's canonical file.\n` +
            `  stamped meta.checksum : ${tokens.meta?.checksum ?? "none"}\n` +
            `  actual payload hash   : ${expected}\n` +
            `Colour is owned by copa-frontend. Change it there, run its tokens:build, copy the\n` +
            `stamped file here, then run \`bun run tokens:build\`.`,
    );
    process.exit(1);
}

const outputs = [
    [resolve(ROOT, "lib/design-system.generated.ts"), renderDesignSystem(tokens)],
    [resolve(ROOT, "themes.generated.ts"), renderThemes(tokens)],
];

let stale = false;
for (const [target, output] of outputs) {
    if (CHECK) {
        let current = "";
        try {
            current = readFileSync(target, "utf8");
        } catch {
            console.error(`tokens:check - ${target} is missing. Run \`bun run tokens:build\`.`);
            stale = true;
            continue;
        }
        if (current !== output) {
            console.error(`tokens:check - ${target} is stale. Run \`bun run tokens:build\` and commit the result.`);
            stale = true;
        }
    } else {
        writeFileSync(target, output);
        console.log(`tokens:build - wrote ${target}`);
    }
}

if (CHECK && stale) process.exit(1);
if (CHECK) console.log(`tokens:check - up to date (brand/tokens.json checksum ${checksum(tokens)}).`);
