import { useMemo } from "react";
import { useDesignSystem, type DesignSystemTheme } from "lib/design-system";
import { usePreferencesStore, type ResolvedTheme } from "stores/preferences-store";

/**
 * Shared native-stack header options (G1/G10). Previously copied verbatim in
 * six execute-flow screens; extracted so every stack screen renders the same
 * header chrome and theme fixes land in one place.
 *
 * The blur effect follows the resolved theme (the old copies hardcoded
 * `"light"`, which read wrong in dark mode).
 *
 * @param ds Active design system tokens.
 * @param resolvedTheme Resolved light or dark theme.
 * @returns Options object to spread into `navigation.setOptions` or a
 *          `Stack.Screen` `options` prop.
 */
export function getThemedHeaderOptions(ds: DesignSystemTheme, resolvedTheme: ResolvedTheme) {
    return {
        headerShown: true,
        headerBackButtonMenuEnabled: true,
        headerBackButtonDisplayMode: "generic" as const,
        headerBackVisible: true,
        headerBlurEffect: resolvedTheme,
        headerStyle: { backgroundColor: ds.colors.surfaceMuted },
        headerTintColor: ds.colors.primary,
        contentStyle: { paddingTop: 20 },
        headerTitleStyle: {
            color: ds.colors.foreground,
            fontFamily: ds.fonts.bodyBold,
        },
    };
}

/** Shape of the shared themed header options. */
export type ThemedHeaderOptions = ReturnType<typeof getThemedHeaderOptions>;

/**
 * Hook variant of {@link getThemedHeaderOptions}, memoized on the active
 * design system and resolved theme.
 *
 * @returns Shared themed header options for the current theme.
 */
export function useThemedHeaderOptions(): ThemedHeaderOptions {
    const ds = useDesignSystem();
    const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);

    return useMemo(() => getThemedHeaderOptions(ds, resolvedTheme), [ds, resolvedTheme]);
}
