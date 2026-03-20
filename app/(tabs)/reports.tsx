import { useEffect, useMemo } from "react";
import { ScrollView } from "react-native";
import { Download, FileBarChart, TriangleAlert } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
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

                <XStack gap="$3">
                    <MetricCard
                        label={t("averageAuditScore")}
                        value={
                            placesWithScores.length > 0 ? `${averageAuditScore.toString()}%` : "--"
                        }
                        accentColor={ds.colors.primary}
                        helperText={t("scoredPlacesHelper", {
                            scored: placesWithScores.length,
                            total: places.length,
                        })}
                    />
                    <MetricCard
                        label={t("topScoringPlace")}
                        value={
                            topScoringPlace !== null
                                ? `${Math.round(topScoringPlace.summary_score ?? 0).toString()}%`
                                : "--"
                        }
                        accentColor={ds.colors.success}
                        helperText={topScoringPlace?.place_name ?? t("noScoredPlacesYet")}
                    />
                </XStack>
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
                        const hasScore = place.summary_score !== null;

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
                                                ? `${Math.round(place.summary_score ?? 0).toString()}%`
                                                : t("notScored")}
                                        </Paragraph>
                                    </YStack>
                                </XStack>

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
