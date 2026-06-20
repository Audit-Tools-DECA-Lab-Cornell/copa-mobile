import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import deAudit from "./locales/de/audit.json";
import deAuth from "./locales/de/auth.json";
import deBugReport from "./locales/de/bug-report.json";
import deCommon from "./locales/de/common.json";
import deDashboard from "./locales/de/dashboard.json";
import deNotFound from "./locales/de/not-found.json";
import deOnboarding from "./locales/de/onboarding.json";
import dePlaces from "./locales/de/places.json";
import deReports from "./locales/de/reports.json";
import deSettings from "./locales/de/settings.json";
import enAudit from "./locales/en/audit.json";
import enAuth from "./locales/en/auth.json";
import enBugReport from "./locales/en/bug-report.json";
import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enNotFound from "./locales/en/not-found.json";
import enOnboarding from "./locales/en/onboarding.json";
import enPlaces from "./locales/en/places.json";
import enReports from "./locales/en/reports.json";
import enSettings from "./locales/en/settings.json";
import frAudit from "./locales/fr/audit.json";
import frAuth from "./locales/fr/auth.json";
import frBugReport from "./locales/fr/bug-report.json";
import frCommon from "./locales/fr/common.json";
import frDashboard from "./locales/fr/dashboard.json";
import frNotFound from "./locales/fr/not-found.json";
import frOnboarding from "./locales/fr/onboarding.json";
import frPlaces from "./locales/fr/places.json";
import frReports from "./locales/fr/reports.json";
import frSettings from "./locales/fr/settings.json";
import hiAudit from "./locales/hi/audit.json";
import hiAuth from "./locales/hi/auth.json";
import hiBugReport from "./locales/hi/bug-report.json";
import hiCommon from "./locales/hi/common.json";
import hiDashboard from "./locales/hi/dashboard.json";
import hiNotFound from "./locales/hi/not-found.json";
import hiOnboarding from "./locales/hi/onboarding.json";
import hiPlaces from "./locales/hi/places.json";
import hiReports from "./locales/hi/reports.json";
import hiSettings from "./locales/hi/settings.json";
import jaAudit from "./locales/ja/audit.json";
import jaAuth from "./locales/ja/auth.json";
import jaBugReport from "./locales/ja/bug-report.json";
import jaCommon from "./locales/ja/common.json";
import jaDashboard from "./locales/ja/dashboard.json";
import jaNotFound from "./locales/ja/not-found.json";
import jaOnboarding from "./locales/ja/onboarding.json";
import jaPlaces from "./locales/ja/places.json";
import jaReports from "./locales/ja/reports.json";
import jaSettings from "./locales/ja/settings.json";

const SUPPORTED_LANGUAGES = ["en", "de", "fr", "hi", "ja"] as const;
const FALLBACK_LANGUAGE = "en";
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type LanguagePreference = "system" | SupportedLanguage;

/**
 * Detect the best matching language from the device locale.
 *
 * @returns A supported language code.
 */
function detectDeviceLanguage(): SupportedLanguage {
    const locales = getLocales();
    const deviceLanguage = locales[0]?.languageCode?.toLowerCase() ?? FALLBACK_LANGUAGE;

    for (const supported of SUPPORTED_LANGUAGES) {
        if (deviceLanguage === supported) {
            return supported;
        }
    }

    return FALLBACK_LANGUAGE;
}

/**
 * Resolve the concrete app language from a stored user preference.
 *
 * @param preference User-selected language preference.
 * @returns Supported app language code.
 */
export function resolveLanguagePreference(preference: LanguagePreference): SupportedLanguage {
    return preference === "system" ? detectDeviceLanguage() : preference;
}

const i18nInstance = i18n;

// void i18nInstance.changeLanguage(resolveLanguagePreference("system"));
void i18nInstance.use(initReactI18next).init({
    lng: resolveLanguagePreference("system"),
    fallbackLng: FALLBACK_LANGUAGE,
    ns: [
        "common",
        "auth",
        "onboarding",
        "settings",
        "audit",
        "dashboard",
        "places",
        "reports",
        "not-found",
        "bugReport",
    ],
    defaultNS: "common",
    resources: {
        en: {
            common: enCommon,
            auth: enAuth,
            onboarding: enOnboarding,
            settings: enSettings,
            audit: enAudit,
            dashboard: enDashboard,
            places: enPlaces,
            reports: enReports,
            "not-found": enNotFound,
            bugReport: enBugReport,
        },
        de: {
            common: deCommon,
            auth: deAuth,
            onboarding: deOnboarding,
            settings: deSettings,
            audit: deAudit,
            dashboard: deDashboard,
            places: dePlaces,
            reports: deReports,
            "not-found": deNotFound,
            bugReport: deBugReport,
        },
        fr: {
            common: frCommon,
            auth: frAuth,
            onboarding: frOnboarding,
            settings: frSettings,
            audit: frAudit,
            dashboard: frDashboard,
            places: frPlaces,
            reports: frReports,
            "not-found": frNotFound,
            bugReport: frBugReport,
        },
        hi: {
            common: hiCommon,
            auth: hiAuth,
            onboarding: hiOnboarding,
            settings: hiSettings,
            audit: hiAudit,
            dashboard: hiDashboard,
            places: hiPlaces,
            reports: hiReports,
            "not-found": hiNotFound,
            bugReport: hiBugReport,
        },
        ja: {
            common: jaCommon,
            auth: jaAuth,
            onboarding: jaOnboarding,
            settings: jaSettings,
            audit: jaAudit,
            dashboard: jaDashboard,
            places: jaPlaces,
            reports: jaReports,
            "not-found": jaNotFound,
            bugReport: jaBugReport,
        },
    },
    interpolation: {
        escapeValue: false,
    },
    react: {
        useSuspense: false,
    },
});

/**
 * Apply a persisted language preference to the live i18n instance.
 *
 * @param preference User-selected language preference.
 */
export async function applyLanguagePreference(preference: LanguagePreference): Promise<void> {
    const nextLanguage = resolveLanguagePreference(preference);
    if (i18nInstance.resolvedLanguage === nextLanguage || i18nInstance.language === nextLanguage) {
        return;
    }

    await i18nInstance.changeLanguage(nextLanguage);
}

export default i18nInstance;
export const t = i18nInstance.t;
export { SUPPORTED_LANGUAGES };
