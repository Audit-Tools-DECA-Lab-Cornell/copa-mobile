export default {
    expo: {
        name: "COPA",
        slug: "audit-tools-playspace-mobile",
        version: "1.2.1",
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
            icon: "./assets/icon-ios.png",
            bundleIdentifier: "com.pratyush.sudhakar.audit-tools-playspace-mobile",
            appleTeamId: "ZD947U862S",
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
            },
        },
        android: {
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
            eas: {
                projectId: "2e559376-25f3-44e1-88bf-00eeaf9fb763",
            },
        },
        runtimeVersion: {
            policy: "appVersion",
        },
        owner: "audit-tools-deca-lab-cornell",
        githubUrl: "https://github.com/audit-tools-deca-lab-cornell/audit-tools-playspace-mobile",
        updates: {
            url: "https://u.expo.dev/2e559376-25f3-44e1-88bf-00eeaf9fb763",
            enableBsdiffPatchSupport: true,
        },
    },
};
