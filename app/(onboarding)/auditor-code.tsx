import { useEffect, useState } from "react";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
    withRepeat,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { BadgeCheck, ShieldCheck } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { OnboardingShell } from "components/onboarding/onboarding-shell";
import { useAuthStore } from "stores/auth-store";
import { fetchMyAuditorProfile } from "lib/audit/profile-api";
import { createModuleLogger } from "lib/logger";

const logger = createModuleLogger("onboarding.auditor-code");

/**
 * Step 4 (final) of onboarding: reveals the auditor code and explains its
 * purpose.  This is the celebratory step - the code is shown in a prominent
 * "trophy" card, with explanatory copy framed as a privacy guarantee.
 */
export default function AuditorCodeScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["onboarding", "common"]);
    const session = useAuthStore((state) => state.session);
    const updateNextStep = useAuthStore((state) => state.updateNextStep);

    const [auditorCode, setAuditorCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let isSubscribed = true;

        if (session === null) {
            setAuditorCode(null);
            setIsLoading(false);
            setErrorMessage(t("sessionExpired", { ns: "common" }));
            return () => {
                isSubscribed = false;
            };
        }

        setIsLoading(true);
        setErrorMessage(null);

        void fetchMyAuditorProfile(session)
            .then((profile) => {
                if (!isSubscribed) {
                    return;
                }
                setAuditorCode(profile.auditor_code ?? null);
                setIsLoading(false);
            })
            .catch((error: Error) => {
                logger.error("Failed to fetch auditor profile", error.message);
                if (!isSubscribed) {
                    return;
                }
                setErrorMessage(
                    t(
                        "auditorCode.loadFailed",
                        "We could not load your auditor code. You can continue and find it later in settings.",
                    ),
                );
                setIsLoading(false);
            });

        return () => {
            isSubscribed = false;
        };
    }, [session, t]);

    const handleEnter = (): void => {
        void updateNextStep("DASHBOARD").then(() => {
            router.replace("/(tabs)");
        });
    };

    return (
        <OnboardingShell
            step={4}
            totalSteps={4}
            icon={BadgeCheck}
            eyebrow={t("auditorCode.stepLabel", "Step 4 of 4")}
            title={t("auditorCode.title", "Your auditor code")}
            subtitle={t("auditorCode.headerSubtitle", "Your unique identifier on every audit you submit.")}
            ctaLabel={isLoading ? t("auditorCode.loading", "Loading") : t("auditorCode.submit", "Enter COPA")}
            ctaLoadingLabel={t("auditorCode.loading", "Loading")}
            canSubmit={!isLoading}
            isLoading={isLoading}
            onCtaPress={handleEnter}
            errorMessage={errorMessage}
            helperText={t("auditorCode.helperText", "You can copy this code anytime from your profile in Settings.")}
        >
            <CodeRevealCard
                auditorCode={auditorCode}
                ds={ds}
                hasError={errorMessage !== null}
                isLoading={isLoading}
                isTablet={layout.isTablet}
                codeLabel={t("auditorCode.codeLabel", "Auditor code")}
            />

            <PrivacyExplanationCard ds={ds} explanation={t("auditorCode.explanation")} />
        </OnboardingShell>
    );
}

interface CodeRevealCardProps {
    readonly auditorCode: string | null;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly hasError: boolean;
    readonly isLoading: boolean;
    readonly isTablet: boolean;
    readonly codeLabel: string;
}

/**
 * The hero "trophy" card that reveals the assigned auditor code.  Sized large
 * enough to feel celebratory while still fitting compact phone widths.
 */
function CodeRevealCard({ auditorCode, ds, hasError, isLoading, isTablet, codeLabel }: CodeRevealCardProps) {
    const isHighlighted = !hasError;
    const codeFontSize = ds.typography.metricMd.fontSize;
    const codeLineHeight = ds.typography.metricMd.lineHeight;

    // Skeleton pulse while loading
    const skeletonOpacity = useSharedValue(0.35);
    useEffect(() => {
        if (isLoading) {
            skeletonOpacity.value = withRepeat(
                withSequence(withTiming(0.7, { duration: 600 }), withTiming(0.35, { duration: 600 })),
                -1,
            );
        }
    }, [isLoading, skeletonOpacity]);

    const skeletonStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));

    // Code reveal — fires once when the code first arrives
    const codeScale = useSharedValue(0.75);
    const codeOpacity = useSharedValue(0);
    useEffect(() => {
        if (auditorCode !== null) {
            codeScale.value = withSpring(1, { damping: 12, stiffness: 150 });
            codeOpacity.value = withTiming(1, { duration: 280 });
        }
    }, [auditorCode, codeScale, codeOpacity]);

    const codeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: codeScale.value }],
        opacity: codeOpacity.value,
    }));

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={2}
            borderColor={isHighlighted ? ds.colors.primary : ds.colors.border}
            bg={isHighlighted ? ds.colors.primarySoft : ds.colors.surface}
            py={isTablet ? "$7" : "$6"}
            px="$5"
            items="center"
            gap="$3"
            style={{ boxShadow: isHighlighted ? ds.shadows.accent : ds.shadows.card }}
            accessibilityRole="text"
        >
            <Paragraph
                color={isHighlighted ? ds.colors.primary : ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelMd.fontSize}
                textTransform="uppercase"
                letterSpacing={2.2}
            >
                {codeLabel}
            </Paragraph>
            {isLoading ? (
                <Animated.View style={skeletonStyle}>
                    <YStack width={180} height={56} rounded={ds.radii.md} bg={ds.colors.border} />
                </Animated.View>
            ) : (
                <Animated.View style={codeStyle}>
                    <Text
                        color={auditorCode !== null ? ds.colors.primary : ds.colors.mutedForeground}
                        fontFamily={ds.fonts.monoMedium}
                        fontSize={codeFontSize}
                        lineHeight={codeLineHeight}
                        selectable
                    >
                        {auditorCode ?? "-"}
                    </Text>
                </Animated.View>
            )}
        </YStack>
    );
}

interface PrivacyExplanationCardProps {
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly explanation: string;
}

/**
 * Supporting card that explains why the auditor code matters.  The shield
 * icon reinforces the privacy framing.
 */
function PrivacyExplanationCard({ ds, explanation }: PrivacyExplanationCardProps) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(14);

    useEffect(() => {
        opacity.value = withDelay(320, withTiming(1, { duration: 300 }));
        translateY.value = withDelay(320, withSpring(0, { damping: 18, stiffness: 180 }));
    }, [opacity, translateY]);

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View style={animStyle}>
            <YStack
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$3"
                style={{ boxShadow: ds.shadows.card }}
            >
                <XStack items="flex-start" gap="$3">
                    <YStack
                        width={36}
                        height={36}
                        rounded={ds.radii.md}
                        items="center"
                        justify="center"
                        bg={ds.colors.successSoft}
                        borderWidth={1}
                        borderColor={ds.colors.success}
                    >
                        <ShieldCheck size={18} color={ds.colors.success} />
                    </YStack>
                    <YStack flex={1} gap="$1">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.titleSm.fontSize}
                        >
                            Why we use a code
                        </Text>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyMd.fontSize}
                            lineHeight={ds.typography.bodyMd.lineHeight}
                        >
                            {explanation}
                        </Paragraph>
                    </YStack>
                </XStack>
            </YStack>
        </Animated.View>
    );
}
