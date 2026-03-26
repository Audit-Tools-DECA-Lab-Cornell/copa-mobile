import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Paragraph, Text, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useAuthStore } from "stores/auth-store";

interface ScreenshotBootstrapParams {
    readonly target?: string | string[];
    readonly email?: string | string[];
    readonly password?: string | string[];
    readonly reset?: string | string[];
    readonly skipLogin?: string | string[];
}

/**
 * Deep-linkable helper route that prepares auth state before opening a target
 * screen for simulator screenshot automation.
 */
export default function ScreenshotBootstrapScreen() {
    const router = useRouter();
    const ds = useDesignSystem();
    const params = useLocalSearchParams() as ScreenshotBootstrapParams;

    const authStatus = useAuthStore((state) => state.status);
    const session = useAuthStore((state) => state.session);
    const login = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);
    const clearError = useAuthStore((state) => state.clearError);
    const errorMessage = useAuthStore((state) => state.errorMessage);

    const hasResetSessionRef = useRef<boolean>(false);
    const hasNavigatedRef = useRef<boolean>(false);
    const loginAttemptKeyRef = useRef<string | null>(null);
    const [phaseMessage, setPhaseMessage] = useState<string>("Preparing screenshot route.");

    const targetRoute = useMemo(() => {
        const rawTarget = readSingleParam(params.target);
        if (rawTarget?.startsWith("/") !== true) {
            return "/";
        }
        return rawTarget;
    }, [params.target]);
    const email = useMemo(() => {
        const rawEmail = readSingleParam(params.email);
        if (rawEmail === null) {
            return null;
        }
        const normalizedEmail = rawEmail.trim().toLowerCase();
        return normalizedEmail.length > 0 ? normalizedEmail : null;
    }, [params.email]);
    const password = useMemo(() => {
        const rawPassword = readSingleParam(params.password);
        if (rawPassword === null) {
            return null;
        }
        return rawPassword.length > 0 ? rawPassword : null;
    }, [params.password]);
    const shouldResetSession = useMemo(() => {
        return readBooleanParam(params.reset);
    }, [params.reset]);
    const shouldSkipLogin = useMemo(() => {
        return readBooleanParam(params.skipLogin);
    }, [params.skipLogin]);

    /**
     * Clear stale auth store errors whenever a new automation request starts.
     */
    useEffect(() => {
        clearError();
        hasResetSessionRef.current = false;
        hasNavigatedRef.current = false;
        loginAttemptKeyRef.current = null;
        setPhaseMessage("Preparing screenshot route.");
    }, [clearError, email, password, shouldResetSession, shouldSkipLogin, targetRoute]);

    /**
     * Reset persisted auth state when the deep link requests a clean session.
     */
    useEffect(() => {
        if (!shouldResetSession || hasResetSessionRef.current || authStatus === "loading") {
            return;
        }

        hasResetSessionRef.current = true;
        if (authStatus === "authenticated") {
            setPhaseMessage("Clearing persisted session.");
            logout().catch(() => undefined);
            return;
        }

        setPhaseMessage("Using a clean signed-out session.");
    }, [authStatus, logout, shouldResetSession]);

    /**
     * Sign in the screenshot account when required, then route to the target.
     */
    useEffect(() => {
        if (hasNavigatedRef.current) {
            return;
        }

        if (authStatus === "loading") {
            setPhaseMessage("Waiting for auth state.");
            return;
        }

        if (shouldResetSession && !hasResetSessionRef.current) {
            return;
        }

        if (shouldSkipLogin) {
            hasNavigatedRef.current = true;
            setPhaseMessage(`Opening ${targetRoute}.`);
            router.replace(targetRoute as Href);
            return;
        }

        if (email === null || password === null) {
            setPhaseMessage("Screenshot credentials are missing.");
            return;
        }

        const currentSessionEmail =
            session === null ? null : session.user.email.trim().toLowerCase();
        if (authStatus === "authenticated" && currentSessionEmail === email) {
            hasNavigatedRef.current = true;
            setPhaseMessage(`Opening ${targetRoute}.`);
            router.replace(targetRoute as Href);
            return;
        }

        if (authStatus === "authenticated" && currentSessionEmail !== email) {
            setPhaseMessage("A different user is signed in. Retry with reset=1.");
            return;
        }

        const loginAttemptKey = `${email}:${targetRoute}`;
        if (loginAttemptKeyRef.current === loginAttemptKey) {
            return;
        }

        loginAttemptKeyRef.current = loginAttemptKey;
        setPhaseMessage("Signing in screenshot account.");
        clearError();
        login({ email, password }).catch(() => undefined);
    }, [
        authStatus,
        clearError,
        email,
        login,
        password,
        router,
        session,
        shouldResetSession,
        shouldSkipLogin,
        targetRoute,
    ]);

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <YStack
                flex={1}
                items="center"
                justify="center"
                gap="$4"
                px="$5"
                bg={ds.colors.background}
            >
                <ActivityIndicator color={ds.colors.primary} size="large" />
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleLg.fontSize}
                    style={{ textAlign: "center" }}
                >
                    Screenshot Automation
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    style={{ textAlign: "center" }}
                >
                    {phaseMessage}
                </Paragraph>
                {errorMessage === null ? null : (
                    <Paragraph
                        color={ds.colors.danger}
                        fontFamily={ds.fonts.bodyMedium}
                        style={{ textAlign: "center" }}
                    >
                        {errorMessage}
                    </Paragraph>
                )}
            </YStack>
        </>
    );
}

/**
 * Read a single string query parameter.
 *
 * @param value Raw route parameter value.
 * @returns Single string value or null.
 */
function readSingleParam(value: string | string[] | undefined): string | null {
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
    }
    return null;
}

/**
 * Parse a boolean-like route parameter used by screenshot automation.
 *
 * @param value Raw route parameter value.
 * @returns True for common truthy markers, otherwise false.
 */
function readBooleanParam(value: string | string[] | undefined): boolean {
    const normalizedValue = readSingleParam(value)?.trim().toLowerCase();
    return normalizedValue === "1" || normalizedValue === "true" || normalizedValue === "yes";
}
