# Audit Tools Playspace Mobile

Mobile app for auditors to complete playspace field audits on phones/tablets, including offline draft capture and later sync.

Built with Expo + Expo Router + Tamagui, with strict TypeScript, ESLint, and Prettier quality gates.

## Product Scope

- This mobile app supports auditors completing assigned playspace audits in the field.
- Manager planning, manager surveys, and oversight workflows are handled in web tools.
- Mobile users see only assigned places and complete focused field execution flows.
- Audit score is captured in mobile; combined score appears after manager survey data is submitted on web.

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
- `stores/` - Zustand state stores
- `assets/` - static app assets

## Notes

- Expo Router entry point is configured via `main: "expo-router/entry"` in `package.json`.
