import { UploadCloud } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";

import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Persistent reminder that one or more audits have a submission the server has
 * not yet confirmed (queued, in-flight, or held in the durable outbox). It keeps
 * pending uploads visible so an auditor reopens the app on wifi to finish, and
 * reassures them their responses are saved on-device. Renders nothing when the
 * pending count is zero.
 */
export function PendingUploadsBanner() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const pendingUploadCount = usePlayspaceAuditStore((state) => state.pendingUploadCount);

    if (pendingUploadCount <= 0) {
        return null;
    }

    const title =
        pendingUploadCount === 1
            ? t("pendingUploads.titleOne")
            : t("pendingUploads.titleOther", { count: pendingUploadCount });

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.primary}
            bg={ds.colors.primarySoft}
            p={layout.cardPadding}
            gap="$2"
            style={{ boxShadow: ds.shadows.card }}
            accessibilityRole="summary"
            accessibilityLabel={`${title}. ${t("pendingUploads.message")}`}
        >
            <XStack items="center" gap="$2">
                <UploadCloud size={18} color={ds.colors.primary} />
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {title}
                </Text>
            </XStack>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyRegular}
                fontSize={ds.typography.bodySm.fontSize}
            >
                {t("pendingUploads.message")}
            </Text>
        </YStack>
    );
}
