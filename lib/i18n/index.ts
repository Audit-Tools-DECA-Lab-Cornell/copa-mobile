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

const SUPPORTED_LANGUAGES = ["en", "de"] as const;
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
