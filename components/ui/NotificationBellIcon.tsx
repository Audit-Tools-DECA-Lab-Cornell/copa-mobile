import { Bell } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Circle, Text } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useNotificationsStore } from "stores/notifications-store";

/**
 * Props for the notification bell control in the header or dashboard row.
 */
export interface NotificationBellIconProps {
    /**
     * Called when the bell is pressed. Defaults to opening the notifications panel (TASK-011).
     */
    readonly onPress?: () => void;
}

/**
 * Bell icon with badge for unread notification count; uses the notifications store
 * for unreadCount only and avoids re-renders when other store fields change.
 */
export function NotificationBellIcon({ onPress }: NotificationBellIconProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("common");
    const unreadCount = useNotificationsStore((state) => state.unreadCount);
    const openPanel = useNotificationsStore((state) => state.openNotificationsPanel);
    const handlePress = onPress ?? openPanel;

    const iconSize = layout.isTablet ? 22 : 20;
    const tapTarget = layout.isTablet ? 46 : 44;
    const badgeLabel = unreadCount > 99 ? t("notificationsBellBadgeCapped") : String(unreadCount);

    const accessibilityHint =
        unreadCount === 0
            ? t("notificationsBellEmptyHint", { defaultValue: "No unread notifications" })
            : t("notificationsBellUnreadHint", {
                  count: unreadCount,
                  defaultValue: `${String(unreadCount)} unread notifications`,
              });

    return (
        <Button
            unstyled
            onPress={handlePress}
            width={tapTarget}
            height={tapTarget}
            items="center"
            justify="center"
            rounded={ds.radii.full}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surfaceMuted}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            position="relative"
            accessibilityLabel={t("notificationsBell", { defaultValue: "Notifications" })}
            accessibilityHint={accessibilityHint}
            accessibilityRole="button"
            style={{ minWidth: tapTarget, minHeight: tapTarget }}
        >
            <Bell size={iconSize} color={ds.colors.foreground} />
            {unreadCount > 0 ? (
                <Circle
                    size={20}
                    bg={ds.colors.danger}
                    position="absolute"
                    items="center"
                    justify="center"
                    borderWidth={2}
                    borderColor={ds.colors.background}
                    style={{ top: -4, right: -4 }}
                >
                    <Text fontSize={10} fontWeight="700" color={ds.colors.primaryForeground}>
                        {badgeLabel}
                    </Text>
                </Circle>
            ) : null}
        </Button>
    );
}
