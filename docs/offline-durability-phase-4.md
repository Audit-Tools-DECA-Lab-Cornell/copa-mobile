# Offline Durability — Phase 4 (Instrument + Trust) Implementation Spec

Status as of 2026-06-12:

- **Instrument server-authoritative** — DONE. All client-side instrument
  overlays were removed; `useLocalizedInstrument()` returns the synced /
  audit-scoped instrument as-is (mobile commit `f4c6c44`).
- **Export "panic button"** — ALREADY EXISTS. `components/playspace-audit/audit-export-card.tsx`
  (`shareInProgressAuditExport` → CSV / Excel / PDF) is surfaced on the audit
  overview (`app/execute/[placeId]/overview.tsx`) and the execute entry
  (`app/execute/[placeId]/index.tsx`). An auditor can always export a local
  backup of an in-progress audit, so data is never trapped on one device. No
  new work required; optionally make it more prominent when sync is failing.
- **Offline bundled-instrument fallback bug** — FIXED 2026-06-12. The asset is
  the `{ "en": { ...instrument } }` wrapper; `getBundledInstrument()` was parsing
  the wrapper (not `.en`) and always returning null, silently disabling the
  offline first-launch fallback. Fixed in `lib/audit/bundled-instrument.ts` with
  a regression test (`tests/bundled-instrument.spec.ts`).

The remaining item is the CI bundle-freshness gate.

---

## 4a. CI bundle-freshness gate (the open item)

Problem: `assets/bundled-instrument.json` is the offline fallback shipped in the
binary. It must not silently drift from the active instrument. The old
`scripts/export_instrument_bundle.mjs` generator was removed with the overlay
cleanup, so today the bundle is hand-maintained — exactly the drift risk.

### Step 1 — re-establish a single generator

Decide the canonical source. Options:

1. **Backend active instrument** (best): add a backend script/endpoint that emits
   the active instrument JSON, and a mobile script that writes
   `assets/bundled-instrument.json` (wrapped as `{ "en": <payload> }`) from it.
   The backend already has `scripts/sync_canonical_instruments_from_db.py` and
   `instruments/instrument.json` (workspace canonical) — extend that pipeline.
2. **Workspace canonical** (`instruments/instrument.json`): simpler but only as
   fresh as that file.

Generator `scripts/generate_bundled_instrument.mjs`:

```js
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(root, "..", "instruments", "instrument.json"); // or backend artifact
const TARGET = resolve(root, "assets", "bundled-instrument.json");

function buildBundle() {
    const canonical = JSON.parse(readFileSync(SOURCE, "utf8"));
    // The bundle is the English payload wrapped under "en" (matches the loader).
    return { en: canonical.en };
}

const check = process.argv.includes("--check");
const next = JSON.stringify(buildBundle(), null, 4) + "\n";
if (check) {
    const current = readFileSync(TARGET, "utf8");
    if (current !== next) {
        console.error("bundled-instrument.json is stale. Run: bun scripts/generate_bundled_instrument.mjs");
        process.exit(1);
    }
    console.log("bundled-instrument.json is up to date.");
} else {
    writeFileSync(TARGET, next);
    console.log("Wrote assets/bundled-instrument.json");
}
```

NOTE: align `buildBundle()` with how the bundle is actually shaped — today the
committed bundle differs from `instruments/instrument.json`'s `en` (different
`instrument_name`, `instrument_version` 5.29). Reconcile the source of truth
first, regenerate once, commit, then the check is meaningful. Add a
`playspaceInstrumentSchema`-equivalent validation in the generator so a bad
source fails loudly rather than shipping an unparseable bundle.

### Step 2 — wire into CI

`.github/workflows/mobile-quality.yml` — add a step after install:

```yaml
- name: Check bundled instrument is fresh
  run: bun scripts/generate_bundled_instrument.mjs --check
```

### Step 3 — package.json script

```json
"instrument:bundle": "bun scripts/generate_bundled_instrument.mjs",
"instrument:bundle:check": "bun scripts/generate_bundled_instrument.mjs --check"
```

### Tests / verification

- `bun scripts/generate_bundled_instrument.mjs` then `--check` exits 0.
- Mutate the bundle by hand → `--check` exits 1.
- `tests/bundled-instrument.spec.ts` continues to pass (the regenerated bundle
  still validates against `playspaceInstrumentSchema` via the loader).

---

## Why CI gate is specced, not implemented now

The committed bundle is not a direct copy of any single in-repo source today
(the generator was deleted), so writing a `--check` that compares against the
wrong source would fail CI immediately. Re-establishing the canonical source
(Step 1) is a product decision; once made, the script + CI step above are
turnkey.
