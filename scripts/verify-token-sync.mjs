#!/usr/bin/env node
/**
 * Verifies this repo's vendored `brand/tokens.json` still matches the canonical
 * copy in copa-frontend.
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

const mine = JSON.parse(readFileSync(resolve(ROOT, "brand/tokens.json"), "utf8"));

let theirs;
if (localPath) {
    theirs = JSON.parse(readFileSync(resolve(process.cwd(), localPath), "utf8"));
} else {
    const headers = { Accept: "application/vnd.github.raw" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const response = await fetch(remoteUrl, { headers });
    if (!response.ok) {
        console.error(`verify-token-sync: could not fetch canonical tokens (HTTP ${response.status}).`);
        process.exit(2);
    }
    theirs = JSON.parse(await response.text());
}

const mineSum = checksum(mine);
const theirsSum = checksum(theirs);

if (mineSum !== theirsSum) {
    console.error(
        `verify-token-sync: FAILED.\n` +
            `  copa-mobile   brand/tokens.json -> ${mineSum}\n` +
            `  copa-frontend brand/tokens.json -> ${theirsSum}\n` +
            `Copy the canonical file over and run \`bun run tokens:build\`.`,
    );
    process.exit(1);
}

console.log(`verify-token-sync: in sync with copa-frontend (checksum ${mineSum}).`);
