import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Text, YStack, XStack } from "tamagui";
import { Check } from "@tamagui/lucide-icons-2";
import { useDesignSystem } from "lib/design-system";
import { useReduceMotion } from "lib/ui/use-reduce-motion";

export type SubmitState = "idle" | "submitting" | "success";

interface ExecuteSectionBottomNavProps {
    readonly onPrevPress: () => void;
    readonly onNextPress: () => void;
    readonly showPrevButton: boolean;
    readonly isPrimaryDisabled: boolean;
    readonly isSubmit: boolean;
    readonly isAnswered: boolean; // True when the current section has no unanswered required questions
    readonly isSavingDraft: boolean;
    readonly lastAnswerChangeTime: number | undefined; // Timestamp when last answer was applied
    readonly submitState?: SubmitState;
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
 * Submission moment sequence (when submitState changes):
 * - "submitting": button shows spinner, terracotta background
 * - "success": button transitions to moss with checkmark, scale 1.0→1.04→1.0 overshoot
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
    isAnswered,
    isSavingDraft,
    lastAnswerChangeTime,
    submitState = "idle",
}: Readonly<ExecuteSectionBottomNavProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation(["audit", "common"]);
    const reduceMotion = useReduceMotion();
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const opacityRef = useRef(new Animated.Value(0));
    const savingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const submitScaleRef = useRef(new Animated.Value(1));

    // Submission moment overshoot animation when state transitions to "success"
    useEffect(() => {
        if (submitState !== "success") {
            submitScaleRef.current.setValue(1);
            return;
        }
        if (reduceMotion) {
            submitScaleRef.current.setValue(1);
            return;
        }
        Animated.sequence([
            Animated.spring(submitScaleRef.current, {
                toValue: 1.04,
                stiffness: 240,
                damping: 12,
                useNativeDriver: true,
            }),
            Animated.spring(submitScaleRef.current, {
                toValue: 1.0,
                stiffness: 200,
                damping: 18,
                useNativeDriver: true,
            }),
        ]).start();
    }, [submitState, reduceMotion]);

    // Manage auto-save feedback sequence
    useEffect(() => {
        if (lastAnswerChangeTime === undefined) {
            return;
        }

        // Start showing "Saving..." with fade in
        setSaveStatus("saving");
        if (reduceMotion) {
            opacityRef.current.setValue(1);
        } else {
            opacityRef.current.setValue(0);
            Animated.timing(opacityRef.current, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }

        // Clear any existing timeouts
        if (savingTimeoutRef.current !== null) {
            clearTimeout(savingTimeoutRef.current);
        }
        if (idleTimeoutRef.current !== null) {
            clearTimeout(idleTimeoutRef.current);
        }

        // After 600ms, cross-fade to "Saved locally"
        savingTimeoutRef.current = setTimeout(() => {
            setSaveStatus("saved");
            if (!reduceMotion) {
                Animated.timing(opacityRef.current, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            }
        }, 600);

        // After 2000ms total, fade out and return to idle
        idleTimeoutRef.current = setTimeout(() => {
            if (reduceMotion) {
                opacityRef.current.setValue(0);
                setSaveStatus("idle");
                return;
            }
            Animated.timing(opacityRef.current, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setSaveStatus("idle");
            });
        }, 2000);

        return () => {
            if (savingTimeoutRef.current !== null) {
                clearTimeout(savingTimeoutRef.current);
            }
            if (idleTimeoutRef.current !== null) {
                clearTimeout(idleTimeoutRef.current);
            }
        };
    }, [lastAnswerChangeTime, reduceMotion]);

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

                {/* Next/Submit Button.
                 *
                 * Three visual states (per Phase 3 spec — auditors can always skip, never blocked):
                 *  - submitting/success: solid moss/terracotta with spinner or check
                 *  - answered (default): solid terracotta — clear "advance" affordance
                 *  - unanswered: outlined terracotta — present but non-insistent, signals "incomplete"
                 */}
                <Animated.View style={{ transform: [{ scale: submitScaleRef.current }] }}>
                    <Button
                        flex={0}
                        height={44}
                        rounded={8}
                        bg={
                            submitState === "success"
                                ? ds.colors.success
                                : submitState === "submitting" || isSavingDraft
                                  ? ds.colors.primary
                                  : isAnswered
                                    ? ds.colors.primary
                                    : "transparent"
                        }
                        borderWidth={isAnswered || submitState !== "idle" || isSavingDraft ? 0 : 1}
                        borderColor={ds.colors.border}
                        opacity={isPrimaryDisabled && submitState === "idle" ? 0.6 : 1}
                        disabled={isPrimaryDisabled || isSavingDraft || submitState !== "idle"}
                        pressStyle={{ scale: 0.97 }}
                        onPress={onNextPress}
                    >
                        <XStack gap="$2" items="center">
                            {submitState === "submitting" && (
                                <ActivityIndicator size="small" color={ds.colors.primaryForeground} />
                            )}
                            {submitState === "success" && <Check size={16} color={ds.colors.primaryForeground} />}
                            <Text
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={13}
                                fontWeight="600"
                                color={
                                    submitState === "idle" && !isSavingDraft && !isAnswered
                                        ? ds.colors.mutedForeground
                                        : ds.colors.primaryForeground
                                }
                                textTransform="uppercase"
                                letterSpacing={0.5}
                            >
                                {submitState === "submitting"
                                    ? t("section.uploadingShort", { ns: "audit" })
                                    : submitState === "success"
                                      ? t("section.submittedShort", { ns: "audit", defaultValue: "Submitted" })
                                      : isSavingDraft
                                        ? t("section.uploadingShort", { ns: "audit" })
                                        : isSubmit
                                          ? t("copy.submitSubject", { ns: "audit", subject: "Audit" })
                                          : t("section.nextLabel", { ns: "audit" })}
                            </Text>
                        </XStack>
                    </Button>
                </Animated.View>
            </XStack>
        </YStack>
    );
}
