import { memo, useMemo } from "react";
import { Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { AuditScoreTotals } from "lib/audit/types";
import { formatPercentage, reportBarScoreTier, roundedPercentOfMax } from "lib/audit/score-helpers";
import { type DesignSystemTheme, useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useReportScoreTableLayout } from "lib/report-table-layout";

export interface DomainScoreBarsProps {
    readonly scoreTotals: AuditScoreTotals | null;
    readonly compact?: boolean;
}

type MetricKey = "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";

interface MetricConfig {
    readonly key: MetricKey;
    readonly labelKey: string;
    readonly value: (totals: AuditScoreTotals) => number;
    readonly max: (totals: AuditScoreTotals) => number;
}

const METRICS: readonly MetricConfig[] = [
    {
        key: "provision",
        labelKey: "domain.barProvision",
        value: (t) => t.provision_total,
        max: (t) => t.provision_total_max,
    },
    {
        key: "diversity",
        labelKey: "domain.barDiversity",
        value: (t) => t.diversity_total,
        max: (t) => t.diversity_total_max,
    },
    {
        key: "challenge",
        labelKey: "domain.barChallenge",
        value: (t) => t.challenge_total,
        max: (t) => t.challenge_total_max,
    },
    {
        key: "sociability",
        labelKey: "domain.barSociability",
        value: (t) => t.sociability_total,
        max: (t) => t.sociability_total_max,
    },
    {
        key: "play_value",
        labelKey: "domain.barPlayValue",
        value: (t) => t.play_value_total,
        max: (t) => t.play_value_total_max,
    },
    {
        key: "usability",
        labelKey: "domain.barUsability",
        value: (t) => t.usability_total,
        max: (t) => t.usability_total_max,
    },
];

const SCALE_BAR_METRICS = METRICS.slice(0, 4);
const PVU_BAR_METRICS = METRICS.slice(4, 6);

interface LegendItem {
    readonly label: string;
    readonly color: string;
}

/**
 * Map performance tier to design system bar color (same rules as report bar charts on web).
 */
function getTierBarColor(tier: ReturnType<typeof reportBarScoreTier>, ds: DesignSystemTheme): string {
    if (tier === "na") {
        return ds.colors.mutedForeground;
    }
    if (tier === "high") {
        return ds.colors.success;
    }
    if (tier === "mid") {
        return ds.colors.warning;
    }
    return ds.colors.danger;
}

/**
 * Six vertical score bars for one domain or overall totals.
 *
 * Phone: two rows (scale scores + construct scores)
 * Tablet: single aligned row matched to DomainScoreTable column widths
 */
export const DomainScoreBars = memo(function DomainScoreBars({ scoreTotals, compact = true }: DomainScoreBarsProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const tableLayout = useReportScoreTableLayout();
    const { t } = useTranslation("reports");

    // Fluid bar dimensions — scale up for tablets and wide tablets
    const trackHeight = layout.isWideTablet ? 196 : layout.isTablet ? 172 : compact ? 128 : 156;
    const barWidth = layout.isWideTablet ? 52 : layout.isTablet ? 46 : 40;

    const leftLegendItems = useMemo<readonly LegendItem[]>(
        () =>
            (["provision", "diversity", "challenge", "sociability"] as const).map((key) => {
                const metric = METRICS.find((m) => m.key === key)!;
                return {
                    label: t(metric.labelKey, { ns: "reports" }),
                    color: getTierBarColor(
                        reportBarScoreTier(
                            scoreTotals === null
                                ? null
                                : roundedPercentOfMax(metric.value(scoreTotals), metric.max(scoreTotals)),
                        ),
                        ds,
                    ),
                };
            }),
        [ds, scoreTotals, t],
    );

    const rightLegendItems = useMemo<readonly LegendItem[]>(
        () =>
            (["play_value", "usability"] as const).map((key) => {
                const metric = METRICS.find((m) => m.key === key)!;
                return {
                    label: t(metric.labelKey, { ns: "reports" }),
                    color: getTierBarColor(
                        reportBarScoreTier(
                            scoreTotals === null
                                ? null
                                : roundedPercentOfMax(metric.value(scoreTotals), metric.max(scoreTotals)),
                        ),
                        ds,
                    ),
                };
            }),
        [ds, scoreTotals, t],
    );

    const renderBar = (metric: MetricConfig, cellWidth?: number) => {
        const value = scoreTotals === null ? 0 : metric.value(scoreTotals);
        const maximum = scoreTotals === null ? 0 : metric.max(scoreTotals);
        const isNa = scoreTotals === null || maximum <= 0;
        const pctRounded = roundedPercentOfMax(value, maximum);
        const tier = reportBarScoreTier(pctRounded);
        const fillRatio = isNa ? 0 : Math.min(1, value / maximum);
        const fillHeight = Math.round(fillRatio * trackHeight * 100) / 100;
        const barColor = getTierBarColor(tier, ds);
        const pctLabel = isNa ? t("extendedTable.notApplicable", { ns: "reports" }) : `${pctRounded}%`;
        const label = t(metric.labelKey, { ns: "reports" });
        const a11yLabel = isNa ? t("detail.metricNotAssessed", { ns: "reports" }) : formatPercentage(value, maximum);

        return (
            <YStack
                key={metric.key}
                items="center"
                gap="$1.5"
                flex={cellWidth === undefined ? 1 : undefined}
                width={cellWidth}
                style={cellWidth === undefined ? { maxWidth: barWidth + 20 } : undefined}
            >
                {/* Percentage label above bar */}
                <Text
                    color={isNa ? ds.colors.mutedForeground : ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.bodyXs.fontSize}
                    style={{ textAlign: "center" }}
                    numberOfLines={1}
                >
                    {pctLabel}
                </Text>

                {/* Bar track */}
                <YStack
                    height={trackHeight}
                    width={barWidth}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    rounded={ds.radii.sm}
                    overflow="hidden"
                    justify="flex-end"
                    accessibilityRole="progressbar"
                    accessibilityLabel={`${t(metric.labelKey, { ns: "reports" })}: ${a11yLabel}`}
                    style={{ backgroundColor: ds.colors.input }}
                >
                    {!isNa && fillHeight > 0 ? (
                        <YStack
                            height={fillHeight}
                            width="100%"
                            style={{
                                backgroundColor: barColor,
                                opacity: 0.9,
                            }}
                        />
                    ) : isNa ? (
                        <YStack flex={1} justify="center" items="center" px="$0.5">
                            <Text
                                color={ds.colors.mutedForeground}
                                fontSize={ds.typography.bodyXs.fontSize}
                                style={{ textAlign: "center" }}
                            >
                                —
                            </Text>
                        </YStack>
                    ) : null}
                </YStack>

                {/* Metric label below bar */}
                <Text
                    color={ds.colors.mutedForeground}
                    fontSize={ds.typography.bodyXs.fontSize}
                    lineHeight={ds.typography.bodyXs.lineHeight}
                    numberOfLines={3}
                    width="100%"
                    style={{ textAlign: "center" }}
                >
                    {label}
                </Text>
            </YStack>
        );
    };

    const renderLegend = (items: readonly LegendItem[]) => (
        <YStack width={tableLayout.labelColWidth} justify="flex-end" pb="$1" gap="$1.5">
            {items.map((item) => (
                <XStack key={item.label} items="center" gap="$1.5">
                    <YStack
                        width={8}
                        height={8}
                        rounded={9999}
                        style={{ backgroundColor: item.color, flexShrink: 0 }}
                    />
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyXs.fontSize}
                        numberOfLines={1}
                        style={{ flexShrink: 1 }}
                    >
                        {item.label}
                    </Text>
                </XStack>
            ))}
        </YStack>
    );

    // ── Tablet layout: single row with legend columns aligned to score table ──
    if (layout.isTablet) {
        return (
            <XStack
                gap="$2"
                items="flex-end"
                style={{ minWidth: tableLayout.leftTableWidth + tableLayout.rightTableWidth + 8 }}
            >
                <YStack width={tableLayout.leftTableWidth} gap="$1" items="flex-start">
                    <XStack width={tableLayout.leftTableWidth} items="flex-end">
                        {renderLegend(leftLegendItems)}
                        {SCALE_BAR_METRICS.map((m) => renderBar(m, tableLayout.leftDataColWidth))}
                    </XStack>
                </YStack>
                <YStack width={tableLayout.rightTableWidth} gap="$1" items="flex-start">
                    <XStack width={tableLayout.rightTableWidth} items="flex-end">
                        {renderLegend(rightLegendItems)}
                        {PVU_BAR_METRICS.map((m) => renderBar(m, tableLayout.rightDataColWidth))}
                    </XStack>
                </YStack>
            </XStack>
        );
    }

    // ── Phone compact: two labeled rows ──
    if (compact) {
        return (
            <YStack gap="$4" width="100%">
                <YStack gap="$1.5">
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                        style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                        {t("domain.barRowScaleScores", { ns: "reports" })}
                    </Text>
                    <XStack justify="space-evenly" items="flex-end" gap="$2" width="100%">
                        {SCALE_BAR_METRICS.map((m) => renderBar(m))}
                    </XStack>
                </YStack>
                <YStack gap="$1.5">
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                        style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                        {t("domain.barRowPlayValueUsability", { ns: "reports" })}
                    </Text>
                    <XStack justify="space-evenly" items="flex-end" gap="$2" width="100%">
                        {PVU_BAR_METRICS.map((m) => renderBar(m))}
                    </XStack>
                </YStack>
            </YStack>
        );
    }

    // ── Phone non-compact: single row with all six bars ──
    return (
        <XStack justify="space-evenly" items="flex-end" gap="$2" width="100%">
            {METRICS.map((m) => renderBar(m))}
        </XStack>
    );
});
