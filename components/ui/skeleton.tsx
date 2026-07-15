import { useEffect } from "react";
import { ScrollView, type DimensionValue } from "react-native";
import { XStack, YStack } from "tamagui";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useFabAwareBottomPadding } from "lib/responsive-insets";
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
    readonly width?: DimensionValue | undefined;
    readonly flex?: number | undefined;
    readonly rounded?: number | undefined;
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
    readonly width?: DimensionValue | undefined;
    /** Line height in pixels; defaults to a body-text line. */
    readonly height?: number | undefined;
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
 * Full-tab loading skeleton shared by the queue-style tab screens (Home,
 * Places, Reports, Execute): title block, summary tile row, and a column of
 * card-shaped placeholders. Shapes follow the same layout tokens as the real
 * cards so content does not shift when data arrives (G2/G10).
 */
export function TabListSkeleton() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const bottomPadding = useFabAwareBottomPadding();

    const cardHeight = layout.isTablet ? 156 : 132;

    return (
        <ScrollView
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding,
                gap: layout.sectionGap,
            })}
            scrollEnabled={false}
        >
            <YStack gap="$3">
                <SkeletonBlock width="42%" height={layout.isTablet ? 40 : 30} rounded={ds.radii.sm} />
                <SkeletonLine width="64%" height={layout.isTablet ? 20 : 16} />
            </YStack>
            <XStack gap="$3">
                <SkeletonBlock flex={1} height={layout.isTablet ? 96 : 72} />
                <SkeletonBlock flex={1} height={layout.isTablet ? 96 : 72} />
                <SkeletonBlock flex={1} height={layout.isTablet ? 96 : 72} />
            </XStack>
            <YStack gap="$3">
                <SkeletonBlock height={cardHeight} rounded={ds.radii.lg} />
                <SkeletonBlock height={cardHeight} rounded={ds.radii.lg} />
                <SkeletonBlock height={cardHeight} rounded={ds.radii.lg} />
                <SkeletonBlock height={cardHeight} rounded={ds.radii.lg} />
            </YStack>
        </ScrollView>
    );
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
