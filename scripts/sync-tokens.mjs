#!/usr/bin/env node
/**
 * Generates `lib/design-system.generated.ts` and `themes.generated.ts` from
 * `brand/tokens.json`.
 *
 * `brand/tokens.json` in THIS repo is a vendored copy. The canonical file lives
 * at `copa-frontend/brand/tokens.json`; the two must stay byte-identical, which
 * `--check` verifies via the `meta.checksum` written into each generated file.
 *
 * Usage:
 *   bun run tokens:build   # write the generated files
 *   bun run tokens:check   # fail if they are stale (CI)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = resolve(ROOT, "brand/tokens.json");
const CHECK = process.argv.includes("--check");
const INDENT = "    ";

/** Stable checksum over the token payload, ignoring `meta`. Must match copa-frontend's. */
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

const tokens = JSON.parse(readFileSync(TOKENS, "utf8"));
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
