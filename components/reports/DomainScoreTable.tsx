import { memo } from "react";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { AuditScoreTotals } from "lib/audit/types";
import { formatScoreValue } from "lib/audit/score-helpers";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useReportScoreTableLayout } from "lib/report-table-layout";

export interface DomainScoreTableProps {
    readonly scoreTotals: AuditScoreTotals | null;
    readonly itemCount: number;
}

// ── Legacy constants (kept for any external consumers) ──
export const REPORT_SCORE_LABEL_COL_WIDTH = 120;
export const REPORT_SCORE_LEFT_DATA_COL_WIDTH = 72;
export const REPORT_SCORE_RIGHT_DATA_COL_WIDTH_TABLET = 132;
export const REPORT_SCORE_LEFT_TABLE_WIDTH = REPORT_SCORE_LABEL_COL_WIDTH + REPORT_SCORE_LEFT_DATA_COL_WIDTH * 4;
export const REPORT_SCORE_RIGHT_TABLE_WIDTH =
    REPORT_SCORE_LABEL_COL_WIDTH + REPORT_SCORE_RIGHT_DATA_COL_WIDTH_TABLET * 2;

function cellValue(totals: AuditScoreTotals | null, value: (row: AuditScoreTotals) => number): string {
    if (totals === null) return "-";
    return formatScoreValue(value(totals));
}

function cellMax(totals: AuditScoreTotals | null, max: (row: AuditScoreTotals) => number): string {
    if (totals === null) return "-";
    const raw = max(totals);
    if (raw <= 0) return "-";
    return formatScoreValue(raw);
}

interface ColumnDef {
    readonly key: string;
    readonly value: (row: AuditScoreTotals) => number;
    readonly max: (row: AuditScoreTotals) => number;
    readonly headerKey: string;
}

const LEFT_COLUMNS: readonly ColumnDef[] = [
    {
        key: "provision",
        value: (r) => r.provision_total,
        max: (r) => r.provision_total_max,
        headerKey: "extendedTable.columnProvision",
    },
    {
        key: "diversity",
        value: (r) => r.diversity_total,
        max: (r) => r.diversity_total_max,
        headerKey: "extendedTable.columnDiversity",
    },
    {
        key: "challenge",
        value: (r) => r.challenge_total,
        max: (r) => r.challenge_total_max,
        headerKey: "extendedTable.columnChallenge",
    },
    {
        key: "sociability",
        value: (r) => r.sociability_total,
        max: (r) => r.sociability_total_max,
        headerKey: "extendedTable.columnSociability",
    },
];

const RIGHT_COLUMNS: readonly ColumnDef[] = [
    {
        key: "play_value",
        value: (r) => r.play_value_total,
        max: (r) => r.play_value_total_max,
        headerKey: "extendedTable.columnPlayValue",
    },
    {
        key: "usability",
        value: (r) => r.usability_total,
        max: (r) => r.usability_total_max,
        headerKey: "extendedTable.columnUsability",
    },
];

const ALL_COLUMNS: readonly ColumnDef[] = [...LEFT_COLUMNS, ...RIGHT_COLUMNS];

function isConstructColumn(col: ColumnDef): boolean {
    return col.key === "play_value" || col.key === "usability";
}

interface DataCellProps {
    readonly children: string;
    readonly borderLeft: boolean;
    readonly width: number;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly isAlt?: boolean;
}

function DataCell({ children, borderLeft, width, ds, isAlt }: DataCellProps) {
    return (
        <YStack
            width={width}
            p="$2"
            items="center"
            justify="center"
            borderLeftWidth={borderLeft ? 1 : 0}
            borderColor={ds.colors.border}
            style={{ backgroundColor: isAlt ? ds.colors.mutedSurface : undefined }}
        >
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.monoMedium}
                fontSize={ds.typography.bodyXs.fontSize}
                width="100%"
                style={{ textAlign: "center" }}
            >
                {children}
            </Text>
        </YStack>
    );
}

interface SubTableProps {
    readonly columns: readonly ColumnDef[];
    readonly scoreTotals: AuditScoreTotals | null;
    readonly itemCount: number;
    readonly labels: readonly { readonly text: string }[];
    readonly getColumnWidth: (col: ColumnDef) => number;
    readonly tableWidth: number;
    readonly labelColWidth: number;
}

function ScoreSubTable({
    columns,
    scoreTotals,
    itemCount,
    labels,
    getColumnWidth,
    tableWidth,
    labelColWidth,
}: SubTableProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");

    const LabelCell = ({ text }: { text: string }) => (
        <YStack
            width={labelColWidth}
            p="$2"
            justify="center"
            items="flex-start"
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
                {text}
            </Text>
        </YStack>
    );

    return (
        <YStack
            borderWidth={1}
            borderColor={ds.colors.border}
            rounded={ds.radii.sm}
            overflow="hidden"
            width={tableWidth}
        >
            {/* Header row */}
            <XStack bg={ds.colors.primary} borderBottomWidth={1} borderColor={ds.colors.border}>
                <YStack
                    width={labelColWidth}
                    p="$2"
                    justify="center"
                    items="center"
                    borderRightWidth={1}
                    borderColor={ds.colors.primaryForeground}
                />
                {columns.map((col, i) => {
                    const w = getColumnWidth(col);
                    return (
                        <YStack
                            key={col.key}
                            width={w}
                            p="$2"
                            items="center"
                            justify="center"
                            borderLeftWidth={i === 0 ? 0 : 1}
                            borderColor={ds.colors.primaryForeground}
                        >
                            <Text
                                color={ds.colors.primaryForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodyXs.fontSize}
                                numberOfLines={2}
                                width="100%"
                                style={{ textAlign: "center" }}
                            >
                                {t(col.headerKey, { ns: "reports" })}
                            </Text>
                        </YStack>
                    );
                })}
            </XStack>

            {/* Score achieved row */}
            <XStack bg={ds.colors.input} borderColor={ds.colors.border}>
                <LabelCell text={labels[0]?.text ?? ""} />
                {columns.map((col, i) => {
                    const w = getColumnWidth(col);
                    return (
                        <DataCell key={`${col.key}-achieved`} borderLeft={i !== 0} ds={ds} width={w}>
                            {cellValue(scoreTotals, col.value)}
                        </DataCell>
                    );
                })}
            </XStack>

            <XStack bg={ds.colors.mutedSurface} borderColor={ds.colors.border}>
                <LabelCell text={labels[1]?.text ?? ""} />
                {columns.map((col, i) => {
                    const w = getColumnWidth(col);
                    return (
                        <DataCell key={`${col.key}-max`} borderLeft={i !== 0} ds={ds} width={w} isAlt>
                            {cellMax(scoreTotals, col.max)}
                        </DataCell>
                    );
                })}
            </XStack>
            <XStack bg={ds.colors.input}>
                <LabelCell text={labels[2]?.text ?? ""} />
                {columns.map((col, i) => (
                    <DataCell key={`${col.key}-items`} borderLeft={i !== 0} ds={ds} width={getColumnWidth(col)}>
                        {itemCount.toString()}
                    </DataCell>
                ))}
            </XStack>
        </YStack>
    );
}

/**
 * Score achieved / max tables / item count: four scale columns + two construct columns.
 * On tablet, one joined table; on phone, two stacked tables. Aligns with web `ScoreSubTable`.
 */
export const DomainScoreTable = memo(function DomainScoreTable({ scoreTotals, itemCount }: DomainScoreTableProps) {
    const layout = useResponsiveLayout();
    const tableLayout = useReportScoreTableLayout();
    const { t } = useTranslation("reports");

    const labels = [
        { text: t("domain.scoreAchievedLabel", { ns: "reports" }) },
        { text: t("domain.maxScoreLabel", { ns: "reports" }) },
        { text: t("domain.itemsContributingLabel", { ns: "reports" }) },
    ];

    const getWidthForColumn = (col: ColumnDef): number => {
        return isConstructColumn(col) ? tableLayout.rightDataColWidth : tableLayout.leftDataColWidth;
    };

    if (layout.isTablet) {
        return (
            <YStack gap="$2" minW="100%">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <ScoreSubTable
                        columns={ALL_COLUMNS}
                        scoreTotals={scoreTotals}
                        itemCount={itemCount}
                        labels={labels}
                        getColumnWidth={(col) => {
                            return getWidthForColumn(col);
                        }}
                        tableWidth={tableLayout.joinedTableWidth}
                        labelColWidth={tableLayout.labelColWidth}
                    />
                </ScrollView>
            </YStack>
        );
    }

    const commonLeftProps = {
        columns: LEFT_COLUMNS,
        scoreTotals,
        itemCount,
        labels,
        getColumnWidth: (col: ColumnDef) => {
            return getWidthForColumn(col);
        },
        tableWidth: tableLayout.leftTableWidth,
        labelColWidth: tableLayout.labelColWidth,
    } as const;

    const commonRightProps = {
        columns: RIGHT_COLUMNS,
        scoreTotals,
        itemCount,
        labels,
        getColumnWidth: (col: ColumnDef) => {
            return getWidthForColumn(col);
        },
        tableWidth: tableLayout.rightTableWidth,
        labelColWidth: tableLayout.labelColWidth,
    } as const;

    return (
        <YStack gap="$2" width="100%">
            <ScrollView horizontal showsHorizontalScrollIndicator>
                <ScoreSubTable {...commonLeftProps} />
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator>
                <ScoreSubTable {...commonRightProps} />
            </ScrollView>
        </YStack>
    );
});
