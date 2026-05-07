import { useTranslation } from "react-i18next";
import { Button, Text, YStack, XStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";

interface ExecuteSectionBottomNavProps {
    readonly onPrevPress: () => void;
    readonly onNextPress: () => void;
    readonly showPrevButton: boolean;
    readonly isPrimaryDisabled: boolean;
    readonly isSubmit: boolean;
    readonly saveStatus: "idle" | "saving" | "saved";
    readonly isSavingDraft: boolean;
}

/**
 * Fixed bottom navigation bar for audit section execution.
 * Contains Prev/Next buttons and auto-save status indicator.
 * Positioned absolute at screen bottom with fixed height.
 *
 * @param props Navigation and state props
 * @returns Fixed bottom navigation component
 */
export function ExecuteSectionBottomNav({
    onPrevPress,
    onNextPress,
    showPrevButton,
    isPrimaryDisabled,
    isSubmit,
    saveStatus,
    isSavingDraft,
}: Readonly<ExecuteSectionBottomNavProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation(["audit", "common"]);

    return (
        <YStack
            width="100%"
            height={64}
            bg={ds.colors.surface}
            borderTopWidth={1}
            borderTopColor={ds.colors.border}
            px="$4"
            py="$2"
            justify="center"
        >
            <XStack gap="$3" justify="space-between" items="center">
                {/* Prev Button */}
                {showPrevButton && (
                    <Button
                        flex={0}
                        height={44}
                        bg="transparent"
                        borderWidth={0}
                        pressStyle={{ scale: 0.97 }}
                        onPress={onPrevPress}
                    >
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={13}
                            fontWeight="600"
                        >
                            ← {t("section.backLabel", { ns: "audit" })}
                        </Text>
                    </Button>
                )}

                {/* Center spacer / Save status (Task 2 integration point) */}
                <YStack flex={1} justify="center" items="center">
                    {saveStatus === "saving" && (
                        <Text
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={11}
                            fontWeight="400"
                            color={ds.colors.mutedForeground}
                        >
                            {t("section.savingStatus", { ns: "audit" })}
                        </Text>
                    )}
                    {saveStatus === "saved" && (
                        <Text
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={11}
                            fontWeight="400"
                            color={ds.colors.mutedForeground}
                        >
                            {t("section.savedLocalStatus", { ns: "audit" })}
                        </Text>
                    )}
                </YStack>

                {/* Next/Submit Button */}
                <Button
                    flex={0}
                    height={44}
                    rounded={8}
                    bg={isPrimaryDisabled || isSavingDraft ? ds.colors.mutedForeground : ds.colors.primary}
                    borderWidth={0}
                    opacity={isPrimaryDisabled || isSavingDraft ? 0.6 : 1}
                    disabled={isPrimaryDisabled || isSavingDraft}
                    pressStyle={{ scale: 0.97 }}
                    onPress={onNextPress}
                >
                    <Text
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={13}
                        fontWeight="600"
                        color={ds.colors.primaryForeground}
                        textTransform="uppercase"
                        letterSpacing={0.5}
                    >
                        {isSavingDraft
                            ? t("section.uploadingShort", { ns: "audit" })
                            : isSubmit
                              ? t("copy.submitSubject", { ns: "audit", subject: "Audit" })
                              : t("section.nextLabel", { ns: "audit" })}
                    </Text>
                </Button>
            </XStack>
        </YStack>
    );
}
