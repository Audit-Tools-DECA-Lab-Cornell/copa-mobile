# Audit Tools Playspace Mobile

Mobile app for auditors to complete playspace field audits on phones/tablets, including offline draft capture and later sync.

Built with Expo + Expo Router + Tamagui, with strict TypeScript, ESLint, and Prettier quality gates.

## Product Scope

- This mobile app supports auditors completing assigned playspace audits in the field.
- Manager planning, manager surveys, and oversight workflows are handled in web tools.
- Mobile users see only assigned places and complete focused field execution flows.
- Mobile currently shows audit-only raw score totals and compact construct summaries.
- Combined scoring that includes manager survey input is planned for a future update.

## Prerequisites

- Bun `1.3.x` (project package manager)
- Node.js `20+` (Expo and tooling compatibility)
- Expo-compatible environment:
    - iOS: Xcode
    - Android: Android Studio + SDK

## Quick Start

1. Install dependencies:

    ```bash
    bun install
    ```

2. (Optional) configure API URL in `.env`:

    ```bash
    EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
    ```

    If omitted, the app defaults to `http://127.0.0.1:8000`.

3. Start the Expo dev server:

    ```bash
    bun run start
    ```

4. Run on a platform:

    ```bash
    bun run ios
    bun run android
    bun run web
    ```

## Scripts

- `bun run start` - start Expo dev server (clears cache)
- `bun run ios` - run iOS native app
- `bun run android` - run Android native app
- `bun run web` - run web target locally
- `bun run build:web` - export static web build
- `bun run doctor` - run Expo diagnostics (`expo-doctor`)
- `bun run perf:web:budget` - enforce web bundle size budget
- `bun run ci:quality` - run complete CI quality pipeline locally

## Code Quality

- `bun run typecheck` - TypeScript checks (`tsc --noEmit`)
- `bun run lint` - ESLint checks
- `bun run lint:fix` - auto-fix ESLint issues when possible
- `bun run format` - format files with Prettier
- `bun run format:check` - verify formatting without writing changes
- `bun run check` - run typecheck + lint + format check

### Pre-Commit Gate

The repository uses `husky` + `lint-staged` for staged-file quality checks:

- TypeScript/JavaScript files run ESLint fix + Prettier
- JSON/Markdown/YAML files run Prettier

If hooks are not active on your machine, run:

```bash
bun run prepare
```

### CI Quality Gate

GitHub Actions workflow: `.github/workflows/mobile-quality.yml`

The pipeline runs:

1. `bun install --frozen-lockfile`
2. `bun run check`
3. `bun run doctor`
4. `bun run build:web`
5. `bun run perf:web:budget`

### Dependency Governance

- Dependabot is configured in `.github/dependabot.yml` for:
    - npm dependencies
    - GitHub Actions dependencies

### PR Quality Policy

- Pull requests use `.github/pull_request_template.md`
- Every PR must include risk notes and verification checklist status

Recommended before opening a PR:

```bash
bun run ci:quality
```

## Project Structure

- `app/` - Expo Router routes/screens
- `components/` - shared UI components
- `lib/` - domain logic (auth/api/demo data)
- `lib/storage/` - MMKV storage instance and Legend State persistence plugin
- `stores/` - state stores (Legend State for audit, Zustand for auth/places/preferences)
- `assets/` - static app assets

## Offline-First Architecture

- **Audit state** is managed by Legend State observables (`@legendapp/state`) with automatic debounced persistence to MMKV (`react-native-mmkv`). The audit store (`stores/audit-store.ts`) exposes a Zustand-compatible selector hook backed by Legend State's fine-grained reactivity.
- **Preferences** are persisted to MMKV via `lib/preferences/storage.ts`.
- **Auth sessions** remain in Expo Secure Store for Keychain/Keystore security.
- **Background sync** (`lib/audit/background-sync.ts`) and **foreground sync** (`lib/audit/use-audit-sync.ts`) flush dirty audit edits to the REST API when connectivity is available.
- On first launch after migration, the hydrate flow reads legacy Secure Store data and migrates it to MMKV automatically.

## Playspace Data Contract And Scoring

- Audit session payloads are validated with Zod in `lib/audit/types.ts`.
- Assigned-place payloads are validated with Zod in `lib/audit/places-api.ts`.
- The app consumes typed Playspace fields for `meta`, `pre_audit`, `sections`, `scores`, and `progress`.
- Score displays use raw total buckets rather than percent summaries:
    - construct totals: `play_value_total`, `usability_total`, `sociability_total`
    - column totals: `quantity_total`, `diversity_total`, `challenge_total`
- Compact score labels currently use short forms such as `PV`, `U`, `S`, `Q`, `D`, and `C`.
- When `score_totals` is not present, the app can still fall back to the legacy `summary_score` field for compatibility with older backend payloads.

## Notes

- Expo Router entry point is configured via `main: "expo-router/entry"` in `package.json`.
- The newest score-summary label keys currently have English strings only; other locales fall back to English until translations are added.
