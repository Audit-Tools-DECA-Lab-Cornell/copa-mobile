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
import { useResponsiveLayout } from "lib/responsive-layout";

interface TabIconProps {
    readonly focused: boolean;
    readonly size: number;
}

/**
 * Main tab layout for the playspace mobile app.
 */
export default function TabLayout() {
    useAuditSync();
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("common");

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                sceneStyle: {
                    backgroundColor: ds.colors.background,
                },
                tabBarActiveTintColor: ds.colors.primary,
                tabBarInactiveTintColor: ds.colors.mutedForeground,
                tabBarStyle: {
                    backgroundColor: ds.colors.overlay,
                    borderTopColor: ds.colors.border,
                    height: layout.isTablet ? 86 : 78,
                    paddingTop: layout.isTablet ? 10 : 8,
                    paddingBottom: layout.isTablet ? 14 : 12,
                },
                tabBarLabelStyle: {
                    fontSize: layout.isTablet
                        ? ds.typography.labelSm.fontSize
                        : ds.typography.labelXs.fontSize,
                    fontFamily: ds.fonts.bodyBold,
                    color: ds.colors.primary,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t("tabs.home"),
                    tabBarIcon: ({ focused, size }: TabIconProps) => (
                        <LayoutDashboard
                            color={focused ? ds.colors.primary : ds.colors.mutedForeground}
                            size={size}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="places"
                options={{
                    title: t("tabs.places"),
                    tabBarIcon: ({ focused, size }: TabIconProps) => (
                        <MapPinned
                            color={focused ? ds.colors.primary : ds.colors.mutedForeground}
                            size={size}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="execute"
                options={{
                    title: t("tabs.execute"),
                    tabBarIcon: ({ focused, size }: TabIconProps) => (
                        <ClipboardCheck
                            color={focused ? ds.colors.primary : ds.colors.mutedForeground}
                            size={size}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: t("tabs.reports"),
                    tabBarIcon: ({ focused, size }: TabIconProps) => (
                        <BarChart3
                            color={focused ? ds.colors.primary : ds.colors.mutedForeground}
                            size={size}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t("tabs.settings"),
                    tabBarIcon: ({ focused, size }: TabIconProps) => (
                        <Settings
                            color={focused ? ds.colors.primary : ds.colors.mutedForeground}
                            size={size}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
