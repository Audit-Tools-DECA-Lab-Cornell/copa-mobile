import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Native launch colours come from `brand/tokens.json`, the same source the app's
 * theme is generated from.
 *
 * This file is evaluated by Node before any app code runs, so it cannot import
 * the generated TypeScript module - it reads the token file directly instead.
 * These values are baked into the native build: the splash screen and the
 * Android adaptive-icon background are the first thing a user sees, and the
 * easiest surface to miss when the palette changes.
 */
const tokens = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "brand/tokens.json"), "utf8"));
const nativeSplash = tokens.nativeSplash;

export default {
    expo: {
        name: "COPA",
        slug: "audit-tools-playspace-mobile",
        version: "0.9.0",
        orientation: "portrait",
        scheme: "copa-mobile",
        icon: "./assets/icon.png",
        userInterfaceStyle: "automatic",
        assetBundlePatterns: ["**/*"],
        ios: {
            supportsTablet: true,
            icon: "./assets/ios-icons/AppIcon.icon",
            buildNumber: "1",
            bundleIdentifier: "com.pratyush.sudhakar.audit-tools-playspace-mobile",
            appleTeamId: "ZD947U862S",
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
            },
        },
        android: {
            icon: "./assets/android-icons/favicon.png",
            softwareKeyboardLayoutMode: "pan",
            adaptiveIcon: {
                foregroundImage: "./assets/android-icons/adaptive-icon.png",
                backgroundColor: nativeSplash.adaptiveIconBackground,
                monochromeImage: "./assets/android-icons/adaptive-monochrome.png",
            },
            package: "com.pratyush.sudhakar.audittoolsplayspacemobile",
        },
        plugins: [
            "./plugins/withCustomPodfilePatches",
            ["expo-navigation-bar", { hidden: true }],
            [
                "expo-splash-screen",
                {
                    backgroundColor: nativeSplash.light,
                    image: "./assets/splash-icon.png",
                    imageWidth: 200,
                    dark: {
                        backgroundColor: nativeSplash.dark,
                        image: "./assets/splash-icon.png",
                    },
                },
            ],
            "expo-router",
            "expo-localization",
            "expo-font",
            [
                "react-native-maps",
                {
                    iosGoogleMapsApiKey: process.env.IOS_GOOGLE_MAPS_API_KEY,
                    androidGoogleMapsApiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY,
                },
            ],
            [
                "expo-build-properties",
                {
                    ios: {
                        newArchEnabled: false,
                        deploymentTarget: "15.1",
                    },
                    android: {
                        newArchEnabled: false,
                        compileSdkVersion: 36,
                        targetSdkVersion: 36,
                        buildToolsVersion: "36.0.0",
                    },
                },
            ],
            "expo-web-browser",
            "expo-secure-store",
            "expo-background-task",
            "expo-sharing",
        ],
        experiments: {
            typedRoutes: true,
        },
        jsEngine: "hermes",
        extra: {
            router: {},
            buildChannel: process.env.EXPO_PUBLIC_BUILD_CHANNEL ?? "development",
            testingMigration: {
                deprecatedInternalBuild: process.env.EXPO_PUBLIC_DEPRECATED_INTERNAL_BUILD ?? "false",
                remoteConfigUrl: process.env.EXPO_PUBLIC_TESTING_MIGRATION_CONFIG_URL ?? "",
                closedTestUrl: process.env.EXPO_PUBLIC_CLOSED_TEST_URL ?? "",
            },
            eas: {
                projectId: "2e559376-25f3-44e1-88bf-00eeaf9fb763",
            },
        },
        runtimeVersion: {
            policy: "fingerprint",
        },
        owner: "copa-decalab-cornell",
        githubUrl: "https://github.com/audit-tools-deca-lab-cornell/copa-mobile",
        updates: {
            url: "https://u.expo.dev/2e559376-25f3-44e1-88bf-00eeaf9fb763",
            enableTracking: true,
            enableBsdiffPatchSupport: true,
        },
    },
};
