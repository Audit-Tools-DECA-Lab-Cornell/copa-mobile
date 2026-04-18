import { memo } from "react";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { AuditScoreTotals } from "lib/audit/types";
import { formatScoreValue } from "lib/audit/score-helpers";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

export interface DomainScoreTableProps {
    readonly scoreTotals: AuditScoreTotals | null;
    readonly itemCount: number;
}

export const REPORT_SCORE_LABEL_COL_WIDTH = 145;
export const REPORT_SCORE_LEFT_DATA_COL_WIDTH = 76;
export const REPORT_SCORE_RIGHT_DATA_COL_WIDTH_TABLET = 152;

function cellValue(totals: AuditScoreTotals | null, value: (row: AuditScoreTotals) => number): string {
    if (totals === null) {
        return "—";
    }
    return formatScoreValue(value(totals));
}

function cellMax(totals: AuditScoreTotals | null, max: (row: AuditScoreTotals) => number): string {
    if (totals === null) {
        return "—";
    }
    const raw = max(totals);
    if (raw <= 0) {
        return "—";
    }
    return formatScoreValue(raw);
}

interface ColumnDef {
    readonly key: string;
    readonly value: (row: AuditScoreTotals) => number;
    readonly max: (row: AuditScoreTotals) => number;
    readonly headerKey: string;
    readonly shortHeaderKey?: string;
}

const LEFT_COLUMNS: readonly ColumnDef[] = [
    {
        key: "provision",
        value: (row) => row.provision_total,
        max: (row) => row.provision_total_max,
        headerKey: "extendedTable.columnProvision",
        shortHeaderKey: "domain.barProvisionShort",
    },
    {
        key: "diversity",
        value: (row) => row.diversity_total,
        max: (row) => row.diversity_total_max,
        headerKey: "extendedTable.columnDiversity",
        shortHeaderKey: "domain.barDiversityShort",
    },
    {
        key: "challenge",
        value: (row) => row.challenge_total,
        max: (row) => row.challenge_total_max,
        headerKey: "extendedTable.columnChallenge",
        shortHeaderKey: "domain.barChallengeShort",
    },
    {
        key: "sociability",
        value: (row) => row.sociability_total,
        max: (row) => row.sociability_total_max,
        headerKey: "extendedTable.columnSociability",
        shortHeaderKey: "domain.barSociabilityShort",
    },
];

const RIGHT_COLUMNS: readonly ColumnDef[] = [
    {
        key: "play_value",
        value: (row) => row.play_value_total,
        max: (row) => row.play_value_total_max,
        headerKey: "extendedTable.columnPlayValue",
    },
    {
        key: "usability",
        value: (row) => row.usability_total,
        max: (row) => row.usability_total_max,
        headerKey: "extendedTable.columnUsability",
    },
];

export const REPORT_SCORE_LEFT_TABLE_WIDTH =
    REPORT_SCORE_LABEL_COL_WIDTH + REPORT_SCORE_LEFT_DATA_COL_WIDTH * LEFT_COLUMNS.length;
export const REPORT_SCORE_RIGHT_TABLE_WIDTH =
    REPORT_SCORE_LABEL_COL_WIDTH + REPORT_SCORE_RIGHT_DATA_COL_WIDTH_TABLET * RIGHT_COLUMNS.length;

interface SubTableProps {
    readonly columns: readonly ColumnDef[];
    readonly scoreTotals: AuditScoreTotals | null;
    readonly itemCount: number;
    readonly labels: readonly { readonly text: string }[];
    readonly dataColumnWidth: number;
    readonly tableWidth: number;
}

function DataCell(
    props: Readonly<{ children: string; borderLeft: boolean; ds: ReturnType<typeof useDesignSystem>; width: number }>,
) {
    const { children, borderLeft, ds, width } = props;
    return (
        <YStack
            width={width}
            p="$2"
            items="center"
            justify="center"
            borderLeftWidth={borderLeft ? 1 : 0}
            borderColor={ds.colors.border}
        >
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyXs.fontSize}
                width="100%"
                style={{ textAlign: "center" }}
            >
                {children}
            </Text>
        </YStack>
    );
}

function ScoreSubTable({ columns, scoreTotals, itemCount, labels, dataColumnWidth, tableWidth }: SubTableProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("reports");
    const itemsLabel = itemCount.toString();

    return (
        <YStack
            borderWidth={1}
            borderColor={ds.colors.border}
            rounded={ds.radii.sm}
            overflow="hidden"
            width={tableWidth}
        >
            <XStack bg={ds.colors.primary} borderBottomWidth={1} borderColor={ds.colors.border}>
                <YStack
                    width={REPORT_SCORE_LABEL_COL_WIDTH}
                    p="$2"
                    justify="center"
                    items="center"
                    borderRightWidth={1}
                    borderColor={ds.colors.border}
                />
                {columns.map((column, colIndex) => (
                    <YStack
                        key={column.key}
                        width={dataColumnWidth}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={colIndex === 0 ? 0 : 1}
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
                            {layout.isTablet && column.shortHeaderKey !== undefined
                                ? t(column.shortHeaderKey, { ns: "reports" })
                                : t(column.headerKey, { ns: "reports" })}
                        </Text>
                    </YStack>
                ))}
            </XStack>
            <XStack bg={ds.colors.input} borderBottomWidth={1} borderColor={ds.colors.border}>
                <YStack
                    width={REPORT_SCORE_LABEL_COL_WIDTH}
                    p="$2"
                    justify="center"
                    items="center"
                    borderRightWidth={1}
                    borderColor={ds.colors.border}
                >
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                        numberOfLines={3}
                        width="100%"
                        style={{ textAlign: "center" }}
                    >
                        {labels[0]?.text ?? ""}
                    </Text>
                </YStack>
                {columns.map((column, colIndex) => (
                    <DataCell
                        key={`${column.key}-achieved`}
                        borderLeft={colIndex !== 0}
                        ds={ds}
                        width={dataColumnWidth}
                    >
                        {cellValue(scoreTotals, column.value)}
                    </DataCell>
                ))}
            </XStack>
            <XStack bg={ds.colors.input} borderBottomWidth={1} borderColor={ds.colors.border}>
                <YStack
                    width={REPORT_SCORE_LABEL_COL_WIDTH}
                    p="$2"
                    justify="center"
                    items="center"
                    borderRightWidth={1}
                    borderColor={ds.colors.border}
                >
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                        numberOfLines={3}
                        width="100%"
                        style={{ textAlign: "center" }}
                    >
                        {labels[1]?.text ?? ""}
                    </Text>
                </YStack>
                {columns.map((column, colIndex) => (
                    <DataCell key={`${column.key}-max`} borderLeft={colIndex !== 0} ds={ds} width={dataColumnWidth}>
                        {cellMax(scoreTotals, column.max)}
                    </DataCell>
                ))}
            </XStack>
            <XStack bg={ds.colors.input}>
                <YStack
                    width={REPORT_SCORE_LABEL_COL_WIDTH}
                    p="$2"
                    justify="center"
                    items="center"
                    borderRightWidth={1}
                    borderColor={ds.colors.border}
                >
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                        numberOfLines={3}
                        width="100%"
                        style={{ textAlign: "center" }}
                    >
                        {labels[2]?.text ?? ""}
                    </Text>
                </YStack>
                {columns.map((column, colIndex) => (
                    <DataCell key={`${column.key}-items`} borderLeft={colIndex !== 0} ds={ds} width={dataColumnWidth}>
                        {itemsLabel}
                    </DataCell>
                ))}
            </XStack>
        </YStack>
    );
}

/**
 * Score achieved / max / item count tables split across four + two columns.
 */
export const DomainScoreTable = memo(function DomainScoreTable({ scoreTotals, itemCount }: DomainScoreTableProps) {
    const layout = useResponsiveLayout();
    const { t } = useTranslation("reports");

    const labels = [
        { text: t("domain.scoreAchievedLabel", { ns: "reports" }) },
        { text: t("domain.maxScoreLabel", { ns: "reports" }) },
        { text: t("domain.itemsContributingLabel", { ns: "reports" }) },
    ];

    return (
        <YStack gap="$2" width="100%">
            {layout.isTablet ? (
                <ScrollView horizontal showsHorizontalScrollIndicator>
                    <XStack
                        gap="$2"
                        items="stretch"
                        style={{ minWidth: REPORT_SCORE_LEFT_TABLE_WIDTH + REPORT_SCORE_RIGHT_TABLE_WIDTH + 8 }}
                    >
                        <YStack width={REPORT_SCORE_LEFT_TABLE_WIDTH}>
                            <ScoreSubTable
                                columns={LEFT_COLUMNS}
                                scoreTotals={scoreTotals}
                                itemCount={itemCount}
                                labels={labels}
                                dataColumnWidth={REPORT_SCORE_LEFT_DATA_COL_WIDTH}
                                tableWidth={REPORT_SCORE_LEFT_TABLE_WIDTH}
                            />
                        </YStack>
                        <YStack width={REPORT_SCORE_RIGHT_TABLE_WIDTH}>
                            <ScoreSubTable
                                columns={RIGHT_COLUMNS}
                                scoreTotals={scoreTotals}
                                itemCount={itemCount}
                                labels={labels}
                                dataColumnWidth={REPORT_SCORE_RIGHT_DATA_COL_WIDTH_TABLET}
                                tableWidth={REPORT_SCORE_RIGHT_TABLE_WIDTH}
                            />
                        </YStack>
                    </XStack>
                </ScrollView>
            ) : (
                <YStack gap="$2" width="100%">
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                        <ScoreSubTable
                            columns={LEFT_COLUMNS}
                            scoreTotals={scoreTotals}
                            itemCount={itemCount}
                            labels={labels}
                            dataColumnWidth={REPORT_SCORE_LEFT_DATA_COL_WIDTH}
                            tableWidth={
                                REPORT_SCORE_LABEL_COL_WIDTH + REPORT_SCORE_LEFT_DATA_COL_WIDTH * LEFT_COLUMNS.length
                            }
                        />
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                        <ScoreSubTable
                            columns={RIGHT_COLUMNS}
                            scoreTotals={scoreTotals}
                            itemCount={itemCount}
                            labels={labels}
                            dataColumnWidth={REPORT_SCORE_LEFT_DATA_COL_WIDTH}
                            tableWidth={
                                REPORT_SCORE_LABEL_COL_WIDTH + REPORT_SCORE_LEFT_DATA_COL_WIDTH * RIGHT_COLUMNS.length
                            }
                        />
                    </ScrollView>
                </YStack>
            )}
        </YStack>
    );
});
