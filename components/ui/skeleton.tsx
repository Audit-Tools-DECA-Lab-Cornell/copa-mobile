import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { MOTION, useDesignSystem } from "lib/design-system";

/**
 * Shared opacity pulse for skeleton placeholders (G2: the app never looks
 * dead while loading). Honors the OS reduce-motion setting by holding the
 * static midpoint opacity instead of animating.
 *
 * @returns Animated style carrying the pulsing opacity.
 */
function useSkeletonPulseStyle() {
    const reducedMotion = useReducedMotion();
    const opacity = useSharedValue<number>(MOTION.skeletonOpacityMax);

    useEffect(() => {
        if (reducedMotion) {
            opacity.value = (MOTION.skeletonOpacityMin + MOTION.skeletonOpacityMax) / 2;
            return;
        }

        opacity.value = MOTION.skeletonOpacityMax;
        opacity.value = withRepeat(
            withTiming(MOTION.skeletonOpacityMin, {
                duration: MOTION.skeletonPulseDurationMs,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            true,
        );

        return () => {
            cancelAnimation(opacity);
        };
    }, [opacity, reducedMotion]);

    return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export interface SkeletonBlockProps {
    readonly height: number;
    readonly width?: DimensionValue;
    readonly flex?: number;
    readonly rounded?: number;
}

/**
 * Rectangular pulsing placeholder for cards, buttons, and media areas.
 */
export function SkeletonBlock({ height, width = "100%", flex, rounded }: Readonly<SkeletonBlockProps>) {
    const ds = useDesignSystem();
    const pulseStyle = useSkeletonPulseStyle();

    return (
        <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
                {
                    height,
                    width,
                    flex,
                    borderRadius: rounded ?? ds.radii.md,
                    backgroundColor: ds.colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: ds.colors.border,
                },
                pulseStyle,
            ]}
        />
    );
}

export interface SkeletonLineProps {
    readonly width?: DimensionValue;
    /** Line height in pixels; defaults to a body-text line. */
    readonly height?: number;
}

/**
 * Single-line pulsing placeholder for text.
 */
export function SkeletonLine({ width = "100%", height = 14 }: Readonly<SkeletonLineProps>) {
    const ds = useDesignSystem();
    const pulseStyle = useSkeletonPulseStyle();

    return (
        <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
                {
                    height,
                    width,
                    borderRadius: ds.radii.sm,
                    backgroundColor: ds.colors.surfaceMuted,
                },
                pulseStyle,
            ]}
        />
    );
}

export interface SkeletonCircleProps {
    readonly size: number;
}

/**
 * Circular pulsing placeholder for avatars and icon badges.
 */
export function SkeletonCircle({ size }: Readonly<SkeletonCircleProps>) {
    const ds = useDesignSystem();
    const pulseStyle = useSkeletonPulseStyle();

    return (
        <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
                {
                    height: size,
                    width: size,
                    borderRadius: size / 2,
                    backgroundColor: ds.colors.surfaceMuted,
                },
                pulseStyle,
            ]}
        />
    );
}
