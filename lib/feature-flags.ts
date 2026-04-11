const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBooleanFlag(rawValue: string | undefined, fallback: boolean): boolean {
    if (typeof rawValue !== "string") {
        return fallback;
    }

    const normalizedValue = rawValue.trim().toLowerCase();
    if (normalizedValue.length === 0) {
        return fallback;
    }

    return TRUE_VALUES.has(normalizedValue);
}

export function isGlassUiEnabled(): boolean {
    return parseBooleanFlag(process.env.EXPO_PUBLIC_GLASS_UI_ENABLED, true);
}

export function isDemoAppleSignInEnabled(): boolean {
    return parseBooleanFlag(process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED, true);
}

export function isDemoGoogleSignInEnabled(): boolean {
    return parseBooleanFlag(process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED, true);
}
