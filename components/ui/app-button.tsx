import type { ReactNode } from "react";
import { Button, Text, XStack, type GetProps } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

/**
 * Visual hierarchy for app buttons. Each view should show at most one
 * `primary` button; supporting actions step down to `secondary` (outlined),
 * `accent` (primary-tinted outline), or `tertiary` (text only).
 * `destructive` is reserved for sign-out / delete style actions.
 */
export type AppButtonVariant = "primary" | "secondary" | "accent" | "tertiary" | "destructive";

type TamaguiButtonProps = GetProps<typeof Button>;

export interface AppButtonProps extends Omit<TamaguiButtonProps, "variant" | "size" | "icon"> {
    /** Sentence-case label; rendered without uppercase or letter-spacing. */
    readonly label: string;
    readonly variant?: AppButtonVariant;
    /** `compact` uses the smaller control height for inline/secondary rows. */
    readonly size?: "regular" | "compact";
    /** Optional leading icon element (already sized/colored by the caller). */
    readonly iconLeft?: ReactNode;
    /** Optional trailing icon element (already sized/colored by the caller). */
    readonly iconRight?: ReactNode;
}

/**
 * Shared button primitive: sentence-case semibold label, design-system
 * colors per variant, responsive height, and the app's standard press effect.
 *
 * Icon colors are the caller's responsibility; use `buttonForegroundColor()`
 * to match the label color for the chosen variant.
 */
export function AppButton({
    label,
    variant = "secondary",
    size = "regular",
    iconLeft,
    iconRight,
    disabled,
    ...rest
}: AppButtonProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    const height = size === "regular" ? layout.buttonHeight : layout.compactControlHeight;
    const foreground = buttonForegroundColor(variant, ds.colors, disabled === true);

    let frameProps: Partial<TamaguiButtonProps>;
    switch (variant) {
        case "primary":
            frameProps = {
                bg: disabled === true ? ds.colors.mutedSurface : ds.colors.primary,
                borderWidth: 0,
            };
            break;
        case "accent":
            frameProps = { bg: ds.colors.primarySoft, borderWidth: 1, borderColor: ds.colors.primary };
            break;
        case "tertiary":
            frameProps = { chromeless: true };
            break;
        case "destructive":
            frameProps = { bg: ds.colors.dangerSoft, borderWidth: 1, borderColor: ds.colors.danger };
            break;
        case "secondary":
            frameProps = { bg: ds.colors.input, borderWidth: 1, borderColor: ds.colors.border };
            break;
    }

    return (
        <Button
            height={height}
            rounded={ds.radii.md}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            disabled={disabled}
            {...frameProps}
            {...rest}
        >
            <XStack items="center" justify="center" gap="$2">
                {iconLeft}
                <Text
                    color={foreground}
                    fontFamily={ds.fonts.bodySemiBold}
                    fontSize={ds.typography.bodyMd.fontSize}
                    lineHeight={ds.typography.bodyMd.lineHeight}
                    numberOfLines={1}
                >
                    {label}
                </Text>
                {iconRight}
            </XStack>
        </Button>
    );
}

/**
 * Label/icon color for a button variant, so callers can tint custom icons to
 * match the label.
 */
export function buttonForegroundColor(
    variant: AppButtonVariant,
    colors: ReturnType<typeof useDesignSystem>["colors"],
    disabled = false,
) {
    if (disabled) {
        return colors.mutedForeground;
    }
    switch (variant) {
        case "primary":
            return colors.primaryForeground;
        case "accent":
        case "tertiary":
            return colors.primary;
        case "destructive":
            return colors.danger;
        case "secondary":
            return colors.foreground;
    }
}
