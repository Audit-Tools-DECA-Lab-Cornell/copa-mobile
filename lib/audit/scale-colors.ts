/**
 * Canonical PV scale colour palette — fixed product tokens, independent of
 * theme accent colours (slate, moss, terracotta, violet).
 *
 * Used by in-app scale UI, report views, PDF, and Excel exports.
 */

import type { ColorTokens } from "tamagui";

export const PV_SCALE_KEYS = ["provision", "diversity", "challenge", "sociability"] as const;

export type PvScaleKey = (typeof PV_SCALE_KEYS)[number];

/** Canonical accent hex colours for each PV scale (aligned with web). */
export const SCALE_ACCENT_COLORS: Record<PvScaleKey, string> = {
    provision: "#566E3D",
    diversity: "#BD4926",
    challenge: "#0C4767",
    sociability: "#754170",
};

/**
 * Soft fills are blended from each accent toward white so column backgrounds
 * and badge fills stay clearly lighter than accent text and borders.
 */
const SCALE_SOFT_BLEND_WEIGHT = 0.2;

export interface ScaleColorFields {
    readonly provision: ColorTokens;
    readonly provisionSoft: ColorTokens;
    readonly diversity: ColorTokens;
    readonly diversitySoft: ColorTokens;
    readonly challenge: ColorTokens;
    readonly challengeSoft: ColorTokens;
    readonly sociability: ColorTokens;
    readonly sociabilitySoft: ColorTokens;
}

function parseHexColor(hex: string): [number, number, number] {
    const normalized = hex.replace("#", "").trim();
    if (normalized.length !== 6) {
        throw new Error(`Expected 6-digit hex color, received "${hex}"`);
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) {
        throw new Error(`Invalid hex color "${hex}"`);
    }

    return [red, green, blue];
}

function toHexByte(value: number): string {
    return Math.round(value).toString(16).padStart(2, "0");
}

function blendHexWithWhite(hex: string, accentWeight: number): string {
    const [red, green, blue] = parseHexColor(hex);
    const backgroundWeight = 1 - accentWeight;

    const blendedRed = 255 * backgroundWeight + red * accentWeight;
    const blendedGreen = 255 * backgroundWeight + green * accentWeight;
    const blendedBlue = 255 * backgroundWeight + blue * accentWeight;

    return `#${toHexByte(blendedRed)}${toHexByte(blendedGreen)}${toHexByte(blendedBlue)}`;
}

/** Canonical soft background hex colours for scale columns and badge fills. */
export const SCALE_SOFT_COLORS: Record<PvScaleKey, string> = {
    provision: blendHexWithWhite(SCALE_ACCENT_COLORS.provision, SCALE_SOFT_BLEND_WEIGHT),
    diversity: blendHexWithWhite(SCALE_ACCENT_COLORS.diversity, SCALE_SOFT_BLEND_WEIGHT),
    challenge: blendHexWithWhite(SCALE_ACCENT_COLORS.challenge, SCALE_SOFT_BLEND_WEIGHT),
    sociability: blendHexWithWhite(SCALE_ACCENT_COLORS.sociability, SCALE_SOFT_BLEND_WEIGHT),
};

/** Fixed accent and soft-fill hex values per PV scale. */
export const PV_SCALE_PALETTE: Record<PvScaleKey, { readonly accent: string; readonly soft: string }> = {
    provision: { accent: SCALE_ACCENT_COLORS.provision, soft: SCALE_SOFT_COLORS.provision },
    diversity: { accent: SCALE_ACCENT_COLORS.diversity, soft: SCALE_SOFT_COLORS.diversity },
    challenge: { accent: SCALE_ACCENT_COLORS.challenge, soft: SCALE_SOFT_COLORS.challenge },
    sociability: { accent: SCALE_ACCENT_COLORS.sociability, soft: SCALE_SOFT_COLORS.sociability },
};

/** Tamagui palette fields derived from the fixed PV scale palette. */
export function buildScaleColorFields(): ScaleColorFields {
    return {
        provision: SCALE_ACCENT_COLORS.provision as ColorTokens,
        provisionSoft: SCALE_SOFT_COLORS.provision as ColorTokens,
        diversity: SCALE_ACCENT_COLORS.diversity as ColorTokens,
        diversitySoft: SCALE_SOFT_COLORS.diversity as ColorTokens,
        challenge: SCALE_ACCENT_COLORS.challenge as ColorTokens,
        challengeSoft: SCALE_SOFT_COLORS.challenge as ColorTokens,
        sociability: SCALE_ACCENT_COLORS.sociability as ColorTokens,
        sociabilitySoft: SCALE_SOFT_COLORS.sociability as ColorTokens,
    };
}

/** Converts `#RRGGBB` to an RGB tuple for PDF consumers. */
export function hexToRgb(hex: string): [number, number, number] {
    return parseHexColor(hex);
}

/** Strips `#` for XLSX `rgb` style fields. */
export function hexToXlsxRgb(hex: string): string {
    return hex.replace("#", "").trim().toUpperCase();
}
