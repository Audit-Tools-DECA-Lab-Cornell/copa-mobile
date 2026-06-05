import { Stack } from "expo-router";

/**
 * Onboarding route group - intentionally linear, with no header back affordance.
 * Navigation is controlled by each completed onboarding step.
 */
export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                gestureEnabled: false,
                animation: "slide_from_right",
            }}
        />
    );
}
