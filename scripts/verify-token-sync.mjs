#!/usr/bin/env node
/**
 * Verifies this repo's vendored `brand/tokens.json` still matches the canonical
 * copy in copa-frontend.
 *
 * Compares the FILE BYTES: the vendored copy is meant to be verbatim, so metadata
 * and formatting count too, not only the colour payload.
 *
 * Colour is defined once, in copa-frontend/brand/tokens.json, and vendored here.
 * Nothing about a vendored file stops it going stale on its own, so this is the
 * check that catches it - the failure mode otherwise is the two apps quietly
 * drifting apart, which is exactly how `challenge` ended up a different colour
 * on each client (see `knownDrift` in brand/tokens.json).
 *
 * Usage:
 *   node scripts/verify-token-sync.mjs --path ../copa-frontend/brand/tokens.json
 *   node scripts/verify-token-sync.mjs --url  https://raw.githubusercontent.com/<org>/copa-frontend/master/brand/tokens.json
 *
 * With --url, set GITHUB_TOKEN for a private repository.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function checksum(tokens) {
    const { meta: _meta, ...payload } = tokens;
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

function arg(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? undefined : process.argv[index + 1];
}

const localPath = arg("--path");
const remoteUrl = arg("--url");

if (!localPath && !remoteUrl) {
    console.error("verify-token-sync: pass --path <file> or --url <raw url> pointing at copa-frontend/brand/tokens.json.");
    process.exit(2);
}

const mineRaw = readFileSync(resolve(ROOT, "brand/tokens.json"), "utf8");

let theirsRaw;
if (localPath) {
    theirsRaw = readFileSync(resolve(process.cwd(), localPath), "utf8");
} else {
    const headers = { Accept: "application/vnd.github.raw" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const response = await fetch(remoteUrl, { headers });
    if (!response.ok) {
        console.error(`verify-token-sync: could not fetch canonical tokens (HTTP ${response.status}).`);
        process.exit(2);
    }
    theirsRaw = await response.text();
}

// Compare the FILE BYTES, not just the colour payload. The vendored copy is meant
// to be verbatim, so `meta` (version, phase, the canonical checksum) and formatting
// are part of the contract: a payload-only comparison would call the files in sync
// while `meta.version` or `meta.phase` disagreed.
if (mineRaw === theirsRaw) {
    const mine = JSON.parse(mineRaw);
    console.log(`verify-token-sync: in sync with copa-frontend (checksum ${checksum(mine)}).`);
    process.exit(0);
}

// They differ. Say HOW, so the message points at the actual remedy.
let detail;
try {
    const mine = JSON.parse(mineRaw);
    const theirs = JSON.parse(theirsRaw);
    const mineSum = checksum(mine);
    const theirsSum = checksum(theirs);
    detail =
        mineSum === theirsSum
            ? `Colour values are identical (payload ${mineSum}); the files differ in metadata or formatting.\n` +
              `  copa-mobile   meta: ${JSON.stringify(mine.meta)}\n` +
              `  copa-frontend meta: ${JSON.stringify(theirs.meta)}`
            : `Colour values DIFFER.\n` +
              `  copa-mobile   payload -> ${mineSum}\n` +
              `  copa-frontend payload -> ${theirsSum}`;
} catch {
    detail = "One of the files is not valid JSON.";
}

console.error(`verify-token-sync: FAILED - the vendored copy is not verbatim.\n  ${detail}\nCopy the canonical file over and run \`bun run tokens:build\`.`);
process.exit(1);
