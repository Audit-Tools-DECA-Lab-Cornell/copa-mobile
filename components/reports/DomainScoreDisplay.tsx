import { memo, useMemo } from "react";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { AuditScoreTotals } from "lib/audit/types";
import { formatPercentage, formatScoreValue } from "lib/audit/score-helpers";
import { getScaleAccentColor, useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

import { useReportScoreTableLayout } from "lib/report-table-layout";
import { DomainScoreTable } from "components/reports/DomainScoreTable";
import { type TFunction } from "i18next";

export interface DomainScoreDisplayProps {
    readonly scoreTotals: AuditScoreTotals | null;
    readonly itemCount: number;
}

// ── Metric definitions ───────────────────────────────────────────────────────

type MetricKey = "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";

interface MetricConfig {
    readonly key: MetricKey;
    readonly labelKey: string;
    readonly shortLabelKey?: string;
    readonly value: (t: AuditScoreTotals) => number;
    readonly max: (t: AuditScoreTotals) => number;
}

const SCALE_METRICS: readonly MetricConfig[] = [
    {
        key: "provision",
        labelKey: "domain.barProvision",
        shortLabelKey: "domain.barProvisionShort",
        value: (t) => t.provision_total,
        max: (t) => t.provision_total_max,
    },
    {
        key: "diversity",
        labelKey: "domain.barDiversity",
        shortLabelKey: "domain.barDiversityShort",
        value: (t) => t.diversity_total,
        max: (t) => t.diversity_total_max,
    },
    {
        key: "challenge",
        labelKey: "domain.barChallenge",
        shortLabelKey: "domain.barChallengeShort",
        value: (t) => t.challenge_total,
        max: (t) => t.challenge_total_max,
    },
    {
        key: "sociability",
        labelKey: "domain.barSociability",
        shortLabelKey: "domain.barSociabilityShort",
        value: (t) => t.sociability_total,
        max: (t) => t.sociability_total_max,
    },
];

const CONSTRUCT_METRICS: readonly MetricConfig[] = [
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

function getMetricColor(key: MetricKey, ds: ReturnType<typeof useDesignSystem>): string {
    if (key === "play_value") return ds.colors.warning;
    if (key === "usability") return ds.colors.primary;
    return getScaleAccentColor(key as Parameters<typeof getScaleAccentColor>[0], ds.colors);
}

// ── Bar rendering ─────────────────────────────────────────────────────────────

interface AlignedBarCellProps {
    readonly metric: MetricConfig;
    readonly scoreTotals: AuditScoreTotals | null;
    readonly colWidth: number; // matches the data column width in the sub-table below
    readonly barWidth: number; // visual bar width (≤ colWidth)
    readonly trackHeight: number;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly useShortLabel: boolean;
    readonly t: TFunction<"reports", undefined>;
}

/**
 * One vertical bar cell sized to exactly match a table data column.
 * The bar is centered within `colWidth` so it aligns with the column below.
 */
function AlignedBarCell({
    metric,
    scoreTotals,
    colWidth,
    barWidth,
    trackHeight,
    ds,
    useShortLabel,
    t,
}: AlignedBarCellProps) {
    const value = scoreTotals === null ? 0 : metric.value(scoreTotals);
    const maximum = scoreTotals === null ? 0 : metric.max(scoreTotals);
    const isNa = scoreTotals === null || maximum <= 0;
    const pct = isNa ? null : (value / maximum) * 100;
    const fillRatio = isNa ? 0 : Math.min(1, value / maximum);
    const fillHeight = Math.round(fillRatio * trackHeight * 100) / 100;
    const barColor = getMetricColor(metric.key, ds);

    const pctLabel = isNa ? t("extendedTable.notApplicable", { ns: "reports" }) : `${Math.round(pct ?? 0)}%`;
    const shortLabel =
        useShortLabel && metric.shortLabelKey !== undefined
            ? t(metric.shortLabelKey, { ns: "reports" })
            : t(metric.labelKey, { ns: "reports" });
    const a11yPct = isNa ? t("detail.metricNotAssessed", { ns: "reports" }) : formatPercentage(value, maximum);

    return (
        <YStack
            width={colWidth}
            items="center"
            gap="$1"
            pb="$1"
            accessibilityRole="none"
            accessibilityLabel={`${t(metric.labelKey, { ns: "reports" })}: ${a11yPct}`}
        >
            {/* Percentage above bar — always visible regardless of fill */}
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
                style={{ backgroundColor: ds.colors.input }}
            >
                {!isNa && fillHeight > 0 ? (
                    <YStack height={fillHeight} width="100%" style={{ backgroundColor: barColor, opacity: 0.88 }} />
                ) : isNa ? (
                    <YStack flex={1} justify="center" items="center">
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
                numberOfLines={2}
                width={colWidth - 4}
                style={{ textAlign: "center" }}
            >
                {shortLabel}
            </Text>
        </YStack>
    );
}

// ── Tablet legend ─────────────────────────────────────────────────────────────

interface LegendItem {
    readonly shortLabel: string;
    readonly fullLabel: string;
    readonly color: string;
}

interface TabletLegendProps {
    readonly items: readonly LegendItem[];
    readonly width: number;
    readonly ds: ReturnType<typeof useDesignSystem>;
}

function TabletLegend({ items, width, ds }: TabletLegendProps) {
    return (
        <YStack width={width} justify="flex-end" pb="$1" gap="$1.5">
            {items.map((item) => (
                <XStack key={item.shortLabel} items="center" gap="$1.5">
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
                        {`${item.shortLabel} = ${item.fullLabel}`}
                    </Text>
                </XStack>
            ))}
        </YStack>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Adaptive score visualization: bars + tables in a coordinated layout.
 *
 * Phone
 * ─────
 * Bars and their corresponding table scroll together horizontally
 * so every bar sits directly above its matching column — two separate
 * scrollable groups (scale scores, then construct scores):
 *
 *   ┌────────────────────────────────────────── scroll ──┐
 *   │ [spacer] │ Prov │ Div │ Chal │ Soc │              │
 *   │ Achieved │  12  │  8  │  6   │  3  │  ← table     │
 *   │ Max      │  18  │  10 │  8   │  6  │              │
 *   └────────────────────────────────────────────────────┘
 *   ┌──────────────────────────── scroll ──┐
 *   │ [spacer] │ Play Value │ Usability │  │
 *   │ Achieved │     24     │    18     │  │
 *   │ Max      │     36     │    28     │  │
 *   └──────────────────────────────────────┘
 *
 * Tablet
 * ──────
 * Classic two-column layout (unchanged):
 *   [Scale bars+legend | PVU bars+legend]   (bars row)
 *   [Scale table       | PVU table      ]   (tables row)
 */
export const DomainScoreDisplay = memo(function DomainScoreDisplay({
    scoreTotals,
    itemCount,
}: DomainScoreDisplayProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const tableLayout = useReportScoreTableLayout();
    const { t } = useTranslation("reports");

    // Bar visual dimensions — scale with viewport tier
    const trackHeight = layout.isTablet ? 180 : 144;
    const barWidth = layout.isTablet ? 50 : 38;

    const scaleLeftLegendItems = useMemo<readonly LegendItem[]>(
        () =>
            SCALE_METRICS.map((m) => ({
                shortLabel: t(m.shortLabelKey ?? m.labelKey, { ns: "reports" }),
                fullLabel: t(m.labelKey, { ns: "reports" }),
                color: getMetricColor(m.key, ds),
            })),
        [ds, t],
    );

    const constructRightLegendItems = useMemo<readonly LegendItem[]>(
        () =>
            CONSTRUCT_METRICS.map((m) => ({
                shortLabel: t(m.labelKey, { ns: "reports" }),
                fullLabel: t(m.labelKey, { ns: "reports" }),
                color: getMetricColor(m.key, ds),
            })),
        [ds, t],
    );

    // ── Tablet layout ──────────────────────────────────────────────────────
    if (layout.isTablet) {
        const minRowWidth = tableLayout.leftTableWidth + tableLayout.rightTableWidth;

        return (
            <YStack gap="$3" width="100%">
                {/* Bars row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <XStack gap="$2" items="flex-end" style={{ minWidth: minRowWidth }}>
                        {/* Scale bars */}
                        <XStack width={tableLayout.leftTableWidth} items="flex-end">
                            <TabletLegend items={scaleLeftLegendItems} width={tableLayout.labelColWidth} ds={ds} />
                            {SCALE_METRICS.map((m) => (
                                <AlignedBarCell
                                    key={m.key}
                                    metric={m}
                                    scoreTotals={scoreTotals}
                                    colWidth={tableLayout.leftDataColWidth}
                                    barWidth={barWidth}
                                    trackHeight={trackHeight}
                                    ds={ds}
                                    useShortLabel
                                    t={t}
                                />
                            ))}
                        </XStack>

                        {/* PVU bars */}
                        <XStack width={tableLayout.rightTableWidth} items="flex-end">
                            <TabletLegend items={constructRightLegendItems} width={tableLayout.labelColWidth} ds={ds} />
                            {CONSTRUCT_METRICS.map((m) => (
                                <AlignedBarCell
                                    key={m.key}
                                    metric={m}
                                    scoreTotals={scoreTotals}
                                    colWidth={tableLayout.rightDataColWidth}
                                    barWidth={barWidth}
                                    trackHeight={trackHeight}
                                    ds={ds}
                                    useShortLabel={false}
                                    t={t}
                                />
                            ))}
                        </XStack>
                    </XStack>
                </ScrollView>

                {/* Tables row — DomainScoreTable handles its own tablet layout */}
                <DomainScoreTable scoreTotals={scoreTotals} itemCount={itemCount} />
            </YStack>
        );
    }

    // ── Phone layout: two independently scrollable groups ──────────────────
    //
    // On phone, the right (PVU) sub-table uses leftDataColWidth for both its
    // columns (same as DomainScoreTable does internally), so PVU bars also
    // use leftDataColWidth to stay in sync.
    //
    const phoneBarWidth = barWidth; // 38px
    const phoneLeftDataColWidth = tableLayout.leftDataColWidth; // 72px
    const phoneRightDataColWidth = tableLayout.rightDataColWidth; // 180px
    const phoneLabelColWidth = tableLayout.labelColWidth; // 120px

    const scaleGroupWidth = phoneLabelColWidth + phoneLeftDataColWidth * SCALE_METRICS.length;
    const constructGroupWidth = phoneLabelColWidth + phoneRightDataColWidth * CONSTRUCT_METRICS.length;

    const renderPhoneSection = (
        metrics: readonly MetricConfig[],
        groupWidth: number,
        dataColWidth: number,
        sectionLabelKey: string,
        tableGroup: "scale" | "construct",
    ) => (
        <YStack gap="$1" width="100%">
            {/* Section label */}
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodyXs.fontSize}
                style={{ textTransform: "uppercase", letterSpacing: 0.6 }}
            >
                {t(sectionLabelKey, { ns: "reports" })}
            </Text>

            {/* Bars + table in one shared horizontal scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator>
                <YStack gap="$0">
                    {/* Bar row — label-width spacer keeps bars above columns */}
                    <XStack items="flex-end" pb="$1">
                        {/* Spacer matching the label column */}
                        <YStack width={phoneLabelColWidth} />
                        {metrics.map((m) => (
                            <AlignedBarCell
                                key={m.key}
                                metric={m}
                                scoreTotals={scoreTotals}
                                colWidth={dataColWidth}
                                barWidth={phoneBarWidth}
                                trackHeight={trackHeight}
                                ds={ds}
                                useShortLabel
                                t={t}
                            />
                        ))}
                    </XStack>

                    {/* Sub-table — same column widths, so bars are perfectly aligned */}
                    <PhoneSubTable
                        group={tableGroup}
                        scoreTotals={scoreTotals}
                        itemCount={itemCount}
                        tableWidth={groupWidth}
                        labelColWidth={phoneLabelColWidth}
                        dataColWidth={dataColWidth}
                        ds={ds}
                        t={t}
                    />
                </YStack>
            </ScrollView>
        </YStack>
    );

    return (
        <YStack gap="$4" width="100%">
            {renderPhoneSection(
                SCALE_METRICS,
                scaleGroupWidth,
                phoneLeftDataColWidth,
                "domain.barRowScaleScores",
                "scale",
            )}
            {renderPhoneSection(
                CONSTRUCT_METRICS,
                constructGroupWidth,
                phoneRightDataColWidth,
                "domain.barRowPlayValueUsability",
                "construct",
            )}
        </YStack>
    );
});

// ── PhoneSubTable ─────────────────────────────────────────────────────────────

interface PhoneSubTableProps {
    readonly group: "scale" | "construct";
    readonly scoreTotals: AuditScoreTotals | null;
    readonly itemCount: number;
    readonly tableWidth: number;
    readonly labelColWidth: number;
    readonly dataColWidth: number;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly t: TFunction<"reports", undefined>;
}

interface ColDef {
    readonly key: string;
    readonly headerKey: string;
    readonly value: (r: AuditScoreTotals) => number;
    readonly max: (r: AuditScoreTotals) => number;
}

const SCALE_COLDEFS: readonly ColDef[] = [
    {
        key: "provision",
        headerKey: "domain.barProvisionShort",
        value: (r) => r.provision_total,
        max: (r) => r.provision_total_max,
    },
    {
        key: "diversity",
        headerKey: "domain.barDiversityShort",
        value: (r) => r.diversity_total,
        max: (r) => r.diversity_total_max,
    },
    {
        key: "challenge",
        headerKey: "domain.barChallengeShort",
        value: (r) => r.challenge_total,
        max: (r) => r.challenge_total_max,
    },
    {
        key: "sociability",
        headerKey: "domain.barSociabilityShort",
        value: (r) => r.sociability_total,
        max: (r) => r.sociability_total_max,
    },
];

const CONSTRUCT_COLDEFS: readonly ColDef[] = [
    {
        key: "play_value",
        headerKey: "extendedTable.columnPlayValue",
        value: (r) => r.play_value_total,
        max: (r) => r.play_value_total_max,
    },
    {
        key: "usability",
        headerKey: "extendedTable.columnUsability",
        value: (r) => r.usability_total,
        max: (r) => r.usability_total_max,
    },
];

function cellVal(totals: AuditScoreTotals | null, fn: (r: AuditScoreTotals) => number): string {
    if (totals === null) return "—";
    return formatScoreValue(fn(totals));
}

function cellMx(totals: AuditScoreTotals | null, fn: (r: AuditScoreTotals) => number): string {
    if (totals === null) return "—";
    const v = fn(totals);
    return v <= 0 ? "—" : formatScoreValue(v);
}

/**
 * Minimal inline sub-table for phone, rendered inside the shared scroll view.
 * Column widths exactly match the bar cells above.
 */
function PhoneSubTable({
    group,
    scoreTotals,
    itemCount,
    tableWidth,
    labelColWidth,
    dataColWidth,
    ds,
    t,
}: PhoneSubTableProps) {
    const columns = group === "scale" ? SCALE_COLDEFS : CONSTRUCT_COLDEFS;

    const rows = [
        {
            labelKey: "domain.scoreAchievedLabel",
            getValue: (col: ColDef) => cellVal(scoreTotals, col.value),
            bg: ds.colors.input,
        },
        {
            labelKey: "domain.maxScoreLabel",
            getValue: (col: ColDef) => cellMx(scoreTotals, col.max),
            bg: ds.colors.mutedSurface,
        },
        {
            labelKey: "domain.itemsContributingLabel",
            getValue: () => itemCount.toString(),
            bg: ds.colors.input,
        },
    ];

    return (
        <YStack
            minW={tableWidth}
            borderWidth={1}
            borderColor={ds.colors.border}
            rounded={ds.radii.sm}
            overflow="hidden"
        >
            {/* Header */}
            <XStack bg={ds.colors.primary} borderBottomWidth={1} borderColor={ds.colors.border}>
                <YStack
                    width={labelColWidth}
                    p="$2"
                    borderRightWidth={1}
                    borderColor={ds.colors.border}
                    style={{ opacity: 0 }}
                />
                {columns.map((col, i) => (
                    <YStack
                        key={col.key}
                        minW={dataColWidth}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={i === 0 ? 0 : 1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            numberOfLines={1}
                            width="100%"
                            style={{ textAlign: "center" }}
                        >
                            {t(col.headerKey, { ns: "reports" })}
                        </Text>
                    </YStack>
                ))}
            </XStack>

            {/* Data rows */}
            {rows.map((row, rowIndex) => (
                <XStack
                    key={row.labelKey}
                    borderBottomWidth={rowIndex < rows.length - 1 ? 1 : 0}
                    borderColor={ds.colors.border}
                    style={{ backgroundColor: row.bg }}
                >
                    <YStack
                        width={labelColWidth}
                        p="$2"
                        justify="center"
                        borderRightWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            numberOfLines={3}
                            width="100%"
                        >
                            {t(row.labelKey, { ns: "reports" })}
                        </Text>
                    </YStack>
                    {columns.map((col, i) => (
                        <YStack
                            key={col.key}
                            minW={dataColWidth}
                            p="$2"
                            items="center"
                            justify="center"
                            borderLeftWidth={i !== 0 ? 1 : 0}
                            borderColor={ds.colors.border}
                        >
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.monoMedium}
                                fontSize={ds.typography.bodyXs.fontSize}
                                width="100%"
                                style={{ textAlign: "center" }}
                            >
                                {row.getValue(col)}
                            </Text>
                        </YStack>
                    ))}
                </XStack>
            ))}
        </YStack>
    );
}
