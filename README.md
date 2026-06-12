# COPA mobile

[![Mobile Quality](https://github.com/Audit-Tools-DECA-Lab-Cornell/audit-tools-playspace-mobile/actions/workflows/mobile-quality.yml/badge.svg?branch=master)](https://github.com/Audit-Tools-DECA-Lab-Cornell/audit-tools-playspace-mobile/actions/workflows/mobile-quality.yml)
![Android Build](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/pratyush1712/d2ca48d8459d001342f0ab89cab24d69/raw/copa-android.json&cacheSeconds=300)
![Expo SDK](https://img.shields.io/badge/Expo-SDK%2055-000020?logo=expo&logoColor=white)

> Auditor-facing mobile app for the Comprehensive Outdoor Playspace Audit (COPA) Tool.

Built with **Expo + Expo Router + Tamagui** for native iOS and Android field use. Supports offline draft capture, later sync, submitted-audit reporting, and client-side export.

---

## Table of Contents

- [Product Scope](#product-scope)
- [Architecture](#architecture)
- [Offline-First Architecture](#offline-first-architecture)
- [Feature Set](#feature-set)
- [Localization](#localization)
- [Route Map](#route-map)
- [Project Structure](#project-structure)
- [Data Contract & Scoring](#data-contract--scoring)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [Quality Gates](#quality-gates)
- [Current Limitations](#current-limitations)
- [Related Docs](#related-docs)

---

## Product Scope

### In scope

| Responsibility                                           |
| -------------------------------------------------------- |
| Auditor sign-in and session restoration                  |
| Assigned place discovery                                 |
| Starting or resuming COPA audits                         |
| Offline-first audit drafting and later sync              |
| Submitted-audit reporting and export                     |
| Lightweight mobile detail surfaces for places and audits |

### Out of scope

The following remain **separate web/backend planning tracks** and are not part of this app:

- Manager web dashboards

---

## Architecture

### Tech Stack

| Layer                 | Technology         |
| --------------------- | ------------------ |
| Framework             | Expo + Expo Router |
| UI                    | Tamagui            |
| Language              | TypeScript         |
| Validation            | Zod                |
| Audit runtime state   | Legend State       |
| On-device persistence | MMKV               |
| Auth session storage  | Expo Secure Store  |

### Why Legend State + MMKV

The audit flow is **offline-first**, with a clear three-layer state model:

| Layer                             | Role                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- |
| **Observable runtime state**      | Legend State observables: live in-session audit state                     |
| **Persistent on-device storage**  | MMKV: durable snapshot; dirty version maps track pending patches          |
| **Server-synced source of truth** | Background + foreground sync flush patches when connectivity is available |

This replaces the older custom audit persistence path and gives the app a clear separation of concerns.

---

## Offline-First Architecture

- **Audit state** is managed by Legend State observables (`@legendapp/state`) with automatic debounced persistence to MMKV (`react-native-mmkv`). The audit store (`stores/audit-store.ts`) exposes a Zustand-compatible selector hook backed by Legend State's fine-grained reactivity.
- **Preferences** are persisted to MMKV via `lib/preferences/storage.ts`.
- **Auth sessions** remain in Expo Secure Store for Keychain/Keystore security.
- **Background sync** (`lib/audit/background-sync.ts`) and **foreground sync** (`lib/audit/use-audit-sync.ts`) flush dirty audit edits to the REST API when connectivity is available.
- On first launch after migration, the hydrate flow reads legacy Secure Store data and migrates it to MMKV automatically.

---

## Feature Set

### Audit Execution

- Start or resume an audit for an assigned place
- Select or inherit execution mode: `audit`, `survey`, or `both`
- Complete pre-audit questions
- Answer section questions with provision-gated follow-up scales
- Add section notes
- Auto-save locally and resume later
- Submit only when visible questions and pre-audit are complete

### Place & Report Surfaces

- **Execute** tab: current field workflow
- **Places** tab: search, filter, and sort
- **Reports** tab: search, filter, sort, preview, and export
- Place detail screen
- Audit detail screen

### Export

Submitted audits can be exported client-side in:

| Format |                                    |
| ------ | ---------------------------------- |
| `CSV`  | Spreadsheet-compatible flat export |
| `XLSX` | Excel workbook                     |
| `PDF`  | Formatted audit report             |

Each export includes: audit overview, pre-audit answers, PVUA guidance / scale legend, and a PVUA-style response matrix.

---

## Localization

### Current Approach

- Shared UI strings (labels, buttons, messages) live in locale JSON files under `lib/i18n/locales/<lang>/`.
- **Instrument copy is server-authoritative in every language** — there are no client-side instrument text overlays. The single client seam for other languages is the `lang` parameter on the language-aware fetch in `lib/services/instrument-sync.ts`.
- `useLocalizedInstrument()` returns the synced (or audit-scoped) instrument **as-is** — no overlay.
- For offline first launch the bundled instrument (`assets/bundled-instrument.json`, loaded via `lib/audit/bundled-instrument.ts`) is the fallback.

### Rule: i18n for user-facing copy only

| ✅ Use i18n for     | ❌ Do not use i18n for               |
| ------------------- | ------------------------------------ |
| Button labels       | Storage keys                         |
| Section headings    | File path builders                   |
| Error messages      | CSS/HTML-like strings                |
| User-facing prompts | Code-shaped identifiers              |
|                     | Technical string composition helpers |

---

## Route Map

```
app/
├── (tabs)/
│   ├── execute/
│   │   ├── index.tsx
│   │   └── [placeId]/index.tsx
│   ├── places.tsx
│   ├── reports.tsx
│   └── settings.tsx
├── place/[placeId].tsx
└── report/[auditId].tsx
```

---

## Project Structure

```
app/              Expo Router screens and route layouts
components/       Shared UI and design primitives
components/ui/    Reusable search/filter/collapsible/stat/export controls
lib/audit/        Audit API, export logic, helpers, selectors, sync helpers
lib/i18n/         i18n bootstrapping and instrument localization
lib/storage/      MMKV storage and persistence adapter
stores/           Legend State (audit) + Zustand (auth/places/prefs)
assets/           Static assets
```

---

## Data Contract & Scoring

Audit session payloads are validated with Zod in `lib/audit/types.ts`. Assigned-place payloads are validated with Zod in `lib/audit/places-api.ts`.

### Typed Payload Fields

The app consumes the following typed fields:

**Session payloads:** `meta`, `pre_audit`, `sections`, `scores`, `progress`

**Assigned-place summaries:** `audit_id`, `summary_score`, `score_totals`, `progress_percent`, `place_audit_status`, `place_survey_status`, `audit_scores`, `survey_scores`, `overall_scores`

### Score Displays

Score displays use **raw total buckets**, not percent summaries:

| Type             | Fields                                                       |
| ---------------- | ------------------------------------------------------------ |
| Construct totals | `play_value_total` · `usability_total` · `sociability_total` |
| Column totals    | `provision_total` · `variety_total` · `challenge_total`      |
| Compact labels   | `PV` · `U` · `S` · `Q` · `V` · `C`                           |

Place-level summary surfaces now render explicit `PV` / `U` pairs from `audit_scores`, `survey_scores`, and `overall_scores` instead of collapsing the score into `PV + U`.

---

## Quick Start

### Prerequisites

| Tool           | Version                    |
| -------------- | -------------------------- |
| Bun            | `1.3.x`                    |
| Node.js        | `20+`                      |
| Xcode          | Latest (iOS dev)           |
| Android Studio | Latest + SDK (Android dev) |

### Install

```bash
bun install
```

### Configure API URL

```bash
EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
```

Defaults to `http://127.0.0.1:8000` if omitted.

### Optional UI Feature Flags

```bash
EXPO_PUBLIC_GLASS_UI_ENABLED=true
```

These flags control visual glass surfaces.

### Run

```bash
bun run start      # start Expo dev server
bun run ios        # run iOS app
bun run android    # run Android app
```

> `bun run web` exists for tooling/dev purposes only. The product target is native mobile, not a web deployment.

---

## Scripts

### Development

| Command             | Description                 |
| ------------------- | --------------------------- |
| `bun run start`     | Start Expo dev server       |
| `bun run ios`       | Run iOS app                 |
| `bun run android`   | Run Android app             |
| `bun run web`       | Local web target (dev only) |
| `bun run build:web` | Export static web build     |
| `bun run doctor`    | Expo diagnostics            |

### Code Quality

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `bun run typecheck`    | TypeScript checks               |
| `bun run lint`         | ESLint checks                   |
| `bun run lint:fix`     | Auto-fix ESLint issues          |
| `bun run format`       | Prettier write                  |
| `bun run format:check` | Prettier check                  |
| `bun run check`        | typecheck + lint + format check |
| `bun run ci:quality`   | Local quality pipeline          |

### i18n

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `bun run i18n:extract` | Extract user-facing translation keys |
| `bun run i18n:check`   | Inspect translation status           |

### Versioning & Releases

The app is **pre-1.0 beta** — the display version stays under `1.0` until public GA. Bump it with the scheme below (`scripts/bump-version.mjs`); EAS owns the Android `versionCode` (do not set it by hand).

| Command                 | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `bun run version:show`  | Print the current app version                               |
| `bun run version:minor` | "Major" change (e.g. `0.3.4 → 0.4.0`) — usually a new build |
| `bun run version:patch` | "Small" change (e.g. `0.3.4 → 0.3.5`) — often OTA-able      |

`runtimeVersion` is `fingerprint`, so a JS-only patch ships over-the-air (`eas update`) while a native/minor change needs `bun run eas:android` → `bun run submit:android`. The bump script prints which. Full policy: `.claude/memory/mobile-versioning.md`.

---

## Quality Gates

### Pre-commit

This repo uses `husky` + `lint-staged`:

| File type              | Hook                  |
| ---------------------- | --------------------- |
| TS / JS                | ESLint fix + Prettier |
| JSON / Markdown / YAML | Prettier              |

If hooks are missing locally:

```bash
bun run prepare
```

### Recommended Local Validation

```bash
bun run check
bun run doctor
```

### Dependency Governance

Dependabot is configured in `.github/dependabot.yml` for:

- npm dependencies
- GitHub Actions dependencies

---

## Current Limitations

- Newest locale additions still need translation coverage in some non-English locales
- Mobile does not create separate manager-authored survey submissions; auditors submit `audit`, `survey`, or `both`
- Mobile analytics are intentionally lightweight: the backend surface is centered on assigned-place summaries plus per-audit detail

---

## Related Docs

| File                                       | Description                               |
| ------------------------------------------ | ----------------------------------------- |
| `../../PLANNING.md`                        | Cross-project status and priorities       |
| `../../instructions/playspace/PLANNING.md` | Playspace roadmap and boundaries          |
| `../../instructions/playspace/SCORING.md`  | Current scoring rules                     |
| `IOS_BUILD_TROUBLESHOOTING.md`             | Native iOS build fixes and recovery steps |
| `MOBILE_OFFLINE_FLOW.mmd`                  | Local save and sync flow (Mermaid)        |
