import { TriangleAlert } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";

import { useConfirm } from "components/ui/confirm-dialog";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

export interface AuditSyncStatusCardProps {
    readonly hasPendingLocalChanges: boolean;
    readonly isSyncing: boolean;
    readonly lastSyncError: string | null;
    /**
     * Per-audit sync phase from `syncStateByAuditId[auditId]?.phase`.
     * When `"queued_submit"`, the card shows a "Submission queued" state
     * instead of the normal uploading/pending/error branches.
     */
    readonly phase: string | undefined;
    /**
     * Called when the auditor confirms they want to cancel the queued submission
     * and return the audit to an editable state. Required when `phase === "queued_submit"`.
     */
    readonly onReopenQueuedSubmit?: (() => void) | undefined;
}

/**
 * Compact sync-state card so auditors can tell whether their draft is queued,
 * uploading, or blocked on-device.
 *
 * Renders nothing when there is no noteworthy state to show.
 */
export function AuditSyncStatusCard({
    hasPendingLocalChanges,
    isSyncing,
    lastSyncError,
    phase,
    onReopenQueuedSubmit,
}: Readonly<AuditSyncStatusCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const requestConfirm = useConfirm();

    const isQueuedSubmit = phase === "queued_submit";
    const hasSyncFailure = lastSyncError !== null;
    const shouldShowCard = isQueuedSubmit || hasPendingLocalChanges || hasSyncFailure;

    if (!shouldShowCard) {
        return null;
    }

    // Queued submit takes precedence over all other states.
    if (isQueuedSubmit) {
        const tone = ds.colors.mutedForeground;
        const cardBg = ds.colors.surfaceMuted;

        const handleEditSubmission = () => {
            void (async () => {
                const confirmed = await requestConfirm({
                    title: t("overview.syncStatus.editSubmissionConfirmTitle"),
                    message: t("overview.syncStatus.editSubmissionConfirmMessage"),
                    confirmLabel: t("overview.syncStatus.editSubmissionConfirmConfirm"),
                    cancelLabel: t("overview.syncStatus.editSubmissionConfirmCancel"),
                });
                if (!confirmed) {
                    return;
                }
                onReopenQueuedSubmit?.();
            })();
        };

        return (
            <YStack
                testID="sync-status-card"
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={tone}
                bg={cardBg}
                p={layout.cardPadding}
                gap="$2.5"
                style={{ boxShadow: ds.shadows.card }}
            >
                <Text
                    color={tone}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {t("overview.syncStatus.queuedSubmitTitle")}
                </Text>
                <Paragraph
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                    lineHeight={ds.typography.bodyMd.lineHeight}
                >
                    {t("overview.syncStatus.queuedSubmitMessage")}
                </Paragraph>
                {onReopenQueuedSubmit !== undefined ? (
                    <Button
                        testID="edit-submission-button"
                        height={layout.isTablet ? 42 : 38}
                        rounded={ds.radii.sm}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surface}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={handleEditSubmission}
                        accessibilityLabel={t("overview.syncStatus.editSubmissionButton")}
                    >
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1}
                        >
                            {t("overview.syncStatus.editSubmissionButton")}
                        </Text>
                    </Button>
                ) : null}
            </YStack>
        );
    }

    const tone = isSyncing ? ds.colors.primary : hasSyncFailure ? ds.colors.danger : ds.colors.mutedForeground;
    const cardBackgroundColor = isSyncing
        ? ds.colors.primarySoft
        : hasSyncFailure
          ? ds.colors.dangerSoft
          : ds.colors.surfaceMuted;
    const title = isSyncing
        ? t("overview.syncStatus.syncingTitle")
        : hasSyncFailure
          ? t("overview.syncStatus.retryTitle")
          : t("overview.syncStatus.pendingTitle");
    const message = isSyncing
        ? t("overview.syncStatus.syncingMessage")
        : hasSyncFailure
          ? (lastSyncError ?? "")
          : t("overview.syncStatus.pendingMessage");

    return (
        <YStack
            testID="sync-status-card"
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={tone}
            bg={cardBackgroundColor}
            p={layout.cardPadding}
            gap="$2.5"
            style={{ boxShadow: ds.shadows.card }}
        >
            <XStack items="center" gap="$2">
                {hasSyncFailure ? <TriangleAlert size={18} color={tone} /> : null}
                <Text
                    color={tone}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {title}
                </Text>
            </XStack>
            <Paragraph
                color={ds.colors.secondaryForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                {message}
            </Paragraph>
        </YStack>
    );
}
