import { useEffect, useMemo } from "react";
import { ScrollView } from "react-native";
import { Download, FileBarChart, TriangleAlert } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import {
    formatColumnSummary,
    formatConstructSummary,
    formatScoreValue,
    getCombinedConstructScore,
    type ScoreSummaryLabels,
} from "lib/audit/score-helpers";
import { useDesignSystem } from "lib/design-system";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";

/**
 * Scoring tab with audit performance visuals derived from assigned places.
 */
export default function ReportsScreen() {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");
    const session = useAuthStore((state) => state.session);
    const places = usePlacesStore((state) => state.places);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);

    useEffect(() => {
        if (session !== null) {
            loadPlaces(session).catch(() => undefined);
        }
    }, [session, loadPlaces]);

    const placesWithScores = useMemo(() => {
        return places.filter((place) => place.score_totals !== null);
    }, [places]);

    const scoreSummaryLabels: ScoreSummaryLabels = {
        playValueShort: t("playValueShort"),
        usabilityShort: t("usabilityShort"),
        sociabilityShort: t("sociabilityShort"),
        quantityShort: t("quantityShort"),
        diversityShort: t("diversityShort"),
        challengeShort: t("challengeShort"),
    };

    const averageCombinedConstructScore = useMemo(() => {
        if (placesWithScores.length === 0) {
            return 0;
        }
        const sum = placesWithScores.reduce((total, place) => {
            return total + (getCombinedConstructScore(place.score_totals) ?? 0);
        }, 0);
        return sum / placesWithScores.length;
    }, [placesWithScores]);

    const averageSociabilityScore = useMemo(() => {
        if (placesWithScores.length === 0) {
            return 0;
        }
        const sum = placesWithScores.reduce((total, place) => {
            return total + (place.score_totals?.sociability_total ?? 0);
        }, 0);
        return sum / placesWithScores.length;
    }, [placesWithScores]);

    const topScoringPlace = useMemo(() => {
        if (placesWithScores.length === 0) {
            return null;
        }
        return placesWithScores.reduce((best, current) => {
            return (getCombinedConstructScore(current.score_totals) ?? 0) >
                (getCombinedConstructScore(best.score_totals) ?? 0)
                ? current
                : best;
        });
    }, [placesWithScores]);

    const maxCombinedConstructScore = useMemo(() => {
        return placesWithScores.reduce((currentMax, place) => {
            return Math.max(currentMax, getCombinedConstructScore(place.score_totals) ?? 0);
        }, 0);
    }, [placesWithScores]);

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: ds.spacing.screenPaddingHorizontal,
                paddingTop: ds.spacing.screenPaddingVertical,
                paddingBottom: 92,
                gap: 24,
            }}
        >
            <YStack gap="$4">
                <YStack gap="$1.5">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={ds.typography.displayMd.fontSize}
                        lineHeight={ds.typography.displayMd.lineHeight}
                        letterSpacing={-0.7}
                    >
                        {t("title")}
                    </Text>
                    <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                        {t("subtitle")}
                    </Paragraph>
                </YStack>

                <YStack gap="$3">
                    <XStack gap="$3">
                        <MetricCard
                            label={t("averageConstructScore")}
                            value={
                                placesWithScores.length > 0
                                    ? formatScoreValue(averageCombinedConstructScore)
                                    : "--"
                            }
                            accentColor={ds.colors.primary}
                            helperText={t("scoredPlacesHelper", {
                                scored: placesWithScores.length,
                                total: places.length,
                            })}
                        />
                        <MetricCard
                            label={t("averageSociabilityScore")}
                            value={
                                placesWithScores.length > 0
                                    ? formatScoreValue(averageSociabilityScore)
                                    : "--"
                            }
                            accentColor={ds.colors.success}
                            helperText={t("sociabilityHelper")}
                        />
                    </XStack>
                    <MetricCard
                        label={t("topScoringPlace")}
                        value={
                            topScoringPlace === null
                                ? "--"
                                : formatScoreValue(
                                      getCombinedConstructScore(topScoringPlace.score_totals) ?? 0,
                                  )
                        }
                        accentColor={ds.colors.warning}
                        helperText={topScoringPlace?.place_name ?? t("noScoredPlacesYet")}
                    />
                </YStack>
            </YStack>

            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$3"
                flex={1}
                items="stretch"
                style={{
                    boxShadow: ds.shadows.card,
                }}
            >
                <Text
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.5}
                >
                    {t("auditScoreByPlace")}
                </Text>

                <YStack gap="$3" flex={1}>
                    {places.map((place) => {
                        const hasScore = place.score_totals !== null;
                        const combinedConstructScore = getCombinedConstructScore(
                            place.score_totals,
                        );
                        const barWidth =
                            hasScore &&
                            combinedConstructScore !== null &&
                            maxCombinedConstructScore > 0
                                ? `${Math.max(
                                      (combinedConstructScore / maxCombinedConstructScore) * 100,
                                      6,
                                  )}%`
                                : "0%";

                        return (
                            <YStack
                                key={place.place_id}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={ds.colors.input}
                                p="$3"
                                gap="$2"
                            >
                                <XStack justify="space-between" items="flex-start" gap="$3">
                                    <YStack flex={1}>
                                        <Text
                                            color={ds.colors.foreground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.bodyLg.fontSize}
                                        >
                                            {place.place_name}
                                        </Text>
                                        <Paragraph
                                            color={ds.colors.mutedForeground}
                                            fontFamily={ds.fonts.bodyMedium}
                                            fontSize={ds.typography.bodyXs.fontSize}
                                        >
                                            {place.project_name}
                                        </Paragraph>
                                    </YStack>
                                    <YStack items="flex-end">
                                        <Paragraph
                                            color={
                                                hasScore
                                                    ? ds.colors.primary
                                                    : ds.colors.mutedForeground
                                            }
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.bodyLg.fontSize}
                                        >
                                            {hasScore
                                                ? formatScoreValue(combinedConstructScore ?? 0)
                                                : t("notScored")}
                                        </Paragraph>
                                    </YStack>
                                </XStack>

                                {hasScore ? (
                                    <YStack gap="$1">
                                        <Paragraph
                                            color={ds.colors.mutedForeground}
                                            fontFamily={ds.fonts.bodyMedium}
                                            fontSize={ds.typography.bodySm.fontSize}
                                        >
                                            {formatConstructSummary(
                                                place.score_totals,
                                                scoreSummaryLabels,
                                            )}
                                        </Paragraph>
                                        <Paragraph
                                            color={ds.colors.mutedForeground}
                                            fontFamily={ds.fonts.bodyMedium}
                                            fontSize={ds.typography.bodyXs.fontSize}
                                        >
                                            {formatColumnSummary(
                                                place.score_totals,
                                                scoreSummaryLabels,
                                            )}
                                        </Paragraph>
                                    </YStack>
                                ) : null}

                                {hasScore ? (
                                    <YStack
                                        height={6}
                                        rounded={ds.radii.full}
                                        bg={ds.colors.mutedSurface}
                                        overflow="hidden"
                                    >
                                        <YStack
                                            height={6}
                                            rounded={ds.radii.full}
                                            bg={ds.colors.primary}
                                            style={{ width: barWidth }}
                                        />
                                    </YStack>
                                ) : null}
                            </YStack>
                        );
                    })}
                </YStack>
            </YStack>

            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.warning}
                bg={ds.colors.warningSoft}
                p="$4"
                gap="$3"
            >
                <XStack items="center" gap="$2" width="100%">
                    <TriangleAlert size={16} color={ds.colors.warning} />
                    <Text
                        flex={1}
                        color={ds.colors.warning}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodySm.fontSize}
                        lineHeight={ds.typography.bodySm.lineHeight}
                        textTransform="uppercase"
                        letterSpacing={0.7}
                        style={{ flexShrink: 1 }}
                    >
                        {t("combinedScoringComingSoon")}
                    </Text>
                </XStack>
                <Paragraph
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    lineHeight={ds.typography.bodySm.lineHeight}
                >
                    {t("combinedScoringDescription")}
                </Paragraph>
            </YStack>

            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$3"
                style={{
                    boxShadow: ds.shadows.card,
                }}
            >
                <XStack items="center" gap="$2">
                    <FileBarChart size={16} color={ds.colors.primary} />
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={ds.typography.titleLg.fontSize}
                    >
                        {t("exportPreview")}
                    </Text>
                </XStack>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                    lineHeight={ds.typography.bodyMd.lineHeight}
                >
                    {t("exportDescription")}
                </Paragraph>
                <XStack gap="$2">
                    <ActionButton label={t("exportPdf")} />
                    <ActionButton label={t("exportCsv")} variant="primary" />
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
    const ds = useDesignSystem();
    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            px="$4"
            py="$3"
            justify="space-between"
            gap="$1"
            style={{
                boxShadow: ds.shadows.card,
            }}
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={ds.fonts.headingBold}
                fontSize={ds.typography.metricLg.fontSize}
                style={{ color: accentColor }}
            >
                {value}
            </Text>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyXs.fontSize}
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
    const ds = useDesignSystem();
    const isPrimary = variant === "primary";

    return (
        <Button
            flex={1}
            height={46}
            rounded={ds.radii.md}
            borderWidth={isPrimary ? 0 : 1}
            borderColor={ds.colors.border}
            bg={isPrimary ? ds.colors.primary : ds.colors.input}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
        >
            <XStack items="center" gap="$2">
                <Download
                    size={14}
                    color={isPrimary ? ds.colors.primaryForeground : ds.colors.foreground}
                />
                <Text
                    color={isPrimary ? ds.colors.primaryForeground : ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {label}
                </Text>
            </XStack>
        </Button>
    );
}
