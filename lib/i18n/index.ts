import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enSettings from "./locales/en/settings.json";
import enAudit from "./locales/en/audit.json";
import enDashboard from "./locales/en/dashboard.json";
import { enInstrumentTranslations } from "./locales/en/instrument";
import enPlaces from "./locales/en/places.json";
import enReports from "./locales/en/reports.json";
import enNotFound from "./locales/en/not-found.json";
import deCommon from "./locales/de/common.json";
import deAuth from "./locales/de/auth.json";
import deSettings from "./locales/de/settings.json";
import deAudit from "./locales/de/audit.json";
import deDashboard from "./locales/de/dashboard.json";
import { deInstrumentTranslations } from "./locales/de/instrument";
import dePlaces from "./locales/de/places.json";
import deReports from "./locales/de/reports.json";
import deNotFound from "./locales/de/not-found.json";
import frCommon from "./locales/fr/common.json";
import frAuth from "./locales/fr/auth.json";
import frSettings from "./locales/fr/settings.json";
import frAudit from "./locales/fr/audit.json";
import frDashboard from "./locales/fr/dashboard.json";
import { frInstrumentTranslations } from "./locales/fr/instrument";
import frPlaces from "./locales/fr/places.json";
import frReports from "./locales/fr/reports.json";
import frNotFound from "./locales/fr/not-found.json";
import hiCommon from "./locales/hi/common.json";
import hiAuth from "./locales/hi/auth.json";
import hiSettings from "./locales/hi/settings.json";
import hiAudit from "./locales/hi/audit.json";
import hiDashboard from "./locales/hi/dashboard.json";
import { hiInstrumentTranslations } from "./locales/hi/instrument";
import hiPlaces from "./locales/hi/places.json";
import hiReports from "./locales/hi/reports.json";
import hiNotFound from "./locales/hi/not-found.json";
import jaCommon from "./locales/ja/common.json";
import jaAuth from "./locales/ja/auth.json";
import jaSettings from "./locales/ja/settings.json";
import jaAudit from "./locales/ja/audit.json";
import jaDashboard from "./locales/ja/dashboard.json";
import { jaInstrumentTranslations } from "./locales/ja/instrument";
import jaPlaces from "./locales/ja/places.json";
import jaReports from "./locales/ja/reports.json";
import jaNotFound from "./locales/ja/not-found.json";

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

void i18nInstance.use(initReactI18next).init({
    lng: resolveLanguagePreference("system"),
    fallbackLng: FALLBACK_LANGUAGE,
    ns: [
        "common",
        "auth",
        "settings",
        "audit",
        "dashboard",
        "instrument",
        "places",
        "reports",
        "not-found",
    ],
    defaultNS: "common",
    resources: {
        en: {
            common: enCommon,
            auth: enAuth,
            settings: enSettings,
            audit: enAudit,
            dashboard: enDashboard,
            instrument: enInstrumentTranslations,
            places: enPlaces,
            reports: enReports,
            "not-found": enNotFound,
        },
        de: {
            common: deCommon,
            auth: deAuth,
            settings: deSettings,
            audit: deAudit,
            dashboard: deDashboard,
            instrument: deInstrumentTranslations,
            places: dePlaces,
            reports: deReports,
            "not-found": deNotFound,
        },
        fr: {
            common: frCommon,
            auth: frAuth,
            settings: frSettings,
            audit: frAudit,
            dashboard: frDashboard,
            instrument: frInstrumentTranslations,
            places: frPlaces,
            reports: frReports,
            "not-found": frNotFound,
        },
        hi: {
            common: hiCommon,
            auth: hiAuth,
            settings: hiSettings,
            audit: hiAudit,
            dashboard: hiDashboard,
            instrument: hiInstrumentTranslations,
            places: hiPlaces,
            reports: hiReports,
            "not-found": hiNotFound,
        },
        ja: {
            common: jaCommon,
            auth: jaAuth,
            settings: jaSettings,
            audit: jaAudit,
            dashboard: jaDashboard,
            instrument: jaInstrumentTranslations,
            places: jaPlaces,
            reports: jaReports,
            "not-found": jaNotFound,
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
export { SUPPORTED_LANGUAGES };
