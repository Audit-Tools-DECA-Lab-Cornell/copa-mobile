export default {
    locales: ["en", "de", "fr", "hi", "ja"],
    compatibilityJSON: "v4",
    services: {
        plural: {
            pluralSeparator: "_",
            pluralNeutral: "other",
            pluralSameForm: false,
            pluralNoPluralIfEmpty: false,
            pluralNoPluralIfOne: false,
            pluralNoPluralIfTwo: false,
            pluralNoPluralIfFew: false,
            pluralNoPluralIfMany: false,
        },
    },
    extract: {
        input: [
            "app/**/*.{ts,tsx,js,jsx,md}",
            "components/**/*.{ts,tsx,js,jsx,md}",
            "lib/**/*.{ts,tsx,js,jsx,md}",
            "stores/**/*.{ts,tsx,js,jsx,md}",
        ],
        ignore: ["lib/i18n/locales/**", "node_modules/**"],
        output: "lib/i18n/locales/{{language}}/{{namespace}}.json",

        // Keep files clean and predictable
        sort: true,
        indentation: 4,

        // Primary vs secondary languages
        primaryLanguage: "en",
        secondaryLanguages: ["de", "fr", "hi", "ja"],

        // What happens for missing keys in non-primary locales
        defaultValue: (key: string, ns: string, lng: string) =>
            lng === "en" ? "" : `TODO: ${key} ${ns}`,

        // Namespace/key behavior
        defaultNS: "common",
        nsSeparator: ":",
        keySeparator: ".", // or false if you prefer flat keys

        // Extraction heuristics (React + hooks)
        functions: ["t", "*.t", "i18next.t"],
        useTranslationNames: ["useTranslation", "useT"],
        transComponents: ["Trans"],
        transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p"],

        // Linting / cleanup
        removeUnusedKeys: false,
        generateBasePluralForms: false,
    },
};
