import { createV5Theme, defaultChildrenThemes } from "@tamagui/config/v5";
import { v5ComponentThemes } from "@tamagui/themes/v5";
import { yellow, yellowDark, red, redDark, green, greenDark } from "@tamagui/colors";

const darkPalette = [
    "hsla(30, 22%, 10%, 1)", // 1  canvas
    "hsla(30, 22%, 13%, 1)", // 2  surface
    "hsla(30, 22%, 16%, 1)", // 3  surface raised
    "hsla(29, 22%, 20%, 1)", // 4  surface sunken / alt
    "hsla(29, 22%, 26%, 1)", // 5  mid-dark
    "hsla(29, 22%, 33%, 1)", // 6  mid
    "hsla(28, 23%, 41%, 1)", // 7  mid-light
    "hsla(28, 24%, 51%, 1)", // 8
    "hsla(27, 25%, 63%, 1)", // 9  text muted
    "hsla(27, 27%, 76%, 1)", // 10 text secondary
    "hsla(26, 30%, 88%, 1)", // 11 text primary
    "hsla(26, 33%, 96%, 1)", // 12 near-white
];
const lightPalette = [
    "hsla(33, 38%, 97%, 1)", // 1  canvas
    "hsla(32, 35%, 93%, 1)", // 2  surface
    "hsla(31, 32%, 89%, 1)", // 3  surface raised
    "hsla(30, 29%, 84%, 1)", // 4
    "hsla(29, 27%, 76%, 1)", // 5
    "hsla(28, 26%, 66%, 1)", // 6
    "hsla(27, 26%, 56%, 1)", // 7
    "hsla(27, 26%, 46%, 1)", // 8
    "hsla(26, 27%, 36%, 1)", // 9
    "hsla(25, 28%, 26%, 1)", // 10
    "hsla(24, 30%, 16%, 1)", // 11
    "hsla(23, 32%, 9%, 1)", // 12 near-black
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
