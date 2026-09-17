import { createV5Theme, defaultChildrenThemes } from "@tamagui/config/v5";
import { v5ComponentThemes } from "@tamagui/themes/v5";
import { yellow, yellowDark, red, redDark, green, greenDark } from "@tamagui/colors";

import { GENERATED_DARK_RAMP, GENERATED_LIGHT_RAMP } from "./themes.generated";

const darkPalette = GENERATED_DARK_RAMP;
const lightPalette = GENERATED_LIGHT_RAMP;

const builtThemes = createV5Theme({
    darkPalette,
    lightPalette,
    componentThemes: v5ComponentThemes,
    childrenThemes: {
        // Include default color themes (blue, red, green, yellow, etc.)
        ...defaultChildrenThemes,

        // Semantic color themes for warnings, errors, and success states
        warning: {
            light: yellow,
            dark: yellowDark,
        },
        error: {
            light: red,
            dark: redDark,
        },
        success: {
            light: green,
            dark: greenDark,
        },
    },
});

export type Themes = typeof builtThemes;

export const themes: Themes = builtThemes;
