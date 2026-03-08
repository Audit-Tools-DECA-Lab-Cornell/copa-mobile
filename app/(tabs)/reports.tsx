import { useMemo } from "react";
import { ScrollView } from "react-native";
import { Download, FileBarChart, TriangleAlert } from "@tamagui/lucide-icons";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { REPORT_COMPARISON_ROWS, type ReportComparisonRow } from "lib/playspace-demo-data";

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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <YStack gap="$4">
                <Text fontSize={28} fontWeight="700">
                    Playspace Scoring
                </Text>
                <Paragraph color="$color10">
                    Audit and combined scoring snapshots for your assigned field audits.
                </Paragraph>
            </YStack>

            <XStack gap="$3">
                <YStack
                    flex={1}
                    borderWidth={1}
                    borderColor="$borderColor"
                    rounded={16}
                    p="$4"
                    bg="$background"
                    gap="$2"
                >
                    <Paragraph color="$color10">Average Audit Score</Paragraph>
                    <Text fontSize={28} fontWeight="700" color="$blue10">
                        {averageAuditScore}%
                    </Text>
                </YStack>
                <YStack
                    flex={1}
                    borderWidth={1}
                    borderColor="$borderColor"
                    rounded={16}
                    p="$4"
                    bg="$background"
                    gap="$2"
                >
                    <Paragraph color="$color10">Average Combined Score</Paragraph>
                    {averageCombinedScore === null ? (
                        <Paragraph color="$orange10" fontWeight="700">
                            Awaiting manager survey responses
                        </Paragraph>
                    ) : (
                        <Text fontSize={28} fontWeight="700" color="$green10">
                            {averageCombinedScore}%
                        </Text>
                    )}
                    <Paragraph color="$color10">{topCombinedPlaceLabel}</Paragraph>
                </YStack>
            </XStack>

            <YStack
                borderWidth={1}
                borderColor="$borderColor"
                rounded={16}
                p="$4"
                bg="$background"
                gap="$2"
            >
                <Paragraph color="$color10">Audit and combined score by place</Paragraph>
                {REPORT_COMPARISON_ROWS.map((row) => {
                    return (
                        <YStack key={row.id} gap="$1.5">
                            <XStack justify="space-between" items="center">
                                <YStack flex={1}>
                                    <Paragraph>{row.placeName}</Paragraph>
                                    <Paragraph color="$color10" fontSize={12}>
                                        {row.managerSurveyStatus === "submitted"
                                            ? "Combined score ready"
                                            : "Waiting for manager survey"}
                                    </Paragraph>
                                </YStack>
                                <YStack items="flex-end">
                                    <Paragraph color="$blue10" fontWeight="700">
                                        Audit {row.auditScore}%
                                    </Paragraph>
                                    {row.combinedScore === null ? (
                                        <Paragraph color="$orange10" fontWeight="700">
                                            Combined pending
                                        </Paragraph>
                                    ) : (
                                        <Paragraph color="$green10" fontWeight="700">
                                            Combined {row.combinedScore}%
                                        </Paragraph>
                                    )}
                                </YStack>
                            </XStack>
                            <YStack height={10} rounded={999} bg="$background">
                                <YStack
                                    height={10}
                                    rounded={999}
                                    bg="$blue9"
                                    width={`${row.auditScore}%`}
                                />
                            </YStack>
                        </YStack>
                    );
                })}
            </YStack>

            <YStack
                borderWidth={1}
                borderColor="$orange7"
                rounded={16}
                bg="$orange3"
                p="$4"
                gap="$2"
            >
                <XStack items="center" gap="$2">
                    <TriangleAlert size={16} color="$orange10" />
                    <Text color="$orange10" fontWeight="700">
                        Combined score updates after manager survey submission.
                    </Text>
                </XStack>
                <Paragraph color="$orange10">
                    Audit score is available immediately after field completion, while combined
                    scoring requires manager web input.
                </Paragraph>
            </YStack>

            <YStack
                borderWidth={1}
                borderColor="$borderColor"
                rounded={16}
                bg="$background"
                p="$4"
                gap="$3"
            >
                <XStack items="center" gap="$2">
                    <FileBarChart size={16} color="$purple10" />
                    <Text fontSize={19} fontWeight="700">
                        Export preview
                    </Text>
                </XStack>
                <Paragraph color="$color10">
                    Export package includes audit score, combined score (when available), section
                    table, and metadata.
                </Paragraph>
                <XStack gap="$2">
                    <Button flex={1} size="$3">
                        <XStack items="center" gap="$2">
                            <Download size={14} />
                            <Text>Export PDF</Text>
                        </XStack>
                    </Button>
                    <Button flex={1} size="$3" theme="purple">
                        <XStack items="center" gap="$2">
                            <Download size={14} />
                            <Text>Export CSV</Text>
                        </XStack>
                    </Button>
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
