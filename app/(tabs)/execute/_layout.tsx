import { Stack } from "expo-router";

/**
 * Nested execute stack for playspace audit routes inside the main tab bar.
 */
export default function ExecuteLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: "Execute",
                }}
            />
            <Stack.Screen
                name="[placeId]/index"
                options={{
                    title: "Audit Start",
                }}
            />
            <Stack.Screen
                name="[placeId]/pre-audit"
                options={{
                    title: "Pre-Audit",
                }}
            />
            <Stack.Screen
                name="[placeId]/section/[sectionKey]"
                options={{
                    title: "Section",
                }}
            />
        </Stack>
    );
}
