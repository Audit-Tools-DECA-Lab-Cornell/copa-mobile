import { Tabs } from "expo-router";
import {
    BarChart3,
    ClipboardCheck,
    LayoutDashboard,
    MapPinned,
    Settings,
} from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { useDesignSystem } from "lib/design-system";
import { useAuditSync } from "lib/audit/use-audit-sync";
import { useResponsiveLayout, type ResponsiveLayout } from "lib/responsive-layout";
import type { ColorTokens } from "tamagui";

interface TabIconProps {
    readonly focused: boolean;
    readonly size: number;
    readonly color: string;
}

export function getResponsiveTabIconSize(
    layout: Pick<ResponsiveLayout, "isTablet" | "isWideTablet">,
    defaultSize: number,
): number {
    return layout.isWideTablet ? 24 : layout.isTablet ? 22 : defaultSize;
}

/**
 * Main tab layout for the playspace mobile app.
 */
export default function TabLayout() {
    useAuditSync();
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("common");
    const tabBarActiveTintColor = layout.isTablet ? ds.colors.primaryForeground : ds.colors.primary;
    const tabBarInactiveTintColor = layout.isTablet
        ? ds.colors.secondaryForeground
        : ds.colors.mutedForeground;
    const tabBarHeight = layout.isWideTablet
        ? layout.buttonHeight + 36
        : layout.isTablet
          ? layout.buttonHeight + 30
          : 78;
    const tabBarPaddingTop = layout.isWideTablet ? 12 : layout.isTablet ? 10 : 8;
    const tabBarPaddingBottom = layout.isWideTablet ? 18 : layout.isTablet ? 14 : 12;
    const tabBarLabelFontSize = layout.isWideTablet
        ? ds.typography.labelMd.fontSize
        : layout.isTablet
          ? ds.typography.labelSm.fontSize
          : ds.typography.labelXs.fontSize;
    const tabBarLabelLineHeight = layout.isWideTablet
        ? ds.typography.labelMd.lineHeight
        : layout.isTablet
          ? ds.typography.labelSm.lineHeight
          : ds.typography.labelXs.lineHeight;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                sceneStyle: {
                    backgroundColor: ds.colors.background,
                },
                tabBarActiveTintColor,
                tabBarInactiveTintColor,
                tabBarActiveBackgroundColor: layout.isTablet ? ds.colors.primary : "transparent",
                tabBarStyle: {
                    backgroundColor: ds.colors.overlay,
                    borderTopColor: ds.colors.border,
                    height: tabBarHeight,
                    paddingTop: tabBarPaddingTop,
                    paddingBottom: tabBarPaddingBottom,
                },
                tabBarItemStyle: {
                    borderRadius: layout.isTablet ? ds.radii.md : 0,
                    marginHorizontal: layout.isTablet ? 4 : 0,
                    marginVertical: layout.isTablet ? 6 : 0,
                    paddingTop: layout.isWideTablet ? 2 : 0,
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
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <LayoutDashboard
                            color={color as ColorTokens}
                            size={getResponsiveTabIconSize(layout, size)}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="places"
                options={{
                    title: t("tabs.places"),
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <MapPinned
                            color={color as ColorTokens}
                            size={getResponsiveTabIconSize(layout, size)}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="execute"
                options={{
                    title: t("tabs.execute"),
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <ClipboardCheck
                            color={color as ColorTokens}
                            size={getResponsiveTabIconSize(layout, size)}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: t("tabs.reports"),
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <BarChart3
                            color={color as ColorTokens}
                            size={getResponsiveTabIconSize(layout, size)}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t("tabs.settings"),
                    tabBarIcon: ({ size, color }: TabIconProps) => (
                        <Settings
                            color={color as ColorTokens}
                            size={getResponsiveTabIconSize(layout, size)}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
