/**
 * Glass UI design system configuration.
 * Controls whether elevated surfaces use the glass/neumorphic treatment.
 *
 * When enabled: elevated surfaces use semi-transparent backgrounds with inset shadows
 * When disabled: standard opaque surfaces with regular shadows
 */

function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value === "true" || value === "1" || value === "yes";
}

/**
 * Check if glass UI treatment is enabled for elevated surfaces.
 * Controlled by EXPO_PUBLIC_GLASS_UI_ENABLED environment variable.
 * Defaults to true if not specified.
 *
 * @returns true if glass UI is enabled, false otherwise.
 */
export const GLASS_UI_ENABLED = parseBooleanFlag(process.env.EXPO_PUBLIC_GLASS_UI_ENABLED, true);

/**
 * Helper to select glass UI or standard surface tokens based on enabled state.
 *
 * @param glassValue Design system value to use when glass UI is enabled.
 * @param standardValue Design system value to use when glass UI is disabled.
 * @returns The appropriate value based on glass UI enabled state.
 */
export function selectGlassUiValue<T>(glassValue: T, standardValue: T): T {
    return GLASS_UI_ENABLED ? glassValue : standardValue;
}
