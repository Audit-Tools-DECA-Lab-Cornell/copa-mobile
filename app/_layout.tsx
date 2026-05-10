import "../tamagui.generated.css";

import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import * as Network from "expo-network";
import {
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Provider } from "components/Provider";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { registerAuditBackgroundTaskAsync, unregisterAuditBackgroundTaskAsync } from "lib/audit/background-sync";
import { useDesignSystem } from "lib/design-system";
import { applyLanguagePreference } from "lib/i18n";
import { logger } from "lib/logger";
import { computeNotificationPollIntervalMs } from "lib/notifications/polling";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AppState, KeyboardAvoidingView, Platform, type AppStateStatus } from "react-native";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { useAuthStore } from "stores/auth-store";
import { useNotificationsStore } from "stores/notifications-store";
import { usePreferencesStore } from "stores/preferences-store";
import { StatusBar } from "expo-status-bar";
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

    useEffect(() => {
        logger.info("COPA mobile app initialized");
    }, []);

    if ((!fontsLoaded && !fontError) || !isPreferencesHydrated) {
        return null;
    }

    return (
        <Provider>
            <RootLayoutNav />
        </Provider>
    );
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
    const refreshUnreadCount = useNotificationsStore((state) => state.refreshUnreadCount);
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
        if (authStatus !== "authenticated" || authSession === null || authSession.user.id.length === 0) {
            return;
        }

        let pollTimer: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (pollTimer !== null) {
                clearInterval(pollTimer);
                pollTimer = null;
            }

            void refreshUnreadCount();

            const intervalMs = computeNotificationPollIntervalMs();

            logger.info(`Starting notification polling: ${String(Math.round(intervalMs / 1000))}s interval`);

            pollTimer = setInterval(() => {
                void refreshUnreadCount();
            }, intervalMs);
        };

        const stopPolling = () => {
            if (pollTimer !== null) {
                logger.info("Stopping notification polling");
                clearInterval(pollTimer);
                pollTimer = null;
            }
        };

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
                logger.info("App foregrounded, resuming notification polling");
                startPolling();
            } else {
                logger.info("App backgrounded, pausing notification polling");
                stopPolling();
            }
        };

        if (AppState.currentState === "active") {
            startPolling();
        }

        const subscription = AppState.addEventListener("change", handleAppStateChange);

        return () => {
            stopPolling();
            subscription.remove();
        };
    }, [authSession, authStatus, refreshUnreadCount]);

    // Refresh instrument and drain queued submits when connectivity is restored.
    useEffect(() => {
        if (authStatus !== "authenticated" || authSession === null || !isAuditHydrated) {
            return;
        }

        const refreshInstrument = usePlayspaceAuditStore.getState().refreshInstrument;
        const processQueuedSubmits = usePlayspaceAuditStore.getState().processQueuedSubmits;

        const subscription = Network.addNetworkStateListener((state) => {
            if (state.isConnected && state.isInternetReachable !== false) {
                refreshInstrument().catch(() => undefined);
                processQueuedSubmits(authSession).catch(() => undefined);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [authSession, authStatus, isAuditHydrated]);

    // Show Alert on foreground when a queued offline submit previously failed.
    useEffect(() => {
        if (authStatus !== "authenticated" || authSession === null || !isAuditHydrated) {
            return;
        }

        const checkFailures = () => {
            const notifications = usePlayspaceAuditStore.getState().popSubmitFailureNotifications();
            for (const notif of notifications) {
                Alert.alert(
                    t("errors.queuedSubmitFailedTitle", { ns: "audit" }),
                    t("errors.queuedSubmitFailedMessage", { ns: "audit", placeName: notif.placeName }),
                    [{ text: "OK", style: "default" }],
                );
            }
        };

        // Check immediately when authenticated and hydrated.
        checkFailures();

        const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
            if (nextState === "active") {
                checkFailures();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [authSession, authStatus, isAuditHydrated, t]);

    useEffect(() => {
        if (authStatus === "loading") {
            return;
        }

        const segment0 = String(segments[0] ?? "");
        const inAuthGroup = segment0 === "(auth)";
        const inOnboardingGroup = segment0 === "(onboarding)";
        const isScreenshotAutomationRoute = segment0 === "__screenshot-bootstrap";
        const canBypassAuthForScreenshotAutomation = SCREENSHOT_AUTOMATION_ENABLED && isScreenshotAutomationRoute;

        // Allow the screenshot bootstrap route to manage auth state and
        // redirection itself so simulator automation can open any target page.
        if (canBypassAuthForScreenshotAutomation) {
            return;
        }

        if (authStatus === "unauthenticated") {
            if (!inAuthGroup) {
                router.replace("/(auth)/login");
            }
            return;
        }

        // Authenticated — route based on the backend's next_step signal.
        const nextStep = authSession?.user.nextStep ?? "DASHBOARD";

        if (nextStep === "WAITING_APPROVAL") {
            if (!inAuthGroup) {
                router.replace("/(auth)/pending");
            }
            return;
        }

        if (nextStep !== "DASHBOARD") {
            // Any in-progress onboarding step belongs in the (onboarding) group.
            if (!inOnboardingGroup) {
                router.replace("/(onboarding)/reset-password");
            }
            return;
        }

        // nextStep === "DASHBOARD" — the main app. Valid authenticated destinations include
        // the (tabs) group and all root-level stack screens (execute, place, report, settings/*).
        // Only redirect if the user is stranded in an auth or onboarding screen.
        if (inAuthGroup || inOnboardingGroup) {
            router.replace("/(tabs)");
        }
    }, [authSession, authStatus, router, segments]);

    if (authStatus === "loading") {
        return null;
    }

    return (
        <ThemeProvider value={navigationTheme}>
            <StatusBar style={resolvedTheme === "light" ? "dark" : "light"} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <Stack screenOptions={{ contentStyle: { backgroundColor: ds.colors.background, paddingTop: 20 } }}>
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="execute/[placeId]/index"
                        options={{ headerShown: true, title: t("stack.execute") }}
                    />
                    <Stack.Screen name="place/[placeId]" options={{ headerShown: true }} />
                    <Stack.Screen name="report/[auditId]" options={{ headerShown: true }} />
                    <Stack.Screen name="settings/change-password" options={{ headerShown: true }} />
                    <Stack.Screen name="settings/edit-profile" options={{ headerShown: true }} />
                </Stack>
            </KeyboardAvoidingView>
        </ThemeProvider>
    );
}
