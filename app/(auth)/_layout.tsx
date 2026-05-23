import { Stack } from "expo-router";
import { vexo } from 'vexo-analytics';

// Initialize Vexo at the root level, outside of any component
// Recommended to wrap in production-only check
if (__DEV__ === false) {
    vexo('34fe321f-cb12-46f4-b958-d3fea3fea6a2');
}

/**
 * Auth route group layout.
 */
export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        />
    );
}
