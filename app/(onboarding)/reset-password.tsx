import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Check, KeyRound, Lock, X } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { type TFunction } from "i18next";
import { type ColorTokens, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { OnboardingShell } from "components/onboarding/onboarding-shell";
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
        <OnboardingShell
            step={1}
            totalSteps={4}
            icon={Lock}
            eyebrow={t("resetPassword.stepLabel", "Step 1 of 4")}
            title={t("resetPassword.title", "Set your password")}
            subtitle={t(
                "resetPassword.headerSubtitle",
                "Set a strong password - you will use this every time you sign in.",
            )}
            ctaLabel={t("resetPassword.submit", "Set password")}
            ctaLoadingLabel={t("resetPassword.submitting", "Setting password...")}
            canSubmit={canSubmit}
            isLoading={isSubmitting}
            onCtaPress={() => {
                void handleSubmit();
            }}
            errorMessage={errorMessage}
            helperText={t(
                "resetPassword.helperText",
                "Your password is encrypted on this device and never shared in plain text.",
            )}
            avoidKeyboard
        >
            <RequirementsCard ds={ds} requirements={requirements} t={t} />

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
            </YStack>
        </OnboardingShell>
    );
}

interface RequirementsCardProps {
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly requirements: readonly PasswordRequirement[];
    readonly t: TFunction<"onboarding">;
}

function RequirementsCard({ ds, requirements, t }: RequirementsCardProps) {
    const metCount = requirements.filter((requirement) => requirement.met).length;
    const totalCount = requirements.length;
    const allMet = metCount === totalCount;

    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={allMet ? ds.colors.success : ds.colors.border}
            bg={ds.colors.surface}
            p="$4"
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            <XStack items="center" justify="space-between" gap="$3">
                <YStack flex={1} gap="$1">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleSm.fontSize}
                    >
                        {t("resetPassword.requirementsTitle", "Password requirements")}
                    </Text>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {`${metCount} of ${totalCount} met`}
                    </Paragraph>
                </YStack>
                <YStack
                    px="$3"
                    py="$2"
                    rounded={ds.radii.md}
                    bg={allMet ? ds.colors.successSoft : ds.colors.primarySoft}
                    borderWidth={1}
                    borderColor={allMet ? ds.colors.success : ds.colors.primary}
                >
                    <Text
                        color={allMet ? ds.colors.success : ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodySm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.1}
                    >
                        {allMet ? "Strong" : "Required"}
                    </Text>
                </YStack>
            </XStack>

            <YStack gap="$2">
                {requirements.map((requirement) => (
                    <XStack key={requirement.key} items="center" gap="$2">
                        <YStack
                            width={20}
                            height={20}
                            rounded={ds.radii.full}
                            items="center"
                            justify="center"
                            bg={requirement.met ? ds.colors.successSoft : ds.colors.mutedSurface}
                            borderWidth={1}
                            borderColor={requirement.met ? ds.colors.success : ds.colors.border}
                        >
                            {requirement.met ? (
                                <Check size={12} color={ds.colors.success} />
                            ) : (
                                <X size={12} color={ds.colors.mutedForeground} />
                            )}
                        </YStack>
                        <Text
                            color={requirement.met ? ds.colors.foreground : ds.colors.mutedForeground}
                            fontFamily={requirement.met ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                        >
                            {t(`resetPassword.${requirement.labelKey}`)}
                        </Text>
                    </XStack>
                ))}
            </YStack>
        </YStack>
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
    readonly onSubmitEditing?: (() => void) | undefined;
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
