import { memo, useMemo } from "react";
import { Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { AuditScoreTotals } from "lib/audit/types";
import { formatPercentage } from "lib/audit/score-helpers";
import { getScaleAccentColor, useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import {
    REPORT_SCORE_LEFT_DATA_COL_WIDTH,
    REPORT_SCORE_RIGHT_DATA_COL_WIDTH_TABLET,
    REPORT_SCORE_LABEL_COL_WIDTH,
    REPORT_SCORE_LEFT_TABLE_WIDTH,
    REPORT_SCORE_RIGHT_TABLE_WIDTH,
} from "components/reports/DomainScoreTable";

export interface DomainScoreBarsProps {
    readonly scoreTotals: AuditScoreTotals | null;
    readonly compact?: boolean;
}

interface MetricConfig {
    readonly key: "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";
    readonly labelKey: string;
    readonly value: (totals: AuditScoreTotals) => number;
    readonly max: (totals: AuditScoreTotals) => number;
}

const METRICS: readonly MetricConfig[] = [
    {
        key: "provision",
        labelKey: "domain.barProvision",
        value: (totals) => totals.provision_total,
        max: (totals) => totals.provision_total_max,
    },
    {
        key: "diversity",
        labelKey: "domain.barDiversity",
        value: (totals) => totals.diversity_total,
        max: (totals) => totals.diversity_total_max,
    },
    {
        key: "challenge",
        labelKey: "domain.barChallenge",
        value: (totals) => totals.challenge_total,
        max: (totals) => totals.challenge_total_max,
    },
    {
        key: "sociability",
        labelKey: "domain.barSociability",
        value: (totals) => totals.sociability_total,
        max: (totals) => totals.sociability_total_max,
    },
    {
        key: "play_value",
        labelKey: "domain.barPlayValue",
        value: (totals) => totals.play_value_total,
        max: (totals) => totals.play_value_total_max,
    },
    {
        key: "usability",
        labelKey: "domain.barUsability",
        value: (totals) => totals.usability_total,
        max: (totals) => totals.usability_total_max,
    },
];

/** Scale-column bars (provision → sociability); mobile row 1. */
const SCALE_BAR_METRICS = METRICS.slice(0, 4);
/** Play value + usability; mobile row 2. */
const PVU_BAR_METRICS = METRICS.slice(4, 6);

interface LegendItem {
    readonly shortLabel: string;
    readonly fullLabel: string;
    readonly color: string;
}

function resolveMetricLabel(
    metric: MetricConfig,
    translate: (key: string) => string,
    useShortScaleLabels: boolean,
): string {
    if (!useShortScaleLabels) {
        return translate(metric.labelKey);
    }
    switch (metric.key) {
        case "provision":
            return translate("domain.barProvisionShort");
        case "diversity":
            return translate("domain.barDiversityShort");
        case "challenge":
            return translate("domain.barChallengeShort");
        case "sociability":
            return translate("domain.barSociabilityShort");
        default:
            return translate(metric.labelKey);
    }
}

function getBarColorForPercentage(
    pct: number | null,
    colors: {
        readonly border: string;
        readonly success: string;
        readonly warning: string;
        readonly danger: string;
    },
): string {
    if (pct === null) {
        return colors.border;
    }
    if (pct >= 85) {
        return colors.success;
    }
    if (pct >= 60) {
        return colors.warning;
    }
    return colors.danger;
}

/**
 * Six vertical score bars for one domain or overall totals.
 * On phone, scale scores and PV/U scores render as two rows; tablets keep one row.
 */
export const DomainScoreBars = memo(function DomainScoreBars({ scoreTotals, compact = true }: DomainScoreBarsProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("reports");
    const trackHeight = compact && !layout.isTablet ? 120 : 160;
    const barWidth = layout.isTablet ? 44 : 40;

    const colorTokens = useMemo(
        () => ({
            border: ds.colors.border,
            success: ds.colors.success,
            warning: ds.colors.warning,
            danger: ds.colors.danger,
        }),
        [ds.colors.border, ds.colors.danger, ds.colors.success, ds.colors.warning],
    );

    const leftLegendItems = useMemo<readonly LegendItem[]>(() => {
        return [
            {
                shortLabel: t("domain.barProvisionShort", { ns: "reports" }),
                fullLabel: t("domain.barProvision", { ns: "reports" }),
                color: getScaleAccentColor("provision", ds.colors),
            },
            {
                shortLabel: t("domain.barDiversityShort", { ns: "reports" }),
                fullLabel: t("domain.barDiversity", { ns: "reports" }),
                color: getScaleAccentColor("diversity", ds.colors),
            },
            {
                shortLabel: t("domain.barChallengeShort", { ns: "reports" }),
                fullLabel: t("domain.barChallenge", { ns: "reports" }),
                color: getScaleAccentColor("challenge", ds.colors),
            },
            {
                shortLabel: t("domain.barSociabilityShort", { ns: "reports" }),
                fullLabel: t("domain.barSociability", { ns: "reports" }),
                color: getScaleAccentColor("sociability", ds.colors),
            },
        ];
    }, [ds.colors, t]);

    const rightLegendItems = useMemo<readonly LegendItem[]>(() => {
        return [
            {
                shortLabel: t("domain.barPlayValue", { ns: "reports" }),
                fullLabel: t("domain.barPlayValue", { ns: "reports" }),
                color: ds.colors.warning,
            },
            {
                shortLabel: t("domain.barUsability", { ns: "reports" }),
                fullLabel: t("domain.barUsability", { ns: "reports" }),
                color: ds.colors.primary,
            },
        ];
    }, [ds.colors.primary, ds.colors.warning, t]);

    const renderMetricBar = (metric: MetricConfig, cellWidth?: number) => {
        const totals = scoreTotals;
        const value = totals === null ? 0 : metric.value(totals);
        const maximum = totals === null ? 0 : metric.max(totals);
        const isNaMetric = totals === null || maximum <= 0;
        const pct = isNaMetric ? null : (value / maximum) * 100;
        const fillHeight = isNaMetric ? 0 : Math.round(Math.min(1, value / maximum) * trackHeight * 100) / 100;
        const barColor = getBarColorForPercentage(isNaMetric ? null : pct, colorTokens);
        const pctLabel = isNaMetric ? t("extendedTable.notApplicable", { ns: "reports" }) : `${Math.round(pct ?? 0)}%`;
        const a11yPct = isNaMetric
            ? t("detail.metricNotAssessed", { ns: "reports" })
            : formatPercentage(value, maximum);
        const label = resolveMetricLabel(metric, (key) => t(key, { ns: "reports" }), layout.isTablet);

        return (
            <YStack
                key={metric.labelKey}
                items="center"
                gap="$1"
                flex={cellWidth === undefined ? 1 : undefined}
                width={cellWidth}
                style={cellWidth === undefined ? { maxWidth: barWidth + 16 } : undefined}
            >
                <YStack
                    height={trackHeight}
                    width={barWidth}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    rounded={ds.radii.sm}
                    overflow="hidden"
                    justify="flex-end"
                    accessibilityRole="progressbar"
                    accessibilityLabel={`${label}: ${a11yPct}`}
                >
                    {isNaMetric ? (
                        <YStack flex={1} justify="center" items="center" width="100%">
                            <Text
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodyXs.fontSize}
                                style={{ textAlign: "center" }}
                            >
                                {pctLabel}
                            </Text>
                        </YStack>
                    ) : (
                        <YStack
                            height={fillHeight}
                            width="100%"
                            justify="flex-end"
                            p="$0.5"
                            style={{ backgroundColor: barColor }}
                        >
                            <Text
                                color={ds.colors.primaryForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodyXs.fontSize}
                                style={{ textAlign: "center" }}
                            >
                                {pctLabel}
                            </Text>
                        </YStack>
                    )}
                </YStack>
                <Text
                    color={ds.colors.mutedForeground}
                    fontSize={ds.typography.bodyXs.fontSize}
                    lineHeight={ds.typography.bodyXs.lineHeight}
                    numberOfLines={layout.isTablet ? 1 : 2}
                    width="100%"
                    style={{ textAlign: "center" }}
                >
                    {label}
                </Text>
            </YStack>
        );
    };

    const useTwoRows = compact && !layout.isTablet;

    if (useTwoRows) {
        return (
            <YStack gap="$4" width="100%">
                <YStack gap="$1">
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                    >
                        {t("domain.barRowScaleScores", { ns: "reports" })}
                    </Text>
                    <XStack justify="space-evenly" items="flex-end" gap="$2" width="100%">
                        {SCALE_BAR_METRICS.map((m) => renderMetricBar(m))}
                    </XStack>
                </YStack>
                <YStack gap="$1">
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                    >
                        {t("domain.barRowPlayValueUsability", { ns: "reports" })}
                    </Text>
                    <XStack justify="space-evenly" items="flex-end" gap="$2" width="100%">
                        {PVU_BAR_METRICS.map((m) => renderMetricBar(m))}
                    </XStack>
                </YStack>
            </YStack>
        );
    }

    if (layout.isTablet) {
        const renderLegend = (items: readonly LegendItem[]) => (
            <YStack width={REPORT_SCORE_LABEL_COL_WIDTH} justify="flex-end" pb="$1" gap="$1.5">
                {items.map((item) => (
                    <XStack key={`${item.shortLabel}-${item.fullLabel}`} items="center" gap="$1.5">
                        <YStack width={8} height={8} rounded={9999} style={{ backgroundColor: item.color }} />
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyXs.fontSize}
                            numberOfLines={1}
                            style={{ flexShrink: 1 }}
                        >
                            {`${item.shortLabel} = ${item.fullLabel}`}
                        </Text>
                    </XStack>
                ))}
            </YStack>
        );

        return (
            <XStack
                gap="$2"
                items="flex-end"
                style={{ minWidth: REPORT_SCORE_LEFT_TABLE_WIDTH + REPORT_SCORE_RIGHT_TABLE_WIDTH + 8 }}
            >
                <YStack width={REPORT_SCORE_LEFT_TABLE_WIDTH} gap="$1" items="flex-start">
                    <XStack width={REPORT_SCORE_LEFT_TABLE_WIDTH} items="flex-end">
                        {renderLegend(leftLegendItems)}
                        {SCALE_BAR_METRICS.map((metric) => renderMetricBar(metric, REPORT_SCORE_LEFT_DATA_COL_WIDTH))}
                    </XStack>
                </YStack>
                <YStack width={REPORT_SCORE_RIGHT_TABLE_WIDTH} gap="$1" items="flex-start">
                    <XStack width={REPORT_SCORE_RIGHT_TABLE_WIDTH} items="flex-end">
                        {renderLegend(rightLegendItems)}
                        {PVU_BAR_METRICS.map((metric) =>
                            renderMetricBar(metric, REPORT_SCORE_RIGHT_DATA_COL_WIDTH_TABLET),
                        )}
                    </XStack>
                </YStack>
            </XStack>
        );
    }

    return (
        <XStack justify="space-evenly" items="flex-end" gap="$2" width="100%">
            {METRICS.map((metric) => renderMetricBar(metric))}
        </XStack>
    );
});
