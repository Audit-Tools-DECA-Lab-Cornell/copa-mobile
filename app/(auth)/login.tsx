import { useCallback, useMemo, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, UserRound } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, type ColorTokens, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { createModuleLogger } from "lib/logger";

const logger = createModuleLogger("login");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login screen for COPA mobile.
 */
export default function LoginScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["auth", "common"]);
    const login = useAuthStore((state) => state.login);
    const clearError = useAuthStore((state) => state.clearError);
    const isSubmitting = useAuthStore((state) => state.isSubmitting);
    const errorMessage = useAuthStore((state) => state.errorMessage);

    const [email, setEmail] = useState<string>("test-auditor-09@example.org");
    const [password, setPassword] = useState<string>("Fieldtest123!");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const [staySignedIn, setStaySignedIn] = useState<boolean>(true);
    const scrollViewRef = useRef<ScrollView | null>(null);

    const scrollLoginToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: true,
        scrollToOffset: scrollLoginToOffset,
    });

    const canSubmit = useMemo(() => {
        return !isSubmitting;
    }, [isSubmitting]);

    /**
     * Submit login credentials to backend auth.
     */
    const handleLogin = async (): Promise<void> => {
        clearError();
        setValidationMessage(null);

        const normalizedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            setValidationMessage(t("login.validation.invalidEmail", { ns: "auth" }));
            return;
        }
        if (trimmedPassword.length === 0) {
            setValidationMessage(t("login.validation.passwordRequired", { ns: "auth" }));
            return;
        }

        try {
            await login({
                email: normalizedEmail,
                password: trimmedPassword,
            });
        } catch {
            logger.error("Failed to login");
            return;
        }

        router.replace("/(tabs)");
    };

    const visibleErrorMessage = validationMessage ?? errorMessage;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, backgroundColor: ds.colors.background }}
        >
            <ScrollView
                ref={scrollViewRef}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingHorizontal: layout.screenPaddingHorizontal,
                    paddingVertical: 24,
                    justifyContent: "center",
                }}
            >
                <YStack gap="$6" width="100%" style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}>
                    <YStack items="center" gap="$4">
                        <Image
                            source={require("assets/icon.png")}
                            style={{ width: 150, height: 150 }}
                            resizeMode="contain"
                        />

                        <YStack items="center" gap="$2">
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.headingBold}
                                fontSize={ds.typography.displayMd.fontSize}
                                lineHeight={ds.typography.displayMd.lineHeight}
                                textTransform="uppercase"
                                fontStyle="italic"
                                letterSpacing={-0.5}
                            >
                                COPA
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodySemiBold}
                                fontSize={ds.typography.labelMd.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.6}
                            >
                                {t("brand.subtitle", { ns: "auth" })}
                            </Paragraph>
                        </YStack>
                    </YStack>

                    <YStack gap="$4">
                        <YStack gap="$2">
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelMd.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.5}
                                px="$1"
                            >
                                {t("login.identityLabel", { ns: "auth" })}
                            </Paragraph>
                            <XStack
                                items="center"
                                gap="$3"
                                px="$4"
                                height={56}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={ds.colors.input}
                            >
                                <UserRound size={18} color={ds.colors.mutedForeground} />
                                <Input
                                    unstyled
                                    flex={1}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    textContentType="emailAddress"
                                    accessibilityLabel="Login email"
                                    testID="login-email-input"
                                    placeholder={t("login.emailPlaceholder", { ns: "auth" })}
                                    placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.titleSm.fontSize}
                                />
                            </XStack>
                        </YStack>

                        <YStack gap="$2">
                            <XStack justify="space-between" items="center" px="$1">
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelMd.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.5}
                                >
                                    {t("login.accessKeyLabel", { ns: "auth" })}
                                </Paragraph>
                                <Paragraph
                                    color={ds.colors.primary}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelSm.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.1}
                                >
                                    {t("login.offlineSignIn", { ns: "auth" })}
                                </Paragraph>
                            </XStack>
                            <XStack
                                items="center"
                                gap="$3"
                                px="$4"
                                height={56}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={ds.colors.input}
                            >
                                <KeyRound size={18} color={ds.colors.mutedForeground} />
                                <Input
                                    unstyled
                                    flex={1}
                                    value={password}
                                    onChangeText={setPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textContentType="password"
                                    secureTextEntry={!showPassword}
                                    accessibilityLabel="Login password"
                                    testID="login-password-input"
                                    placeholder={t("login.passwordPlaceholder", { ns: "auth" })}
                                    placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.titleSm.fontSize}
                                />
                                <Button
                                    chromeless
                                    size="$3"
                                    onPress={() => {
                                        setShowPassword((previousValue) => !previousValue);
                                    }}
                                >
                                    {showPassword ? (
                                        <EyeOff size={16} color={ds.colors.mutedForeground} />
                                    ) : (
                                        <Eye size={16} color={ds.colors.mutedForeground} />
                                    )}
                                </Button>
                            </XStack>
                        </YStack>

                        {visibleErrorMessage === null ? null : (
                            <YStack
                                borderWidth={1}
                                borderColor={ds.colors.danger}
                                bg={ds.colors.dangerSoft}
                                rounded={ds.radii.md}
                                p="$3"
                            >
                                <Paragraph color={ds.colors.danger} fontFamily={ds.fonts.bodyMedium}>
                                    {visibleErrorMessage}
                                </Paragraph>
                            </YStack>
                        )}

                        {__DEV__ && errorMessage ? (
                            <YStack
                                borderWidth={1}
                                borderColor={ds.colors.amber as ColorTokens}
                                bg={ds.colors.amberSoft as ColorTokens}
                                rounded={ds.radii.md}
                                p="$3"
                            >
                                <Paragraph fontFamily={ds.fonts.bodyRegular} color={ds.colors.mutedForeground}>
                                    {"Dev password: "}
                                    <Text fontFamily={ds.fonts.monoMedium}>DemoPass123!</Text>
                                </Paragraph>
                            </YStack>
                        ) : null}

                        <XStack items="center" gap="$2" px="$1.5">
                            <Checkbox
                                value="staySignedIn"
                                onCheckedChange={(checkedState) => {
                                    setStaySignedIn(checkedState === true);
                                }}
                                checked={staySignedIn}
                            >
                                {staySignedIn ? <Check size={16} color={ds.colors.success} /> : null}
                            </Checkbox>
                            <Paragraph
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.bodySemiBold}
                                fontSize={ds.typography.bodyLg.fontSize}
                            >
                                {t("login.staySignedIn", { ns: "auth" })}
                            </Paragraph>
                        </XStack>

                        <Button
                            height={56}
                            rounded={ds.radii.md}
                            borderWidth={0}
                            bg={ds.colors.primary}
                            disabled={!canSubmit}
                            opacity={canSubmit ? 1 : 0.65}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            accessibilityLabel="Sign in"
                            testID="login-submit-button"
                            onPress={() => {
                                void handleLogin();
                            }}
                            style={{
                                boxShadow: ds.shadows.accent,
                            }}
                        >
                            <XStack items="center" gap="$2">
                                <Text
                                    color={ds.colors.primaryForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelLg.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.4}
                                >
                                    {isSubmitting
                                        ? t("login.submitting", { ns: "auth" })
                                        : t("login.submit", { ns: "auth" })}
                                </Text>
                                <ArrowRight size={16} color={ds.colors.primaryForeground} />
                            </XStack>
                        </Button>

                        <YStack pt="$5" gap="$3" items="center" borderTopWidth={1} borderTopColor={ds.colors.border}>
                            <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                                {t("login.needAccount", { ns: "auth" })}
                            </Paragraph>
                            <Button
                                height={44}
                                px="$4"
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.primarySoft}
                                bg="transparent"
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    router.push("/(auth)/signup");
                                }}
                            >
                                <Text
                                    color={ds.colors.primary}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelMd.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.3}
                                >
                                    {t("login.accessGuide", { ns: "auth" })}
                                </Text>
                            </Button>
                        </YStack>
                    </YStack>
                </YStack>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
