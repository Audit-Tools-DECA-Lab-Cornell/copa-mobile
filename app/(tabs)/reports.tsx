import { useEffect, useMemo } from "react";
import { ScrollView } from "react-native";
import { Download, FileBarChart, TriangleAlert } from "@tamagui/lucide-icons";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { designSystem } from "lib/design-system";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";

/**
 * Scoring tab with audit performance visuals derived from assigned places.
 */
export default function ReportsScreen() {
    const session = useAuthStore((state) => state.session);
    const places = usePlacesStore((state) => state.places);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);

    useEffect(() => {
        if (session !== null) {
            void loadPlaces(session);
        }
    }, [session, loadPlaces]);

    const placesWithScores = useMemo(() => {
        return places.filter((place) => place.summary_score !== null);
    }, [places]);

    const averageAuditScore = useMemo(() => {
        if (placesWithScores.length === 0) {
            return 0;
        }
        const sum = placesWithScores.reduce((total, place) => {
            return total + (place.summary_score ?? 0);
        }, 0);
        return Math.round(sum / placesWithScores.length);
    }, [placesWithScores]);

    const topScoringPlace = useMemo(() => {
        if (placesWithScores.length === 0) {
            return null;
        }
        return placesWithScores.reduce((best, current) => {
            return (current.summary_score ?? 0) > (best.summary_score ?? 0) ? current : best;
        });
    }, [placesWithScores]);

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: designSystem.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: designSystem.spacing.screenPaddingHorizontal,
                paddingTop: designSystem.spacing.screenPaddingVertical,
                paddingBottom: 92,
                gap: 24,
            }}
        >
            <YStack gap="$4">
                <YStack gap="$1.5">
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.headingBold}
                        fontSize={designSystem.typography.displayMd.fontSize}
                        lineHeight={designSystem.typography.displayMd.lineHeight}
                        letterSpacing={-0.7}
                    >
                        Playspace Scoring
                    </Text>
                    <Paragraph
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyMedium}
                    >
                        Review audit performance across your assigned places.
                    </Paragraph>
                </YStack>

                <XStack gap="$3">
                    <MetricCard
                        label="Average audit score"
                        value={
                            placesWithScores.length > 0 ? `${averageAuditScore.toString()}%` : "--"
                        }
                        accentColor={designSystem.colors.primary}
                        helperText={`${placesWithScores.length.toString()} of ${places.length.toString()} places scored`}
                    />
                    <MetricCard
                        label="Top scoring place"
                        value={
                            topScoringPlace !== null
                                ? `${Math.round(topScoringPlace.summary_score ?? 0).toString()}%`
                                : "--"
                        }
                        accentColor={designSystem.colors.success}
                        helperText={topScoringPlace?.place_name ?? "No scored places yet"}
                    />
                </XStack>
            </YStack>

            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.border}
                bg={designSystem.colors.surface}
                p="$4"
                gap="$3"
                flex={1}
                items="stretch"
                style={{
                    boxShadow: designSystem.shadows.card,
                }}
            >
                <Text
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.5}
                >
                    Audit score by place
                </Text>

                <YStack gap="$3" flex={1}>
                    {places.map((place) => {
                        const hasScore = place.summary_score !== null;

                        return (
                            <YStack
                                key={place.place_id}
                                rounded={designSystem.radii.md}
                                borderWidth={1}
                                borderColor={designSystem.colors.border}
                                bg={designSystem.colors.input}
                                p="$3"
                                gap="$2"
                            >
                                <XStack justify="space-between" items="flex-start" gap="$3">
                                    <YStack flex={1}>
                                        <Text
                                            color={designSystem.colors.foreground}
                                            fontFamily={designSystem.fonts.bodyBold}
                                            fontSize={designSystem.typography.bodyLg.fontSize}
                                        >
                                            {place.place_name}
                                        </Text>
                                        <Paragraph
                                            color={designSystem.colors.mutedForeground}
                                            fontFamily={designSystem.fonts.bodyMedium}
                                            fontSize={designSystem.typography.bodyXs.fontSize}
                                        >
                                            {place.project_name}
                                        </Paragraph>
                                    </YStack>
                                    <YStack items="flex-end">
                                        <Paragraph
                                            color={
                                                hasScore
                                                    ? designSystem.colors.primary
                                                    : designSystem.colors.mutedForeground
                                            }
                                            fontFamily={designSystem.fonts.bodyBold}
                                            fontSize={designSystem.typography.bodyLg.fontSize}
                                        >
                                            {hasScore
                                                ? `${Math.round(place.summary_score ?? 0).toString()}%`
                                                : "Not scored"}
                                        </Paragraph>
                                    </YStack>
                                </XStack>

                                {hasScore ? (
                                    <YStack
                                        height={6}
                                        rounded={designSystem.radii.full}
                                        bg={designSystem.colors.mutedSurface}
                                        overflow="hidden"
                                    >
                                        <YStack
                                            height={6}
                                            rounded={designSystem.radii.full}
                                            bg={designSystem.colors.primary}
                                            width={`${Math.round(place.summary_score ?? 0).toString()}%`}
                                        />
                                    </YStack>
                                ) : null}
                            </YStack>
                        );
                    })}
                </YStack>
            </YStack>

            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.warning}
                bg={designSystem.colors.warningSoft}
                p="$4"
                gap="$3"
            >
                <XStack items="center" gap="$2" width="100%">
                    <TriangleAlert size={16} color={designSystem.colors.warning} />
                    <Text
                        flex={1}
                        color={designSystem.colors.warning}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.bodySm.fontSize}
                        lineHeight={designSystem.typography.bodySm.lineHeight}
                        textTransform="uppercase"
                        letterSpacing={0.7}
                        style={{ flexShrink: 1 }}
                    >
                        Combined scoring coming soon
                    </Text>
                </XStack>
                <Paragraph
                    color={designSystem.colors.secondaryForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodySm.fontSize}
                    lineHeight={designSystem.typography.bodySm.lineHeight}
                >
                    Combined scores that include manager survey data will be available in a future
                    update.
                </Paragraph>
            </YStack>

            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.border}
                bg={designSystem.colors.surface}
                p="$4"
                gap="$3"
                style={{
                    boxShadow: designSystem.shadows.card,
                }}
            >
                <XStack items="center" gap="$2">
                    <FileBarChart size={16} color={designSystem.colors.primary} />
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.headingBold}
                        fontSize={designSystem.typography.titleLg.fontSize}
                    >
                        Export preview
                    </Text>
                </XStack>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyMd.fontSize}
                    lineHeight={designSystem.typography.bodyMd.lineHeight}
                >
                    Export packages can include audit score, section-level scoring, and place
                    metadata.
                </Paragraph>
                <XStack gap="$2">
                    <ActionButton label="Export PDF" />
                    <ActionButton label="Export CSV" variant="primary" />
                </XStack>
            </YStack>
        </ScrollView>
    );
}

interface MetricCardProps {
    readonly label: string;
    readonly value: string;
    readonly accentColor: string;
    readonly helperText: string;
}

/**
 * Summary metric card used in the reports header.
 *
 * @param props Metric content and styling.
 * @returns Highlight card.
 */
function MetricCard({ label, value, accentColor, helperText }: MetricCardProps) {
    return (
        <YStack
            flex={1}
            rounded={designSystem.radii.lg}
            borderWidth={1}
            borderColor={designSystem.colors.border}
            bg={designSystem.colors.surface}
            px="$4"
            py="$3"
            justify="space-between"
            gap="$1"
            style={{
                boxShadow: designSystem.shadows.card,
            }}
        >
            <Paragraph
                color={designSystem.colors.mutedForeground}
                fontFamily={designSystem.fonts.bodyBold}
                fontSize={designSystem.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={designSystem.fonts.headingBold}
                fontSize={designSystem.typography.metricLg.fontSize}
                style={{ color: accentColor }}
            >
                {value}
            </Text>
            <Paragraph
                color={designSystem.colors.mutedForeground}
                fontFamily={designSystem.fonts.bodyMedium}
                fontSize={designSystem.typography.bodyXs.fontSize}
            >
                {helperText}
            </Paragraph>
        </YStack>
    );
}

interface ActionButtonProps {
    readonly label: string;
    readonly variant?: "default" | "primary";
}

/**
 * Export action button styled to match the extracted design system.
 *
 * @param props Button label and visual variant.
 * @returns Styled button.
 */
function ActionButton({ label, variant = "default" }: ActionButtonProps) {
    const isPrimary = variant === "primary";

    return (
        <Button
            flex={1}
            height={46}
            rounded={designSystem.radii.md}
            borderWidth={isPrimary ? 0 : 1}
            borderColor={designSystem.colors.border}
            bg={isPrimary ? designSystem.colors.primary : designSystem.colors.input}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
        >
            <XStack items="center" gap="$2">
                <Download
                    size={14}
                    color={
                        isPrimary
                            ? designSystem.colors.primaryForeground
                            : designSystem.colors.foreground
                    }
                />
                <Text
                    color={
                        isPrimary
                            ? designSystem.colors.primaryForeground
                            : designSystem.colors.foreground
                    }
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {label}
                </Text>
            </XStack>
        </Button>
    );
}
