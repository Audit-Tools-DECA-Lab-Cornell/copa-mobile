export default {
    expo: {
        name: "COPA",
        slug: "audit-tools-playspace-mobile",
        version: "0.4.1",
        orientation: "portrait",
        icon: "./assets/icon-ios.png",
        scheme: "audit-tools-playspace-mobile",
        userInterfaceStyle: "automatic",
        splash: {
            image: "./assets/images/splash.png",
            resizeMode: "contain",
            backgroundColor: "#F7F1EB",
        },
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
            icon: "./assets/images/favicon.png",
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#F7F1EB",
                monochromeImage: "./assets/images/adaptive-monochrome.png",
            },
            package: "com.pratyush.sudhakar.audittoolsplayspacemobile",
        },
        plugins: [
            "./plugins/withCustomPodfilePatches",
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
        // Fingerprint OTA runtime: JS-only patches via `eas update`; native changes need a new build.
        runtimeVersion: {
            policy: "fingerprint",
        },
        owner: "audit-tools-deca-lab-cornell",
        githubUrl: "https://github.com/audit-tools-deca-lab-cornell/audit-tools-playspace-mobile",
        updates: {
            url: "https://u.expo.dev/2e559376-25f3-44e1-88bf-00eeaf9fb763",
            enableBsdiffPatchSupport: true,
        },
    },
};
