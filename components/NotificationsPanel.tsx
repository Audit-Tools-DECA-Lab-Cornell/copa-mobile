import { Bell, CheckCheck } from "@tamagui/lucide-icons-2";
import type { TFunction } from "i18next";
import { useCallback, useEffect } from "react";
import { Pressable, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, ScrollView, Separator, Sheet, Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { DesignSystemTheme } from "lib/design-system";
import { useDesignSystem } from "lib/design-system";
import { formatRelativeTimeLabel } from "lib/i18n/format";
import { useResponsiveLayout } from "lib/responsive-layout";
import type { Notification } from "lib/notifications/api";
import { useNotificationsStore } from "stores/notifications-store";

const centeredParagraphStyle: TextStyle = {
    textAlign: "center",
    maxWidth: 320,
};

/**
 * Bottom sheet listing in-app notifications with mark-as-read actions.
 */
export function NotificationsPanel() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const insets = useSafeAreaInsets();
    const { t, i18n } = useTranslation(["common", "dashboard"]);

    const panelOpen = useNotificationsStore((state) => state.panelOpen);
    const closeNotificationsPanel = useNotificationsStore((state) => state.closeNotificationsPanel);
    const notifications = useNotificationsStore((state) => state.notifications);
    const unreadCount = useNotificationsStore((state) => state.unreadCount);
    const isLoading = useNotificationsStore((state) => state.isLoading);
    const error = useNotificationsStore((state) => state.error);
    const clearError = useNotificationsStore((state) => state.clearError);
    const fetchNotifications = useNotificationsStore((state) => state.fetchNotifications);
    const markAsRead = useNotificationsStore((state) => state.markAsRead);
    const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);

    useEffect(() => {
        if (panelOpen) {
            void fetchNotifications();
        }
    }, [panelOpen, fetchNotifications]);

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (!nextOpen) {
                closeNotificationsPanel();
            }
        },
        [closeNotificationsPanel],
    );

    const handleMarkAllAsRead = useCallback(() => {
        void markAllAsRead();
    }, [markAllAsRead]);

    const title = t("notifications.title", { ns: "dashboard", defaultValue: "Notifications" });
    const markAllLabel = t("notifications.markAllRead", { ns: "dashboard", defaultValue: "Mark all read" });
    const dismissLabel = t("notifications.dismissError", { defaultValue: "Dismiss", ns: "dashboard" });

    const showLoading = isLoading && notifications.length === 0;
    const showEmpty = !isLoading && notifications.length === 0;
    const showList = notifications.length > 0;

    return (
        <Sheet
            modal
            open={panelOpen}
            onOpenChange={handleOpenChange}
            snapPoints={[88]}
            snapPointsMode="percent"
            dismissOnSnapToBottom
            zIndex={100_000}
        >
            <Sheet.Overlay opacity={0.5} />
            <Sheet.Frame
                p="$4"
                pb={insets.bottom + 16}
                bg={ds.colors.background}
                borderTopLeftRadius={layout.isTablet ? ds.radii.xl : ds.radii.lg}
                borderTopRightRadius={layout.isTablet ? ds.radii.xl : ds.radii.lg}
            >
                <Sheet.Handle bg={ds.colors.border} />
                <XStack justify="space-between" items="center" mb="$3" mt="$2">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={ds.typography.titleLg.fontSize}
                    >
                        {title}
                    </Text>
                    {unreadCount > 0 ? (
                        <Button size="$3" chromeless onPress={handleMarkAllAsRead} accessibilityLabel={markAllLabel}>
                            <XStack gap="$1.5" items="center">
                                <CheckCheck size={18} color={ds.colors.primary} />
                                <Text
                                    color={ds.colors.primary}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelSm.fontSize}
                                >
                                    {markAllLabel}
                                </Text>
                            </XStack>
                        </Button>
                    ) : null}
                </XStack>

                <Separator borderColor={ds.colors.border} mb="$3" />

                {error !== null ? (
                    <YStack gap="$2" mb="$3">
                        <Paragraph
                            color={ds.colors.danger}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                        >
                            {error}
                        </Paragraph>
                        <Button size="$2" onPress={clearError} accessibilityLabel={dismissLabel}>
                            <Text color={ds.colors.primary} fontFamily={ds.fonts.bodyBold}>
                                {dismissLabel}
                            </Text>
                        </Button>
                    </YStack>
                ) : null}

                {showLoading ? (
                    <YStack flex={1} items="center" justify="center" gap="$3" py="$8">
                        <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                            {t("notifications.loading", {
                                ns: "dashboard",
                                defaultValue: "Loading notifications…",
                            })}
                        </Paragraph>
                    </YStack>
                ) : null}

                {showEmpty ? (
                    <YStack flex={1} items="center" justify="center" gap="$3" py="$8">
                        <Bell size={48} color={ds.colors.mutedForeground} />
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.titleMd.fontSize}
                        >
                            {t("notifications.emptyTitle", {
                                ns: "dashboard",
                                defaultValue: "No notifications",
                            })}
                        </Text>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                            style={centeredParagraphStyle}
                        >
                            {t("notifications.emptyBody", {
                                ns: "dashboard",
                                defaultValue: "You are all caught up. New alerts will show up here.",
                            })}
                        </Paragraph>
                    </YStack>
                ) : null}

                {showList ? (
                    <ScrollView flex={1} showsVerticalScrollIndicator={false}>
                        <YStack gap="$2" pb="$2">
                            {notifications.map((notification) => (
                                <NotificationRow
                                    key={notification.id}
                                    ds={ds}
                                    language={i18n.language}
                                    markAsRead={markAsRead}
                                    notification={notification}
                                    t={t}
                                />
                            ))}
                        </YStack>
                    </ScrollView>
                ) : null}
            </Sheet.Frame>
        </Sheet>
    );
}

interface NotificationRowProps {
    readonly notification: Notification;
    readonly ds: DesignSystemTheme;
    readonly language: string;
    readonly t: TFunction;
    readonly markAsRead: (notificationId: string) => Promise<void>;
}

function NotificationRow({ notification, ds, language, t, markAsRead }: NotificationRowProps) {
    const timeLabel = formatRelativeTimeLabel(null, notification.created_at, language, t);

    const handlePress = useCallback(() => {
        if (!notification.is_read) {
            void markAsRead(notification.id);
        }
    }, [markAsRead, notification.id, notification.is_read]);

    return (
        <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={
                notification.is_read
                    ? `${notification.message}, ${timeLabel}, read`
                    : `${notification.message}, ${timeLabel}, unread`
            }
        >
            <XStack
                p="$3"
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={notification.is_read ? ds.colors.border : ds.colors.primary}
                bg={notification.is_read ? ds.colors.surface : ds.colors.infoSoft}
                gap="$3"
                items="center"
            >
                <YStack flex={1} gap="$1.5">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={notification.is_read ? ds.fonts.bodyMedium : ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyMd.fontSize}
                    >
                        {notification.message}
                    </Text>
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.labelSm.fontSize}
                    >
                        {timeLabel}
                    </Text>
                </YStack>
            </XStack>
        </Pressable>
    );
}
