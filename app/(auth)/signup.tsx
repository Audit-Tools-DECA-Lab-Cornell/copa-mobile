import { useCallback, useMemo, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Mail, User } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, type ColorTokens, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { createModuleLogger } from "lib/logger";

const logger = createModuleLogger("signup");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Self-signup screen: auditor requests access from a manager.
 */
export default function SignupScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["auth", "common"]);
    const requestAccess = useAuthStore((state) => state.requestAccess);
    const clearError = useAuthStore((state) => state.clearError);
    const isSubmitting = useAuthStore((state) => state.isSubmitting);
    const errorMessage = useAuthStore((state) => state.errorMessage);

    const [fullName, setFullName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [managerEmail, setManagerEmail] = useState<string>("");
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView | null>(null);

    const scrollToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({ contentReady: true, scrollToOffset });

    const canSubmit = useMemo(() => !isSubmitting, [isSubmitting]);

    const handleSubmit = async (): Promise<void> => {
        clearError();
        setValidationMessage(null);

        const trimmedName = fullName.trim();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedManagerEmail = managerEmail.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (trimmedName.length === 0) {
            setValidationMessage(t("signup.validation.fullNameRequired", { ns: "auth" }));
            return;
        }
        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            setValidationMessage(t("signup.validation.invalidEmail", { ns: "auth" }));
            return;
        }
        if (trimmedPassword.length < 8) {
            setValidationMessage(t("signup.validation.passwordTooShort", { ns: "auth" }));
            return;
        }
        if (!EMAIL_PATTERN.test(normalizedManagerEmail)) {
            setValidationMessage(t("signup.validation.invalidManagerEmail", { ns: "auth" }));
            return;
        }

        try {
            await requestAccess({
                name: trimmedName,
                email: normalizedEmail,
                password: trimmedPassword,
                managerEmail: normalizedManagerEmail,
            });
        } catch {
            logger.error("Failed to submit access request");
            return;
        }

        router.replace({ pathname: "/(auth)/pending", params: { managerEmail: normalizedManagerEmail } });
    };

    const visibleError = validationMessage ?? errorMessage;

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
                    {/* Header */}
                    <YStack items="center" gap="$4">
                        <Image
                            source={require("assets/icon-ios.png")}
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
                                {t("signup.title", { ns: "auth" })}
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                style={{ textAlign: "center" }}
                            >
                                {t("signup.subtitle", { ns: "auth" })}
                            </Paragraph>
                        </YStack>
                    </YStack>

                    {/* Form */}
                    <YStack gap="$3">
                        {/* Full Name */}
                        <FormField label={t("signup.fullNameLabel", { ns: "auth" })} ds={ds}>
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
                                <User size={18} color={ds.colors.mutedForeground} />
                                <Input
                                    unstyled
                                    flex={1}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    textContentType="name"
                                    placeholder={t("signup.fullNamePlaceholder", { ns: "auth" })}
                                    placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.titleSm.fontSize}
                                />
                            </XStack>
                        </FormField>

                        {/* Email */}
                        <FormField label={t("signup.emailLabel", { ns: "auth" })} ds={ds}>
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
                                <Mail size={18} color={ds.colors.mutedForeground} />
                                <Input
                                    unstyled
                                    flex={1}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    textContentType="emailAddress"
                                    placeholder={t("signup.emailPlaceholder", { ns: "auth" })}
                                    placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.titleSm.fontSize}
                                />
                            </XStack>
                        </FormField>

                        {/* Password */}
                        <FormField label={t("signup.passwordLabel", { ns: "auth" })} ds={ds}>
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
                                <Input
                                    unstyled
                                    flex={1}
                                    value={password}
                                    onChangeText={setPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textContentType="newPassword"
                                    secureTextEntry
                                    placeholder={t("signup.passwordPlaceholder", { ns: "auth" })}
                                    placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.titleSm.fontSize}
                                />
                            </XStack>
                        </FormField>

                        {/* Manager Email */}
                        <FormField
                            label={t("signup.managerEmailLabel", { ns: "auth" })}
                            hint={t("signup.managerEmailHint", { ns: "auth" })}
                            ds={ds}
                        >
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
                                <Mail size={18} color={ds.colors.mutedForeground} />
                                <Input
                                    unstyled
                                    flex={1}
                                    value={managerEmail}
                                    onChangeText={setManagerEmail}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    textContentType="emailAddress"
                                    placeholder={t("signup.managerEmailPlaceholder", { ns: "auth" })}
                                    placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.titleSm.fontSize}
                                />
                            </XStack>
                        </FormField>

                        {/* Error */}
                        {visibleError !== null ? (
                            <YStack
                                borderWidth={1}
                                borderColor={ds.colors.danger}
                                bg={ds.colors.dangerSoft}
                                rounded={ds.radii.md}
                                p="$3"
                            >
                                <Paragraph color={ds.colors.danger} fontFamily={ds.fonts.bodyMedium}>
                                    {visibleError}
                                </Paragraph>
                            </YStack>
                        ) : null}

                        {/* Submit */}
                        <Button
                            height={56}
                            rounded={ds.radii.md}
                            borderWidth={0}
                            bg={ds.colors.primary}
                            disabled={!canSubmit}
                            opacity={canSubmit ? 1 : 0.65}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                void handleSubmit();
                            }}
                            style={{ boxShadow: ds.shadows.accent }}
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
                                        ? t("signup.submitting", { ns: "auth" })
                                        : t("signup.submit", { ns: "auth" })}
                                </Text>
                                <ArrowRight size={16} color={ds.colors.primaryForeground} />
                            </XStack>
                        </Button>

                        {/* Back to sign in */}
                        <Button
                            height={44}
                            rounded={ds.radii.md}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg="transparent"
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                router.replace("/(auth)/login");
                            }}
                        >
                            <XStack items="center" gap="$2">
                                <ArrowLeft size={16} color={ds.colors.foreground} />
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelMd.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.3}
                                >
                                    {t("signup.backToSignIn", { ns: "auth" })}
                                </Text>
                            </XStack>
                        </Button>
                    </YStack>
                </YStack>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

interface FormFieldProps {
    readonly label: string;
    readonly hint?: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly children: React.ReactNode;
}

/**
 * Labelled form field wrapper matching the design system's input style.
 */
function FormField({ label, hint, ds, children }: FormFieldProps) {
    return (
        <YStack gap="$2">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelMd.fontSize}
                textTransform="uppercase"
                letterSpacing={1.5}
                px="$1"
            >
                {label}
            </Paragraph>
            {children}
            {hint !== undefined ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    px="$1"
                >
                    {hint}
                </Paragraph>
            ) : null}
        </YStack>
    );
}
