/**
 * Regenerates tests/fixtures/design-tokens-baseline.json from brand/tokens.json.
 *
 * The fixture is a drift guard, not a design document: design-tokens.spec.ts asserts
 * the generated palettes still resolve to exactly these values, so an accidental edit
 * fails a test instead of silently changing the app. When the palette changes on
 * purpose it changes in copa-frontend, which owns brand/tokens.json - re-vendor the
 * file, run this, and commit the fixture alongside it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(resolve(root, "brand/tokens.json"), "utf8"));
const target = resolve(root, "tests/fixtures/design-tokens-baseline.json");

const scaleAccents = { ...tokens.scales.shared };
for (const [name, platforms] of Object.entries(tokens.scales.platformOverrides ?? {})) {
    if (platforms.mobile) scaleAccents[name] = platforms.mobile;
}

const existing = JSON.parse(readFileSync(target, "utf8"));
const baseline = {
    _comment: existing._comment,
    palettes: tokens.mobile.palettes,
    tamaguiRamp: tokens.mobile.tamaguiRamp,
    scaleAccents: Object.fromEntries(
        ["provision", "variety", "challenge", "sociability"].map((key) => [key, scaleAccents[key]]),
    ),
    constructAccents: tokens.scales.constructs,
    defaultTheme: tokens.mobile.defaultTheme,
};

writeFileSync(target, `${JSON.stringify(baseline, null, 4)}\n`);
console.log(`token baseline - wrote ${target}`);
