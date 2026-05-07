import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Text, YStack, XStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";

interface ExecuteSectionBottomNavProps {
    readonly onPrevPress: () => void;
    readonly onNextPress: () => void;
    readonly showPrevButton: boolean;
    readonly isPrimaryDisabled: boolean;
    readonly isSubmit: boolean;
    readonly isSavingDraft: boolean;
    readonly lastAnswerChangeTime: number | undefined; // Timestamp when last answer was applied
}

/**
 * Fixed bottom navigation bar for audit section execution.
 * Contains Prev/Next buttons and auto-save status indicator.
 * Positioned absolute at screen bottom with fixed height.
 *
 * Auto-save feedback sequence:
 * - Answer applied → "Saving..." fades in (150ms)
 * - After 600ms → "Saved locally" fades in (cross-fade 200ms)
 * - After 2000ms total → Fades out (300ms)
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
    isSavingDraft,
    lastAnswerChangeTime,
}: Readonly<ExecuteSectionBottomNavProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation(["audit", "common"]);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const opacityRef = useRef(new Animated.Value(0));
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Manage auto-save feedback sequence
    useEffect(() => {
        if (lastAnswerChangeTime === undefined) {
            return;
        }

        // Start showing "Saving..." with fade in
        setSaveStatus("saving");
        opacityRef.current.setValue(0);
        Animated.timing(opacityRef.current, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();

        // Clear any existing timeouts
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
        }

        // After 600ms, cross-fade to "Saved locally"
        timeoutRef.current = setTimeout(() => {
            setSaveStatus("saved");
            Animated.timing(opacityRef.current, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }, 600);

        // After 2000ms total, fade out and return to idle
        timeoutRef.current = setTimeout(() => {
            Animated.timing(opacityRef.current, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setSaveStatus("idle");
            });
        }, 2000);

        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [lastAnswerChangeTime]);

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

                {/* Center spacer / Save status */}
                <YStack flex={1} justify="center" items="center">
                    {saveStatus !== "idle" && (
                        <Animated.View style={{ opacity: opacityRef.current }}>
                            <Text
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={11}
                                fontWeight="400"
                                color={ds.colors.mutedForeground}
                            >
                                {saveStatus === "saving"
                                    ? t("section.savingStatus", { ns: "audit" })
                                    : t("section.savedLocalStatus", { ns: "audit" })}
                            </Text>
                        </Animated.View>
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
