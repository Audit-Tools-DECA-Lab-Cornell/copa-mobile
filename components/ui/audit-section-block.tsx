import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { YStack, XStack, Text, Button } from "tamagui";
import { ChevronRight } from "@tamagui/lucide-icons-2";
import { useDesignSystem } from "lib/design-system";
import { useReduceMotion } from "lib/ui/use-reduce-motion";

interface AuditSectionBlockProps {
    readonly domainNumber: number;
    readonly domainName: string;
    readonly sectionHeading: string;
    readonly questionNumber: number;
    readonly totalQuestions: number;
    readonly sectionNumber: number;
    readonly totalSections: number;
    readonly questionText: string;
    readonly progressPercent: number;
    readonly hasProvisionScale?: boolean;
    readonly onProvisionSelect?: (value: 0 | 1 | 2 | 3) => void;
    readonly provisionValue?: 0 | 1 | 2 | 3 | null;
    readonly autoSaveStatus?: "idle" | "saving" | "saved";
}

/**
 * Mobile equivalent of web AuditSectionBlock. Primary component for audit execution.
 * Displays domain, section, question, provision scale, and auto-save feedback.
 *
 * This is the most important component in the product — where auditors spend their time.
 */
export function AuditSectionBlock({
    domainNumber,
    domainName,
    sectionHeading,
    questionNumber,
    totalQuestions,
    sectionNumber,
    totalSections,
    questionText,
    progressPercent,
    hasProvisionScale = false,
    onProvisionSelect,
    provisionValue = null,
    autoSaveStatus = "idle",
}: Readonly<AuditSectionBlockProps>) {
    const ds = useDesignSystem();
    const reduceMotion = useReduceMotion();
    const [isProvisionExpanded, setIsProvisionExpanded] = useState(false);
    const progressAnim = useRef(new Animated.Value(progressPercent / 100)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const saveOpacity = useRef(new Animated.Value(0)).current;

    // Animate progress bar width
    useEffect(() => {
        if (reduceMotion) {
            progressAnim.setValue(progressPercent / 100);
            return;
        }
        Animated.spring(progressAnim, {
            toValue: progressPercent / 100,
            stiffness: 120,
            damping: 20,
            useNativeDriver: false,
        }).start();
    }, [progressPercent, progressAnim, reduceMotion]);

    // Animate provision icon rotation
    useEffect(() => {
        if (reduceMotion) {
            rotateAnim.setValue(isProvisionExpanded ? 1 : 0);
            return;
        }
        Animated.spring(rotateAnim, {
            toValue: isProvisionExpanded ? 1 : 0,
            stiffness: 200,
            damping: 18,
            useNativeDriver: true,
        }).start();
    }, [isProvisionExpanded, rotateAnim, reduceMotion]);

    // Animate save status visibility
    useEffect(() => {
        if (autoSaveStatus === "saved") {
            saveOpacity.setValue(1);
            if (reduceMotion) {
                const idleTimer = setTimeout(() => {
                    saveOpacity.setValue(0);
                }, 2000);
                return () => clearTimeout(idleTimer);
            }
            const timer = setTimeout(() => {
                Animated.timing(saveOpacity, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }).start();
            }, 200);
            return () => clearTimeout(timer);
        }
        saveOpacity.setValue(0);
        return undefined;
    }, [autoSaveStatus, saveOpacity, reduceMotion]);

    const provisionLabels = ["None", "Limited", "Moderate", "High"];

    return (
        <YStack gap="$4" p="$4" bg={ds.colors.surface} rounded={12}>
            {/* Header */}
            <YStack gap="$2">
                {/* Domain eyebrow — violet marks the PVUA methodology context */}
                <Text
                    fontFamily={ds.fonts.headingMedium}
                    fontSize={11}
                    fontWeight="500"
                    letterSpacing={0.48}
                    color={ds.colors.violet}
                    textTransform="uppercase"
                >
                    Domain {domainNumber} · {domainName}
                </Text>

                {/* Section heading */}
                <Text fontFamily={ds.fonts.headingBold} fontSize={16} fontWeight="600" color={ds.colors.foreground}>
                    {sectionHeading}
                </Text>

                {/* Question counter */}
                <Text fontFamily={ds.fonts.bodyMedium} fontSize={12} fontWeight="400" color={ds.colors.mutedForeground}>
                    Question {questionNumber} of {totalQuestions} · Section {sectionNumber} of {totalSections}
                </Text>

                {/* Progress bar */}
                <Animated.View
                    style={{
                        height: 2,
                        backgroundColor: ds.colors.border,
                        borderRadius: 1,
                        overflow: "hidden",
                    }}
                >
                    <Animated.View
                        style={{
                            height: "100%",
                            backgroundColor: ds.colors.violet,
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0%", "100%"],
                            }),
                        }}
                    />
                </Animated.View>
            </YStack>

            {/* Body */}
            <YStack gap="$3">
                {/* Question text */}
                <Text
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={13}
                    fontWeight="400"
                    color={ds.colors.mutedForeground}
                    lineHeight={1.6}
                >
                    {questionText}
                </Text>

                {/* Provision scale (if enabled) */}
                {hasProvisionScale && (
                    <YStack gap="$2">
                        <Button
                            rounded={8}
                            borderWidth={0.5}
                            borderColor={ds.colors.border}
                            bg="transparent"
                            py="$2"
                            px="$3"
                            pressStyle={{ scale: 0.97 }}
                            onPress={() => setIsProvisionExpanded(!isProvisionExpanded)}
                        >
                            <XStack gap="$2">
                                <Text
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={11}
                                    fontWeight="500"
                                    color={ds.colors.foreground}
                                >
                                    Provision Scale
                                </Text>

                                <Animated.View
                                    style={{
                                        transform: [
                                            {
                                                rotateZ: rotateAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ["0deg", "90deg"],
                                                }),
                                            },
                                        ],
                                    }}
                                >
                                    <ChevronRight size={16} color={ds.colors.foreground} />
                                </Animated.View>
                            </XStack>
                        </Button>

                        {/* Expanded provision options */}
                        {isProvisionExpanded && (
                            <YStack gap="$2" pl="$2">
                                {provisionLabels.map((label, value) => (
                                    <Button
                                        key={value}
                                        flex={1}
                                        rounded={6}
                                        borderWidth={1}
                                        borderColor={provisionValue === value ? ds.colors.primary : ds.colors.border}
                                        bg={provisionValue === value ? "rgba(197, 138, 92, 0.12)" : "transparent"}
                                        py="$2"
                                        pressStyle={{ scale: 0.97 }}
                                        onPress={() => {
                                            onProvisionSelect?.(value as 0 | 1 | 2 | 3);
                                        }}
                                    >
                                        <Text
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={11}
                                            fontWeight="500"
                                            color={
                                                provisionValue === value ? ds.colors.primary : ds.colors.mutedForeground
                                            }
                                        >
                                            {value} — {label}
                                        </Text>
                                    </Button>
                                ))}
                            </YStack>
                        )}
                    </YStack>
                )}

                {/* Auto-save indicator */}
                {autoSaveStatus !== "idle" && (
                    <Animated.View style={{ opacity: saveOpacity }}>
                        <Text
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={11}
                            fontWeight="400"
                            color={ds.colors.mutedForeground}
                        >
                            {autoSaveStatus === "saving" ? "Saving..." : "Saved locally"}
                        </Text>
                    </Animated.View>
                )}
            </YStack>
        </YStack>
    );
}
