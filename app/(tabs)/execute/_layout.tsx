import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

/**
 * Nested execute stack for playspace audit routes inside the main tab bar.
 *
 * The index screen (place picker) hides the header to provide a full-bleed
 * layout. All deeper screens show a themed header with a back button that
 * follows logical parent navigation.
 */
export default function ExecuteLayout() {
    const { t } = useTranslation("audit");

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
        </Stack>
    );
}
