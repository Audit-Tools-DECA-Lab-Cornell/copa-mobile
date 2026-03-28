type PresentationTheme = "light" | "dark";

interface ResolveFieldModePresentationOptions {
    readonly fieldMode: boolean;
    readonly fontScale: number;
    readonly highContrast: boolean;
    readonly theme: PresentationTheme;
}

interface FieldModePresentation {
    readonly effectiveFontScale: number;
    readonly prefersFieldPalette: boolean;
    readonly useHighContrastPalette: boolean;
}

const MIN_FIELD_MODE_FONT_SCALE = 1.1;

/**
 * Normalize a raw font scale before layering the Field Mode preset on top.
 *
 * @param fontScale Raw font scale from preferences or caller input.
 * @returns Safe positive font scale value.
 */
function normalizeFontScale(fontScale: number): number {
    return Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
}

/**
 * Resolve the visual accessibility changes implied by the Field Mode toggle.
 *
 * @param options Active theme and accessibility settings.
 * @returns Effective contrast, font scale, and palette guidance for the UI.
 */
export function resolveFieldModePresentation(
    options: Readonly<ResolveFieldModePresentationOptions>,
): FieldModePresentation {
    const normalizedFontScale = normalizeFontScale(options.fontScale);

    if (!options.fieldMode) {
        return {
            effectiveFontScale: normalizedFontScale,
            prefersFieldPalette: false,
            useHighContrastPalette: options.highContrast,
        };
    }

    return {
        effectiveFontScale: Math.max(normalizedFontScale, MIN_FIELD_MODE_FONT_SCALE),
        prefersFieldPalette: options.theme === "light",
        useHighContrastPalette: true,
    };
}
