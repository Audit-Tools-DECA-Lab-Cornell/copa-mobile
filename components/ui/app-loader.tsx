import { useEffect } from "react";
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { Paragraph, YStack } from "tamagui";
import { MOTION, useDesignSystem } from "lib/design-system";

/**
 * The brand mark is an image asset (not text) because the loader also renders
 * at the earliest root gates, before custom fonts have loaded.
 */
const BRAND_MARK = require("../../assets/splash-icon.png");

const BRAND_MARK_SIZE = 96;

export interface AppLoaderProps {
    /**
     * Optional supporting line under the mark. Only pass this from screens
     * that mount after fonts are loaded; root gates must omit it.
     */
    readonly message?: string;
}

/**
 * Branded full-screen loader: the COPA mark pulsing gently on the app
 * background (G2 - every wait state visibly moves). Replaces ad-hoc
 * `ActivityIndicator`s and blank `return null` gates. Honors the OS
 * reduce-motion setting by holding a static frame.
 */
export function AppLoader({ message }: Readonly<AppLoaderProps>) {
    const ds = useDesignSystem();
    const reducedMotion = useReducedMotion();
    const progress = useSharedValue(0);

    useEffect(() => {
        if (reducedMotion) {
            progress.value = 0.5;
            return;
        }

        progress.value = 0;
        progress.value = withRepeat(
            withTiming(1, {
                duration: MOTION.loaderPulseDurationMs,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            true,
        );

        return () => {
            cancelAnimation(progress);
        };
    }, [progress, reducedMotion]);

    const pulseStyle = useAnimatedStyle(() => {
        const opacity = MOTION.loaderOpacityMin + (MOTION.loaderOpacityMax - MOTION.loaderOpacityMin) * progress.value;
        const scale = MOTION.loaderScaleMin + (MOTION.loaderScaleMax - MOTION.loaderScaleMin) * progress.value;
        return { opacity, transform: [{ scale }] };
    });

    return (
        <YStack
            flex={1}
            items="center"
            justify="center"
            bg={ds.colors.background}
            gap="$4"
            accessibilityRole="progressbar"
        >
            <Animated.Image
                source={BRAND_MARK}
                style={[{ width: BRAND_MARK_SIZE, height: BRAND_MARK_SIZE }, pulseStyle]}
                resizeMode="contain"
            />
            {message !== undefined && message.length > 0 ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                    lineHeight={ds.typography.bodyLg.lineHeight}
                    text="center"
                >
                    {message}
                </Paragraph>
            ) : null}
        </YStack>
    );
}
