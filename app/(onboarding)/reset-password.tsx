import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Check, KeyRound, X } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, type ColorTokens, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useAuthStore } from "stores/auth-store";
import { createModuleLogger } from "lib/logger";

const logger = createModuleLogger("onboarding.reset-password");

interface PasswordRequirement {
    readonly key: string;
    readonly labelKey: string;
    readonly met: boolean;
}

function buildRequirements(password: string): PasswordRequirement[] {
    return [
        { key: "minLength", labelKey: "requirements.minLength", met: password.length >= 8 },
        { key: "uppercase", labelKey: "requirements.uppercase", met: /[A-Z]/.test(password) },
        { key: "lowercase", labelKey: "requirements.lowercase", met: /[a-z]/.test(password) },
        { key: "number", labelKey: "requirements.number", met: /\d/.test(password) },
    ];
}

/**
 * Step 1 of onboarding: the auditor sets a personal password to replace the temporary one.
 */
export default function ResetPasswordScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation("onboarding");
    const changePassword = useAuthStore((state) => state.changePassword);
    const isSubmitting = useAuthStore((state) => state.isSubmitting);

    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const requirements = useMemo(() => buildRequirements(newPassword), [newPassword]);
    const allRequirementsMet = requirements.every((requirement) => requirement.met);
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
    const canSubmit =
        !isSubmitting &&
        currentPassword.length > 0 &&
        allRequirementsMet &&
        confirmPassword.length > 0 &&
        passwordsMatch;

    const handleSubmit = async (): Promise<void> => {
        if (isSubmitting) {
            return;
        }

        setErrorMessage(null);

        if (currentPassword.length === 0) {
            setErrorMessage(t("resetPassword.validation.currentPasswordRequired", "Enter your temporary password."));
            return;
        }
        if (!allRequirementsMet) {
            setErrorMessage(
                t("resetPassword.validation.tooShort", "Your new password does not meet the requirements."),
            );
            return;
        }
        if (newPassword === currentPassword) {
            setErrorMessage(
                t(
                    "resetPassword.validation.sameAsCurrent",
                    "Choose a password different from your temporary password.",
                ),
            );
            return;
        }
        if (!passwordsMatch) {
            setErrorMessage(t("resetPassword.validation.noMatch", "Passwords do not match."));
            return;
        }

        try {
            await changePassword(currentPassword, newPassword);
            router.replace("/(onboarding)/complete-profile");
        } catch (error) {
            logger.error("Failed to change password", error instanceof Error ? error.message : String(error));
            setErrorMessage(
                t(
                    "resetPassword.validation.failed",
                    "We could not update your password. Please check your temporary password and try again.",
                ),
            );
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
            style={{ flex: 1, backgroundColor: ds.colors.background }}
        >
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: layout.screenPaddingHorizontal,
                    paddingVertical: layout.isTablet ? 64 : 32,
                    justifyContent: "center",
                }}
            >
                <YStack gap="$6" width="100%" style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}>
                    <YStack gap="$2">
                        <Paragraph
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.4}
                        >
                            {t("resetPassword.stepLabel", "Step 1 of 4")}
                        </Paragraph>
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={
                                layout.isTablet ? ds.typography.displayMd.fontSize : ds.typography.displaySm.fontSize
                            }
                            textTransform="uppercase"
                            fontStyle="italic"
                            letterSpacing={-0.5}
                        >
                            {t("resetPassword.title")}
                        </Text>
                        <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                            {t("resetPassword.subtitle")}
                        </Paragraph>
                    </YStack>

                    <YStack
                        rounded={ds.radii.lg}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surface}
                        p="$4"
                        gap="$2"
                        style={{ boxShadow: ds.shadows.card }}
                    >
                        <Paragraph
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                        >
                            {t("resetPassword.requirementsTitle", "Password requirements")}
                        </Paragraph>
                        {requirements.map((requirement) => (
                            <XStack key={requirement.key} items="center" gap="$2">
                                {requirement.met ? (
                                    <Check size={14} color={ds.colors.success} />
                                ) : (
                                    <X size={14} color={ds.colors.mutedForeground} />
                                )}
                                <Text
                                    color={requirement.met ? ds.colors.success : ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodySm.fontSize}
                                >
                                    {t(`resetPassword.${requirement.labelKey}`)}
                                </Text>
                            </XStack>
                        ))}
                    </YStack>

                    <YStack gap="$3">
                        <PasswordField
                            label={t("resetPassword.currentPasswordLabel", "Temporary password")}
                            placeholder={t("resetPassword.currentPasswordPlaceholder", "Enter your temporary password")}
                            value={currentPassword}
                            returnKeyType="next"
                            onChangeText={setCurrentPassword}
                            ds={ds}
                            textContentType="password"
                        />

                        <PasswordField
                            label={t("resetPassword.newPasswordLabel")}
                            placeholder={t("resetPassword.newPasswordPlaceholder")}
                            value={newPassword}
                            returnKeyType="next"
                            onChangeText={setNewPassword}
                            ds={ds}
                            textContentType="newPassword"
                        />

                        <PasswordField
                            label={t("resetPassword.confirmPasswordLabel")}
                            placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                            value={confirmPassword}
                            returnKeyType="done"
                            onChangeText={setConfirmPassword}
                            ds={ds}
                            textContentType="newPassword"
                            onSubmitEditing={() => {
                                void handleSubmit();
                            }}
                        />

                        {confirmPassword.length > 0 && !passwordsMatch ? (
                            <Paragraph
                                color={ds.colors.danger}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                px="$1"
                            >
                                {t("resetPassword.validation.noMatch", "Passwords do not match.")}
                            </Paragraph>
                        ) : null}

                        {errorMessage !== null ? <StatusMessage tone="danger" message={errorMessage} ds={ds} /> : null}

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
                            style={{ boxShadow: canSubmit ? ds.shadows.accent : "none" }}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
                        >
                            <XStack items="center" gap="$2">
                                <Text
                                    color={ds.colors.primaryForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelLg.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.4}
                                >
                                    {isSubmitting ? t("resetPassword.submitting") : t("resetPassword.submit")}
                                </Text>
                                <ArrowRight size={16} color={ds.colors.primaryForeground} />
                            </XStack>
                        </Button>
                    </YStack>
                </YStack>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

interface PasswordFieldProps {
    readonly label: string;
    readonly placeholder: string;
    readonly value: string;
    readonly returnKeyType: "done" | "next";
    readonly onChangeText: (text: string) => void;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly textContentType?: "password" | "newPassword";
    readonly onSubmitEditing?: () => void;
}

function PasswordField({
    label,
    placeholder,
    value,
    onChangeText,
    ds,
    textContentType = "password",
    returnKeyType,
    onSubmitEditing,
}: PasswordFieldProps) {
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
                    value={value}
                    onChangeText={onChangeText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType={textContentType}
                    secureTextEntry
                    placeholder={placeholder}
                    placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.titleSm.fontSize}
                    returnKeyType={returnKeyType}
                    onSubmitEditing={() => {
                        if (onSubmitEditing) onSubmitEditing();
                    }}
                />
            </XStack>
        </YStack>
    );
}

interface StatusMessageProps {
    readonly tone: "danger" | "success";
    readonly message: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
}

function StatusMessage({ tone, message, ds }: StatusMessageProps) {
    const isDanger = tone === "danger";
    return (
        <YStack
            borderWidth={1}
            borderColor={isDanger ? ds.colors.danger : ds.colors.success}
            bg={isDanger ? ds.colors.dangerSoft : ds.colors.successSoft}
            rounded={ds.radii.md}
            p="$3"
        >
            <Paragraph color={isDanger ? ds.colors.danger : ds.colors.success} fontFamily={ds.fonts.bodyMedium}>
                {message}
            </Paragraph>
        </YStack>
    );
}
