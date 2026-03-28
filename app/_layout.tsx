import "../tamagui.generated.css";

import { useEffect } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import {
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import {
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { Provider } from "components/Provider";
import {
    registerAuditBackgroundTaskAsync,
    unregisterAuditBackgroundTaskAsync,
} from "lib/audit/background-sync";
import { useDesignSystem } from "lib/design-system";
import { applyLanguagePreference } from "lib/i18n";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePreferencesStore } from "stores/preferences-store";
import { useTranslation } from "react-i18next";

export { ErrorBoundary } from "expo-router";

const SCREENSHOT_AUTOMATION_ENABLED = __DEV__;

export const unstable_settings = {
    initialRouteName: "(auth)",
};

SplashScreen.preventAutoHideAsync();

/**
 * Root app layout that mounts providers and tab routes.
 */
export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        "Geist-Regular": Geist_400Regular,
        "Geist-Medium": Geist_500Medium,
        "Geist-SemiBold": Geist_600SemiBold,
        "Geist-Bold": Geist_700Bold,
        "SpaceGrotesk-Regular": SpaceGrotesk_400Regular,
        "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
        "SpaceGrotesk-SemiBold": SpaceGrotesk_600SemiBold,
        "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
        "JetBrainsMono-Regular": JetBrainsMono_400Regular,
        "JetBrainsMono-Medium": JetBrainsMono_500Medium,
        "JetBrainsMono-SemiBold": JetBrainsMono_600SemiBold,
        "JetBrainsMono-Bold": JetBrainsMono_700Bold,
        "OpenDyslexic-Regular": require("../assets/fonts/OpenDyslexic-Regular.ttf"),
        "OpenDyslexic-Bold": require("../assets/fonts/OpenDyslexic-Bold.ttf"),
    });

    const hydratePreferences = usePreferencesStore((state) => state.hydrate);
    const isPreferencesHydrated = usePreferencesStore((state) => state.isHydrated);
    const languagePreference = usePreferencesStore((state) => state.languagePreference);

    useEffect(() => {
        hydratePreferences().catch(() => undefined);
    }, [hydratePreferences]);

    useEffect(() => {
        if ((fontsLoaded || fontError) && isPreferencesHydrated) {
            SplashScreen.hideAsync().catch(() => undefined);
        }
    }, [fontError, fontsLoaded, isPreferencesHydrated]);

    useEffect(() => {
        if (!isPreferencesHydrated) {
            return;
        }

        applyLanguagePreference(languagePreference).catch(() => undefined);
    }, [isPreferencesHydrated, languagePreference]);

    if ((!fontsLoaded && !fontError) || !isPreferencesHydrated) {
        return null;
    }

    return (
        <Providers>
            <RootLayoutNav />
        </Providers>
    );
}

interface ProvidersProps {
    readonly children: React.ReactNode;
}

/**
 * Wrapper for all global providers, passing the resolved theme to Tamagui.
 */
function Providers({ children }: ProvidersProps) {
    const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
    return <Provider theme={resolvedTheme}>{children}</Provider>;
}

/**
 * Root navigator with auth and app route groups.
 */
function RootLayoutNav() {
    const router = useRouter();
    const segments = useSegments();
    const authStatus = useAuthStore((state) => state.status);
    const authSession = useAuthStore((state) => state.session);
    const initializeAuth = useAuthStore((state) => state.initialize);
    const hydrateAuditStore = usePlayspaceAuditStore((state) => state.hydrate);
    const isAuditHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const currentAuditUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
    const ds = useDesignSystem();
    const { t } = useTranslation("audit");
    const navigationTheme =
        resolvedTheme === "light"
            ? {
                  ...DefaultTheme,
                  colors: {
                      ...DefaultTheme.colors,
                      background: ds.colors.background,
                      card: ds.colors.background,
                      primary: ds.colors.primary,
                      text: ds.colors.foreground,
                      border: ds.colors.border,
                      notification: ds.colors.primary,
                  },
              }
            : {
                  ...DarkTheme,
                  colors: {
                      ...DarkTheme.colors,
                      background: ds.colors.background,
                      card: ds.colors.background,
                      primary: ds.colors.primary,
                      text: ds.colors.foreground,
                      border: ds.colors.border,
                      notification: ds.colors.primary,
                  },
              };

    useEffect(() => {
        void initializeAuth();
    }, [initializeAuth]);

    useEffect(() => {
        if (authStatus !== "authenticated" || authSession === null) {
            return;
        }

        hydrateAuditStore(authSession.user.id).catch(() => undefined);
    }, [authSession, authStatus, hydrateAuditStore]);

    useEffect(() => {
        if (authStatus === "loading") {
            return;
        }

        if (
            authStatus !== "authenticated" ||
            authSession === null ||
            !isAuditHydrated ||
            currentAuditUserId !== authSession.user.id
        ) {
            unregisterAuditBackgroundTaskAsync().catch(() => undefined);
            return;
        }

        registerAuditBackgroundTaskAsync().catch(() => undefined);
    }, [authSession, authStatus, currentAuditUserId, isAuditHydrated]);

    useEffect(() => {
        if (authStatus === "loading") {
            return;
        }

        const inAuthGroup = segments[0] === "(auth)";
        const isScreenshotAutomationRoute = String(segments[0] ?? "") === "__screenshot-bootstrap";
        const canBypassAuthForScreenshotAutomation =
            SCREENSHOT_AUTOMATION_ENABLED && isScreenshotAutomationRoute;

        // Allow the screenshot bootstrap route to manage auth state and
        // redirection itself so simulator automation can open any target page.
        if (canBypassAuthForScreenshotAutomation) {
            return;
        }

        if (authStatus === "authenticated" && inAuthGroup) {
            router.replace("/(tabs)");
            return;
        }

        if (authStatus === "unauthenticated" && !inAuthGroup) {
            router.replace("/(auth)/login");
        }
    }, [authStatus, router, segments]);

    if (authStatus === "loading") {
        return null;
    }

    return (
        <ThemeProvider value={navigationTheme}>
            <StatusBar
                style={resolvedTheme === "light" ? "dark" : "light"}
                hidden={Platform.OS === "android"}
            />
            <Stack
                screenOptions={{
                    contentStyle: {
                        backgroundColor: ds.colors.background,
                    },
                }}
            >
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="execute/[placeId]/index"
                    options={{ headerShown: true, title: t("stack.execute") }}
                />
                <Stack.Screen name="place/[placeId]" options={{ headerShown: true }} />
                <Stack.Screen name="report/[auditId]" options={{ headerShown: true }} />
            </Stack>
        </ThemeProvider>
    );
}
