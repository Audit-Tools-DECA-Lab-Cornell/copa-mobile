const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier/flat");

module.exports = defineConfig([
    expoConfig,
    prettierConfig,
    {
        ignores: [
            "scripts/**",
            "android/**",
            "ios/**",
            ".expo/**",
            "node_modules/**",
            "dist/**",
            "coverage/**",
            "tamagui.generated.css",
            "tamagui-web.css",
            ".agents/**",
            ".cline/**",
            ".cursor/**",
            ".eas/**",
            ".superpowers/**",
            ".worktrees/**",
            ".claude/**",
            ".tamagui/**",
        ],
    },
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        rules: {
            "no-console": ["warn", { allow: ["warn", "error", "info"] }],
        },
    },
    {
        files: ["**/*.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
        },
    },
    {
        files: ["lib/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: ["app/*", "components/*"],
                },
            ],
        },
    },
    {
        files: ["stores/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: ["app/*", "components/*"],
                },
            ],
        },
    },
    {
        files: ["components/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: ["app/*"],
                },
            ],
        },
    },
    // Colour is owned by brand/tokens.json and vendored from copa-frontend. A literal
    // written here cannot be recoloured by a token change and will not be found by the
    // next migration - which is how the terracotta glass and the warm tab bar survived
    // into phase 2. Mirrors the rule in copa-frontend/eslint.config.mjs; pure black and
    // white are allowed because they carry no hue to drift.
    {
        // Every source file, including the repo root - `themes.ts`, `tamagui.config.ts`
        // and `app.config.js` are where the ramp steps and the native launch colours
        // lived, so leaving the root uncovered left the rule blind to the files most
        // likely to be hand-edited during a palette tweak. `tests/**` is excluded for
        // the same reason copa-frontend scopes its rule to `src/**`: assertions have to
        // name concrete values to be worth anything.
        files: ["**/*.{ts,tsx,js,mjs}"],
        ignores: ["**/*.generated.ts", "tests/**"],
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector:
                        "Literal[value=/#(?!fff\\b|ffffff\\b|FFF\\b|FFFFFF\\b|000\\b|000000\\b)[0-9a-fA-F]{3,8}\\b/]",
                    message:
                        "Hard-coded colour. Add it to brand/tokens.json in copa-frontend, re-vendor, and read it from lib/design-system.generated instead (bun run tokens:build).",
                },
                {
                    selector: "Literal[value=/rgba?\\(\\s*(?!0\\s*,\\s*0\\s*,\\s*0|255\\s*,\\s*255\\s*,\\s*255)\\d/]",
                    message:
                        "Hard-coded colour. Add it to brand/tokens.json in copa-frontend and read the tinted value from lib/design-system.generated.",
                },
                {
                    selector:
                        "TemplateElement[value.raw=/#(?!fff\\b|ffffff\\b|FFF\\b|FFFFFF\\b|000\\b|000000\\b)[0-9a-fA-F]{3,8}\\b|rgba?\\(\\s*(?!0\\s*,\\s*0\\s*,\\s*0|255\\s*,\\s*255\\s*,\\s*255)\\d/]",
                    message:
                        "Hard-coded colour in a template literal. Add it to brand/tokens.json in copa-frontend and interpolate the token instead.",
                },
            ],
        },
    },
]);
