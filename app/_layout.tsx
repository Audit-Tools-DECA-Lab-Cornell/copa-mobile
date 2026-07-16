import "../tamagui.generated.css";

import { vexo } from "vexo-analytics";

import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
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
import { BugReportFab } from "components/bug-report/BugReportFab";
import { Provider } from "components/Provider";
import { AppLoader } from "components/ui/app-loader";
import { ForceUpdateScreen, ReleasePolicyLoadingScreen } from "components/release-policy/ForceUpdateScreen";
import { TestingMigrationScreen } from "components/testing-migration/TestingMigrationScreen";
import { useFonts } from "expo-font";
import * as Network from "expo-network";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { registerAuditBackgroundTaskAsync, unregisterAuditBackgroundTaskAsync } from "lib/audit/background-sync";
import { useBugReportFlushPrompt } from "lib/bug-report/use-flush-prompt";
import { ConfirmDialogProvider, useConfirm } from "components/ui/confirm-dialog";
import { useDesignSystem } from "lib/design-system";
import { useEasUpdateBootstrap } from "lib/eas-updates";
import { applyLanguagePreference } from "lib/i18n";
import { logger } from "lib/logger";
import { computeNotificationPollIntervalMs } from "lib/notifications/polling";
import { useReleasePolicyGate } from "lib/release-policy";
import { useHiddenAndroidNavBar } from "lib/system-bars";
import { useTestingMigrationGate } from "lib/testing-migration/config";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppState, KeyboardAvoidingView, Platform, type AppStateStatus } from "react-native";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { useAuthStore } from "stores/auth-store";
import { useNotificationsStore } from "stores/notifications-store";
import { usePreferencesStore } from "stores/preferences-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

vexo(process.env.EXPO_PUBLIC_VEXO_API_KEY ?? "");
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
        // Branded pulse instead of a blank frame (G2). AppLoader is built from
        // plain RN primitives, so it is safe here before the Tamagui provider
        // mounts and before custom fonts load.
        return <AppLoader />;
    }

    return (
        <Provider>
            {/* Root-mounted so the in-window confirm overlay covers every
                screen (including the release-policy and testing-migration
                gates) above tab bars and audit footers. */}
            <ConfirmDialogProvider>
                <RootLayoutNav />
            </ConfirmDialogProvider>
        </Provider>
    );
}

/**
 * Root navigator with auth and app route groups.
 */
function RootLayoutNav() {
    const releasePolicyGate = useReleasePolicyGate();
    const testingMigrationGate = useTestingMigrationGate();

    useEasUpdateBootstrap();

    if (releasePolicyGate.status === "loading") {
        return <ReleasePolicyLoadingScreen />;
    }

    if (releasePolicyGate.status === "blocked") {
        return <ForceUpdateScreen decision={releasePolicyGate.decision} onRetry={releasePolicyGate.retry} />;
    }

    if (testingMigrationGate.shouldBlock) {
        return <TestingMigrationScreen closedTestUrl={testingMigrationGate.closedTestUrl} />;
    }

    return <ActiveRootLayoutNav />;
}

function ActiveRootLayoutNav() {
    const router = useRouter();
    const segments = useSegments();
    const routeKey = segments.join("/");
    const authStatus = useAuthStore((state) => state.status);
    const authSession = useAuthStore((state) => state.session);
    const initializeAuth = useAuthStore((state) => state.initialize);
    const refreshUnreadCount = useNotificationsStore((state) => state.refreshUnreadCount);
    const hydrateAuditStore = usePlayspaceAuditStore((state) => state.hydrate);
    const isAuditHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const currentAuditUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
    const hasSeenIntro = usePreferencesStore((state) => state.hasSeenIntro);
    const ds = useDesignSystem();
    const { t } = useTranslation(["audit", "common", "settings"]);

    useHiddenAndroidNavBar(routeKey);
    const safeAreaInsets = useSafeAreaInsets();

    // Offer to submit any locally-queued bug reports once the device is online.
    // The confirm renders in-window (never a native Alert) so the hidden Android
    // navigation bar stays hidden.
    const requestConfirm = useConfirm();
    useBugReportFlushPrompt(authSession, authStatus === "authenticated" && isAuditHydrated, requestConfirm);
    // Guards the queued-submit-failure announcements: at most one batch of
    // acknowledge dialogs runs at a time.
    const isAnnouncingSubmitFailuresRef = useRef(false);
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

    // Refresh instrument and drain queued submits when connectivity is
    // restored, when the app returns to the foreground, and once per hydrate.
    // The hydrate-time drain covers signing in on an already-online device,
    // where no network-change event ever fires (e.g. resuming work preserved
    // across a sign-out).
    useEffect(() => {
        if (authStatus !== "authenticated" || authSession === null || !isAuditHydrated) {
            return;
        }

        const refreshInstrument = usePlayspaceAuditStore.getState().refreshInstrument;
        const processQueuedSubmits = usePlayspaceAuditStore.getState().processQueuedSubmits;

        const drainWhenOnline = () => {
            Network.getNetworkStateAsync()
                .then((state) => {
                    if (state.isConnected !== false && state.isInternetReachable !== false) {
                        refreshInstrument().catch(() => undefined);
                        processQueuedSubmits(authSession).catch(() => undefined);
                    }
                })
                .catch(() => undefined);
        };

        drainWhenOnline();

        const networkSubscription = Network.addNetworkStateListener((state) => {
            if (state.isConnected && state.isInternetReachable !== false) {
                refreshInstrument().catch(() => undefined);
                processQueuedSubmits(authSession).catch(() => undefined);
            }
        });

        const appStateSubscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
                drainWhenOnline();
            }
        });

        return () => {
            networkSubscription.remove();
            appStateSubscription.remove();
        };
    }, [authSession, authStatus, isAuditHydrated]);

    // Announce on foreground when a queued offline submit previously failed.
    // Uses the in-window acknowledge dialog (never a native Alert) and shows
    // one notification at a time: a single overlay cannot stack, so each is
    // awaited before the next appears. Each notice is popped from persistence
    // only when it is about to be shown, so nothing not yet seen is lost if
    // the app is terminated mid-batch, and none are dropped.
    useEffect(() => {
        if (authStatus !== "authenticated" || authSession === null || !isAuditHydrated) {
            return;
        }

        // Aborted on cleanup (sign-out, account switch): the open dialog is
        // dismissed so the previous account's place name never lingers over
        // the new auth state, and the loop stops popping.
        const cancellation = new AbortController();

        const checkFailures = () => {
            if (isAnnouncingSubmitFailuresRef.current) {
                return;
            }
            isAnnouncingSubmitFailuresRef.current = true;
            void (async () => {
                try {
                    while (!cancellation.signal.aborted) {
                        const notif = usePlayspaceAuditStore.getState().popSubmitFailureNotification();
                        if (notif === null) {
                            return;
                        }
                        const acknowledged = await requestConfirm(
                            {
                                title: t("errors.queuedSubmitFailedTitle", { ns: "audit" }),
                                message: t("errors.queuedSubmitFailedMessage", {
                                    ns: "audit",
                                    placeName: notif.placeName,
                                }),
                                confirmLabel: t("actions.ok", { ns: "common" }),
                            },
                            cancellation.signal,
                        );
                        if (!acknowledged) {
                            // Aborted before the auditor saw it through: put it
                            // back so it shows again on the next sign-in.
                            usePlayspaceAuditStore.getState().restoreSubmitFailureNotification(notif);
                            return;
                        }
                    }
                } finally {
                    isAnnouncingSubmitFailuresRef.current = false;
                }
            })();
        };

        // Check immediately when authenticated and hydrated.
        checkFailures();

        const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
            if (nextState === "active") {
                checkFailures();
            }
        });

        return () => {
            cancellation.abort();
            subscription.remove();
        };
    }, [authSession, authStatus, isAuditHydrated, requestConfirm, t]);

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
                router.replace(hasSeenIntro ? "/(auth)/login" : "/(auth)/intro");
            }
            return;
        }

        // Authenticated - route based on the backend's next_step signal.
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

        // nextStep === "DASHBOARD" - the main app. Valid authenticated destinations include
        // the (tabs) group and all root-level stack screens (execute, place, report, settings/*).
        // Only redirect if the user is stranded in an auth or onboarding screen.
        if (inAuthGroup || inOnboardingGroup) {
            router.replace("/(tabs)");
        }
    }, [authSession, authStatus, router, segments, hasSeenIntro]);

    if (authStatus === "loading") {
        return <AppLoader />;
    }

    return (
        <ThemeProvider value={navigationTheme}>
            <StatusBar style={resolvedTheme === "light" ? "dark" : "light"} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <Stack
                    screenOptions={{
                        contentStyle: { backgroundColor: ds.colors.background, paddingTop: safeAreaInsets.top },
                    }}
                >
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="execute/[placeId]/index"
                        options={{ headerShown: true, title: t("stack.execute", { ns: "audit" }) }}
                    />
                    {/* Default localized titles guard every data-gated screen
                        against flashing its raw route slug (G1). Screens
                        override these once their data resolves. */}
                    <Stack.Screen
                        name="execute/[placeId]/overview"
                        options={{ headerShown: true, title: t("overview.sections", { ns: "audit" }) }}
                    />
                    <Stack.Screen
                        name="execute/[placeId]/pre-audit"
                        options={{ headerShown: true, title: t("stack.preAudit", { ns: "audit" }) }}
                    />
                    <Stack.Screen
                        name="execute/[placeId]/space-audit"
                        options={{ headerShown: true, title: t("stack.spaceAudit", { ns: "audit" }) }}
                    />
                    <Stack.Screen
                        name="execute/[placeId]/final-comments"
                        options={{ headerShown: true, title: t("finalComments.title", { ns: "audit" }) }}
                    />
                    <Stack.Screen
                        name="execute/[placeId]/section/[sectionKey]"
                        options={{ headerShown: true, title: t("stack.sectionFallback", { ns: "audit" }) }}
                    />
                    <Stack.Screen name="place/[placeId]" options={{ headerShown: true }} />
                    <Stack.Screen name="report/[auditId]" options={{ headerShown: true }} />
                    <Stack.Screen
                        name="settings/change-password"
                        options={{ headerShown: true, title: t("changePassword.title", { ns: "settings" }) }}
                    />
                    <Stack.Screen
                        name="settings/edit-profile"
                        options={{ headerShown: true, title: t("editProfile.title", { ns: "settings" }) }}
                    />
                </Stack>
            </KeyboardAvoidingView>
            <BugReportFab />
        </ThemeProvider>
    );
}
