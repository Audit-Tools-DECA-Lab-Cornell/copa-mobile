import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useDesignSystem } from "lib/design-system";

export const unstable_settings = {
    initialRouteName: "index",
};

/**
 * Nested execute stack for playspace audit routes inside the main tab bar.
 *
 * The index screen (place picker) hides the header to provide a full-bleed
 * layout. All deeper screens show a themed header with a back button that
 * follows logical parent navigation.
 */
export default function ExecuteLayout() {
    const ds = useDesignSystem();
    const { t } = useTranslation("audit");

    const themedHeaderOptions = {
        headerShown: true,
        headerBackButtonMenuEnabled: true,
        headerBackButtonDisplayMode: "minimal",
        headerBackVisible: true,
        headerBlurEffect: "light",
        headerStyle: { backgroundColor: ds.colors.surface },
        headerTintColor: ds.colors.primary,
        headerTitleStyle: {
            color: ds.colors.foreground,
            fontFamily: ds.fonts.bodyBold,
        },
    } as const;

    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: t("stack.execute"),
                }}
            />
            <Stack.Screen
                name="[placeId]/section/[sectionKey]"
                options={{
                    ...themedHeaderOptions,
                    title: t("stack.section"),
                    headerShown: true,
                }}
            />
        </Stack>
    );
}
