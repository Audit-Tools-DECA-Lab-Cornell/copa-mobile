import { createV5Theme, defaultChildrenThemes } from "@tamagui/config/v5";
import { v5ComponentThemes } from "@tamagui/themes/v5";
import { yellow, yellowDark, red, redDark, green, greenDark } from "@tamagui/colors";

const darkPalette = [
    "hsla(32, 15%, 27%, 1)",
    "hsla(32, 16%, 25%, 1)",
    "hsla(32, 17%, 24%, 1)",
    "hsla(32, 18%, 22%, 1)",
    "hsla(110, 18%, 32%, 1)",
    "hsla(188, 19%, 43%, 1)",
    "hsla(135, 19%, 45%, 1)",
    "hsla(83, 20%, 48%, 1)",
    "hsla(30, 20%, 50%, 1)",
    "hsla(28, 22%, 85%, 1)",
    "hsla(25, 25%, 95%, 1)",
    "hsla(22, 28%, 98%, 1)",
];
const lightPalette = [
    "hsla(32, 25%, 97%, 1)",
    "hsla(31, 27%, 93%, 1)",
    "hsla(31, 28%, 89%, 1)",
    "hsla(30, 30%, 85%, 1)",
    "hsla(29, 31%, 74%, 1)",
    "hsla(27, 33%, 64%, 1)",
    "hsla(26, 33%, 59%, 1)",
    "hsla(26, 34%, 55%, 1)",
    "hsla(25, 35%, 50%, 1)",
    "hsla(20, 40%, 20%, 1)",
    "hsla(15, 45%, 10%, 1)",
    "hsla(10, 50%, 5%, 1)",
];

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

export const themes = builtThemes;
