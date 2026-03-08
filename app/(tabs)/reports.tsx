import { useMemo } from "react";
import { ScrollView } from "react-native";
import { Download, FileBarChart, TriangleAlert } from "@tamagui/lucide-icons";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { REPORT_COMPARISON_ROWS, type ReportComparisonRow } from "lib/playspace-demo-data";
import { designSystem } from "lib/design-system";

/**
 * Scoring tab with audit and combined scoring visuals.
 */
export default function ReportsScreen() {
    const averageAuditScore = useMemo(() => {
        return calculateAverageAuditScore(REPORT_COMPARISON_ROWS);
    }, []);
    const averageCombinedScore = useMemo(() => {
        return calculateAverageCombinedScore(REPORT_COMPARISON_ROWS);
    }, []);
    const topCombinedPlace = useMemo(() => {
        return getTopCombinedPlace(REPORT_COMPARISON_ROWS);
    }, []);
    const topCombinedPlaceLabel = topCombinedPlace?.placeName ?? "Awaiting manager survey data";

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: designSystem.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: designSystem.spacing.screenPaddingHorizontal,
                paddingTop: designSystem.spacing.screenPaddingVertical,
                paddingBottom: 132,
                gap: 24,
            }}
        >
            <YStack gap="$4">
                <YStack gap="$1.5">
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.headingBold}
                        fontSize={32}
                        lineHeight={36}
                        letterSpacing={-0.7}
                    >
                        Playspace Scoring
                    </Text>
                    <Paragraph
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyMedium}
                    >
                        Review audit performance, see when combined scoring is ready, and prepare
                        exports for stakeholders.
                    </Paragraph>
                </YStack>

                <XStack gap="$3">
                    <MetricCard
                        label="Average audit score"
                        value={`${averageAuditScore}%`}
                        accentColor={designSystem.colors.primary}
                        helperText="Field results only"
                    />
                    <MetricCard
                        label="Average combined score"
                        value={
                            averageCombinedScore === null ? "Pending" : `${averageCombinedScore}%`
                        }
                        accentColor={
                            averageCombinedScore === null
                                ? designSystem.colors.warning
                                : designSystem.colors.success
                        }
                        helperText={topCombinedPlaceLabel}
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
                style={{
                    boxShadow: designSystem.shadows.card,
                }}
            >
                <Text
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={11}
                    textTransform="uppercase"
                    letterSpacing={1.5}
                >
                    Audit and combined score by place
                </Text>

                <YStack gap="$3">
                    {REPORT_COMPARISON_ROWS.map((row) => {
                        const combinedReady = row.managerSurveyStatus === "submitted";

                        return (
                            <YStack
                                key={row.id}
                                rounded={designSystem.radii.md}
                                borderWidth={1}
                                borderColor={designSystem.colors.border}
                                bg={designSystem.colors.input}
                                p="$3"
                                gap="$2.5"
                            >
                                <XStack justify="space-between" items="flex-start" gap="$3">
                                    <YStack flex={1}>
                                        <Text
                                            color={designSystem.colors.foreground}
                                            fontFamily={designSystem.fonts.bodyBold}
                                            fontSize={15}
                                        >
                                            {row.placeName}
                                        </Text>
                                        <Paragraph
                                            color={designSystem.colors.mutedForeground}
                                            fontFamily={designSystem.fonts.bodyMedium}
                                            fontSize={12}
                                        >
                                            {combinedReady
                                                ? "Combined score ready"
                                                : "Waiting for manager survey"}
                                        </Paragraph>
                                    </YStack>
                                    <YStack items="flex-end" gap="$0.5">
                                        <Paragraph
                                            color={designSystem.colors.primary}
                                            fontFamily={designSystem.fonts.bodyBold}
                                        >
                                            Audit {row.auditScore}%
                                        </Paragraph>
                                        <Paragraph
                                            color={
                                                row.combinedScore === null
                                                    ? designSystem.colors.warning
                                                    : designSystem.colors.success
                                            }
                                            fontFamily={designSystem.fonts.bodyBold}
                                        >
                                            {row.combinedScore === null
                                                ? "Combined pending"
                                                : `Combined ${row.combinedScore}%`}
                                        </Paragraph>
                                    </YStack>
                                </XStack>

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
                                        width={`${row.auditScore}%`}
                                    />
                                </YStack>
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
                <XStack items="flex-start" gap="$2.5" width="100%">
                    <TriangleAlert size={16} color={designSystem.colors.warning} />
                    <Text
                        flex={1}
                        color={designSystem.colors.warning}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={13}
                        textTransform="uppercase"
                        letterSpacing={1.1}
                        style={{ flexShrink: 1, lineHeight: 18 }}
                    >
                        Combined score updates after manager survey submission
                    </Text>
                </XStack>
                <Paragraph
                    color={designSystem.colors.secondaryForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    lineHeight={20}
                >
                    Audit score is available immediately after field completion, while combined
                    scoring depends on manager input submitted outside the mobile app.
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
                        fontSize={20}
                    >
                        Export preview
                    </Text>
                </XStack>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                >
                    Export packages can include audit score, combined score when available,
                    section-level scoring, and place metadata.
                </Paragraph>
                <XStack gap="$2">
                    <ActionButton label="Export PDF" />
                    <ActionButton label="Export CSV" variant="primary" />
                </XStack>
            </YStack>
        </ScrollView>
    );
}

/**
 * Calculate average audit score for the visible rows.
 *
 * @param rows Report comparison rows.
 * @returns Rounded average score.
 */
function calculateAverageAuditScore(rows: readonly ReportComparisonRow[]): number {
    if (rows.length === 0) {
        return 0;
    }

    const sum = rows.reduce((currentSum, row) => {
        return currentSum + row.auditScore;
    }, 0);

    return Math.round(sum / rows.length);
}

/**
 * Calculate average combined score for rows with available data.
 *
 * @param rows Report comparison rows.
 * @returns Rounded average or null when unavailable.
 */
function calculateAverageCombinedScore(rows: readonly ReportComparisonRow[]): number | null {
    const rowsWithCombinedScore = rows.filter((row) => row.combinedScore !== null);
    if (rowsWithCombinedScore.length === 0) {
        return null;
    }

    const sum = rowsWithCombinedScore.reduce((currentSum, row) => {
        return currentSum + (row.combinedScore ?? 0);
    }, 0);

    return Math.round(sum / rowsWithCombinedScore.length);
}

/**
 * Resolve the row with the highest combined score.
 *
 * @param rows Report comparison rows.
 * @returns Best combined score row or null for empty data.
 */
function getTopCombinedPlace(rows: readonly ReportComparisonRow[]): ReportComparisonRow | null {
    const rowsWithCombinedScore = rows.filter((row) => row.combinedScore !== null);
    const [firstRow, ...remainingRows] = rowsWithCombinedScore;
    if (firstRow === undefined) {
        return null;
    }

    return remainingRows.reduce((highest, current) => {
        if ((current.combinedScore ?? 0) > (highest.combinedScore ?? 0)) {
            return current;
        }

        return highest;
    }, firstRow);
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
            p="$4"
            gap="$2"
            style={{
                boxShadow: designSystem.shadows.card,
            }}
        >
            <Paragraph
                color={designSystem.colors.mutedForeground}
                fontFamily={designSystem.fonts.bodyBold}
                fontSize={10}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={designSystem.fonts.headingBold}
                fontSize={28}
                style={{ color: accentColor }}
            >
                {value}
            </Text>
            <Paragraph
                color={designSystem.colors.mutedForeground}
                fontFamily={designSystem.fonts.bodyMedium}
                fontSize={12}
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
                    fontSize={11}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {label}
                </Text>
            </XStack>
        </Button>
    );
}
