import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, ClipboardCheck, LayoutDashboard, MapPinned, Settings } from "@tamagui/lucide-icons-2";
import { Tabs } from "expo-router";
import { useAuditSync } from "lib/audit/use-audit-sync";
import { isGlassUiEnabled, useDesignSystem } from "lib/design-system";
import { getResponsiveTabBarLayout, useResponsiveLayout, type ResponsiveLayout } from "lib/responsive-layout";
import { useNotificationsStore } from "stores/notifications-store";
import { useTranslation } from "react-i18next";
import type { ColorTokens } from "tamagui";

interface TabIconProps {
    readonly focused: boolean;
    readonly size: number;
    readonly color: string;
}

export function getResponsiveTabIconSize(layout: Pick<ResponsiveLayout, "isTablet">, defaultSize: number): number {
    return layout.isTablet ? 22 : defaultSize;
}

/**
 * Main tab layout for the playspace mobile app.
 */
export default function TabLayout() {
    useAuditSync();
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const unreadCount = useNotificationsStore((state) => state.unreadCount);
    const { t } = useTranslation("common");
    const isGlassEnabled = isGlassUiEnabled();
    const insets = useSafeAreaInsets();
    const tabBarActiveTintColor = ds.colors.primary;
    const tabBarInactiveTintColor = layout.isTablet ? ds.colors.secondaryForeground : ds.colors.mutedForeground;
    const tabBarLayout = getResponsiveTabBarLayout(layout, insets.bottom);
    const tabBarLabelFontSize = layout.isTablet ? ds.typography.labelSm.fontSize : ds.typography.labelXs.fontSize;
    const tabBarLabelLineHeight = layout.isTablet ? ds.typography.labelSm.lineHeight : ds.typography.labelXs.lineHeight;

    /** Matches header bell cap so tab badge and in-app count stay consistent. */
    const homeTabBadgeOptions =
        unreadCount > 0 ? { tabBarBadge: unreadCount > 99 ? t("notificationsBellBadgeCapped") : unreadCount } : {};

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                sceneStyle: {
                    backgroundColor: ds.colors.background,
                },
                tabBarActiveTintColor,
                tabBarInactiveTintColor,
                tabBarStyle: {
                    borderTopColor: isGlassEnabled ? ds.glass.tabBarBorder : ds.colors.border,
                    borderTopWidth: 1,
                    height: tabBarLayout.height,
                    paddingTop: tabBarLayout.paddingTop - 10,
                    paddingBottom: tabBarLayout.paddingBottom,
                },
                tabBarItemStyle: {
                    borderRadius: layout.isTablet ? ds.radii.md : 0,
                    marginHorizontal: layout.isTablet ? 4 : 0,
                    marginVertical: layout.isTablet ? 6 : 0,
                    paddingTop: 0,
                },
                tabBarLabelStyle: {
                    fontSize: tabBarLabelFontSize,
                    lineHeight: tabBarLabelLineHeight,
                    fontFamily: ds.fonts.bodyBold,
                    letterSpacing: layout.isTablet ? 0.9 : 1,
                    textTransform: "uppercase",
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t("tabs.home"),
                    ...homeTabBadgeOptions,
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <LayoutDashboard color={color as ColorTokens} size={getResponsiveTabIconSize(layout, size)} />
                    ),
                }}
            />
            <Tabs.Screen
                name="places"
                options={{
                    title: t("tabs.places"),
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <MapPinned color={color as ColorTokens} size={getResponsiveTabIconSize(layout, size)} />
                    ),
                }}
            />
            <Tabs.Screen
                name="execute"
                options={{
                    title: t("tabs.execute"),
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <ClipboardCheck color={color as ColorTokens} size={getResponsiveTabIconSize(layout, size)} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: t("tabs.reports"),
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <BarChart3 color={color as ColorTokens} size={getResponsiveTabIconSize(layout, size)} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t("tabs.settings"),
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <Settings color={color as ColorTokens} size={getResponsiveTabIconSize(layout, size)} />
                    ),
                }}
            />
        </Tabs>
    );
}
