import { Save } from "@tamagui/lucide-icons-2";
import { useToastController } from "@tamagui/toast";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import type { AuditorPlace } from "lib/audit/places-api";
import { fetchMyAuditorProfile } from "lib/audit/profile-api";
import type { AuditSession } from "lib/audit/types";
import { isGlassUiEnabled, useDesignSystem } from "lib/design-system";
import {
    buildInProgressExportableAudit,
    shareInProgressAuditExport,
    type InProgressAuditExportFormat,
} from "lib/exports/audits";
import type { ExportAuditorProfile } from "lib/exports/reports/types";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useAuthStore } from "stores/auth-store";

import { ActionButton } from "components/ui/action-button";

interface AuditExportCardProps {
    readonly auditSession: AuditSession;
    readonly place: AuditorPlace | null;
}

/**
 * Compact card that lets the auditor save their current responses as a file
 * (CSV / Excel / PDF) so they can share or back them up while the audit is
 * still in progress.
 *
 * Built for the case where the regular submit step fails or is delayed: the
 * auditor can hand the file to their manager via the share sheet instead of
 * losing their work.
 */
export function AuditExportCard({ auditSession, place }: Readonly<AuditExportCardProps>) {
    const ds = useDesignSystem();
    const isGlassEnabled = isGlassUiEnabled();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["audit", "common"]);
    const toast = useToastController();
    const instrument = useLocalizedInstrument();
    const session = useAuthStore((state) => state.session);
    const [activeFormat, setActiveFormat] = useState<InProgressAuditExportFormat | null>(null);

    const handleExport = useCallback(
        async (format: InProgressAuditExportFormat) => {
            if (instrument === null) {
                return;
            }
            setActiveFormat(format);
            try {
                let auditorProfile: ExportAuditorProfile | null = null;
                if (session !== null) {
                    try {
                        const profile = await fetchMyAuditorProfile(session);
                        auditorProfile = {
                            auditorCode: profile.auditor_code,
                            ageRange: profile.age_range,
                            gender: profile.gender,
                            country: profile.country,
                            role: profile.role,
                        };
                    } catch {
                        auditorProfile = null;
                    }
                }

                const exportableAudit = buildInProgressExportableAudit({
                    auditSession,
                    place,
                    auditorProfile,
                });
                const fileName = await shareInProgressAuditExport(exportableAudit, instrument, format);
                toast.show(t("export.readyTitle"), {
                    message: t("export.readyMessage", { fileName }),
                    duration: 4000,
                    variant: "success",
                });
            } catch (error) {
                const message =
                    error instanceof Error && error.message.trim().length > 0
                        ? error.message
                        : t("export.failedMessage");
                toast.show(t("export.failedTitle"), {
                    message,
                    duration: 5000,
                    variant: "error",
                });
            } finally {
                setActiveFormat((current) => (current === format ? null : current));
            }
        },
        [auditSession, instrument, place, session, t, toast],
    );

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{ boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card }}
        >
            <XStack items="center" gap="$2">
                <Save size={16} color={ds.colors.primary} />
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {t("export.eyebrow")}
                </Text>
            </XStack>
            <YStack gap="$1.5">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    {t("export.title")}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    lineHeight={ds.typography.bodySm.lineHeight}
                >
                    {t("export.description")}
                </Paragraph>
            </YStack>
            <XStack gap="$2" flexWrap="wrap">
                <ActionButton
                    label={t("export.csv")}
                    onPress={() => {
                        handleExport("csv").catch(() => undefined);
                    }}
                    disabled={instrument === null || activeFormat !== null}
                    isLoading={activeFormat === "csv"}
                />
                <ActionButton
                    label={t("export.excel")}
                    onPress={() => {
                        handleExport("xlsx").catch(() => undefined);
                    }}
                    disabled={instrument === null || activeFormat !== null}
                    isLoading={activeFormat === "xlsx"}
                />
                <ActionButton
                    label={t("export.pdf")}
                    onPress={() => {
                        handleExport("pdf").catch(() => undefined);
                    }}
                    disabled={instrument === null || activeFormat !== null}
                    isLoading={activeFormat === "pdf"}
                />
            </XStack>
        </YStack>
    );
}
