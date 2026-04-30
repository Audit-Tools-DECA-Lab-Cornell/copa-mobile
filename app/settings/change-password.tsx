import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Check, KeyRound, X } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, type ColorTokens, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useAuthStore } from "stores/auth-store";
import { createModuleLogger } from "lib/logger";

const logger = createModuleLogger("settings.change-password");

interface PasswordRequirement {
    readonly key: string;
    readonly labelKey: string;
    readonly met: boolean;
}

function buildRequirements(password: string): PasswordRequirement[] {
    return [
        { key: "minLength", labelKey: "validation.tooShort", met: password.length >= 8 },
        { key: "uppercase", labelKey: "validation.missingUppercase", met: /[A-Z]/.test(password) },
        { key: "lowercase", labelKey: "validation.missingLowercase", met: /[a-z]/.test(password) },
        { key: "number", labelKey: "validation.missingNumber", met: /\d/.test(password) },
    ];
}

/**
 * Settings stack screen for changing the authenticated user's password.
 */
export default function ChangePasswordScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("settings");
    const changePassword = useAuthStore((state) => state.changePassword);
    const isSubmitting = useAuthStore((state) => state.isSubmitting);

    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
        setSuccessMessage(null);

        if (currentPassword.length === 0) {
            setErrorMessage(t("changePassword.validation.currentPasswordRequired"));
            return;
        }
        if (!allRequirementsMet) {
            setErrorMessage(t("changePassword.validation.tooShort"));
            return;
        }
        if (newPassword === currentPassword) {
            setErrorMessage(
                t("changePassword.validation.sameAsCurrent", "Choose a password different from your current password."),
            );
            return;
        }
        if (!passwordsMatch) {
            setErrorMessage(t("changePassword.validation.noMatch"));
            return;
        }

        try {
            await changePassword(currentPassword, newPassword);
            setSuccessMessage(t("changePassword.success"));
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            logger.error("Failed to change password", error instanceof Error ? error.message : String(error));
            setErrorMessage(
                t(
                    "changePassword.validation.failed",
                    "We could not update your password. Please check your current password and try again.",
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
                    paddingVertical: layout.isTablet ? 48 : 28,
                }}
            >
                <YStack gap="$5" width="100%" style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}>
                    <YStack gap="$1">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={
                                layout.isTablet ? ds.typography.displaySm.fontSize : ds.typography.titleMd.fontSize
                            }
                            textTransform="uppercase"
                            fontStyle="italic"
                        >
                            {t("changePassword.title")}
                        </Text>
                        <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                            {t(
                                "changePassword.subtitle",
                                "Update your password regularly to keep your account secure.",
                            )}
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
                            {t("changePassword.requirementsTitle", "Password requirements")}
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
                                    {t(`changePassword.${requirement.labelKey}`)}
                                </Text>
                            </XStack>
                        ))}
                    </YStack>

                    <YStack gap="$3">
                        <PasswordField
                            label={t("changePassword.currentPasswordLabel")}
                            placeholder={t("changePassword.currentPasswordPlaceholder")}
                            value={currentPassword}
                            returnKeyType="next"
                            onChangeText={setCurrentPassword}
                            ds={ds}
                        />

                        <PasswordField
                            label={t("changePassword.newPasswordLabel")}
                            placeholder={t("changePassword.newPasswordPlaceholder")}
                            value={newPassword}
                            returnKeyType="next"
                            onChangeText={setNewPassword}
                            textContentType="newPassword"
                            ds={ds}
                        />

                        <PasswordField
                            label={t("changePassword.confirmPasswordLabel")}
                            placeholder={t("changePassword.confirmPasswordPlaceholder")}
                            value={confirmPassword}
                            returnKeyType="done"
                            onChangeText={setConfirmPassword}
                            textContentType="newPassword"
                            ds={ds}
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
                                {t("changePassword.validation.noMatch")}
                            </Paragraph>
                        ) : null}

                        {successMessage !== null ? (
                            <StatusMessage tone="success" message={successMessage} ds={ds} />
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
                            <Text
                                color={ds.colors.primaryForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelLg.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.4}
                            >
                                {isSubmitting ? t("changePassword.submitting") : t("changePassword.submit")}
                            </Text>
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
    readonly onChangeText: (text: string) => void;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly textContentType?: "password" | "newPassword";
    readonly returnKeyType: "done" | "next";
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
    readonly tone: "success" | "danger";
    readonly message: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
}

function StatusMessage({ tone, message, ds }: StatusMessageProps) {
    const isSuccess = tone === "success";
    return (
        <YStack
            borderWidth={1}
            borderColor={isSuccess ? ds.colors.success : ds.colors.danger}
            bg={isSuccess ? ds.colors.successSoft : ds.colors.dangerSoft}
            rounded={ds.radii.md}
            p="$3"
        >
            <Paragraph color={isSuccess ? ds.colors.success : ds.colors.danger} fontFamily={ds.fonts.bodyMedium}>
                {message}
            </Paragraph>
        </YStack>
    );
}
