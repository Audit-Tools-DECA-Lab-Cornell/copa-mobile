import { type JSX, useEffect, useRef, useState } from "react";
import {
    Image,
    ScrollView,
    useWindowDimensions,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    interpolateColor,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ArrowRight, BadgeCheck, ClipboardCheck, ShieldCheck, UploadCloud } from "@tamagui/lucide-icons-2";
import type { IconProps } from "@tamagui/helpers-icon";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { usePreferencesStore } from "stores/preferences-store";

type IntroIcon = (props: IconProps) => JSX.Element;

const CLOUDINARY_BASE = `https://res.cloudinary.com/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_900`;

const SLIDE_IMAGES = {
    identity: { uri: `${CLOUDINARY_BASE}/iphone-light/framed/03-home-portrait` },
    offline: { uri: `${CLOUDINARY_BASE}/iphone-dark/framed/03-home-portrait` },
    speed: { uri: `${CLOUDINARY_BASE}/iphone-light/framed/11-execute-section-questions-portrait` },
    privacy: { uri: `${CLOUDINARY_BASE}/iphone-light/framed/15-report-detail-top-portrait` },
} as const;

interface IntroSlide {
    readonly key: keyof typeof SLIDE_IMAGES;
    readonly labelKey: string;
    readonly titleKey: string;
    readonly bodyKey: string;
    readonly Icon: IntroIcon;
}

const SLIDES: readonly IntroSlide[] = [
    {
        key: "identity",
        labelKey: "intro.slide1.label",
        titleKey: "intro.slide1.title",
        bodyKey: "intro.slide1.body",
        Icon: BadgeCheck as IntroIcon,
    },
    {
        key: "offline",
        labelKey: "intro.slide2.label",
        titleKey: "intro.slide2.title",
        bodyKey: "intro.slide2.body",
        Icon: UploadCloud as IntroIcon,
    },
    {
        key: "speed",
        labelKey: "intro.slide3.label",
        titleKey: "intro.slide3.title",
        bodyKey: "intro.slide3.body",
        Icon: ClipboardCheck as IntroIcon,
    },
    {
        key: "privacy",
        labelKey: "intro.slide4.label",
        titleKey: "intro.slide4.title",
        bodyKey: "intro.slide4.body",
        Icon: ShieldCheck as IntroIcon,
    },
];

/**
 * First-launch intro walkthrough shown once to new users before login.
 * Four slides establish auditor identity, offline capability, workflow speed,
 * and privacy guarantees — covering the key objections before they arise.
 * Each slide shows a real app screenshot paired with the narrative copy.
 */
export default function IntroScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation("auth");
    const markIntroSeen = usePreferencesStore((state) => state.markIntroSeen);
    const { width: screenWidth } = useWindowDimensions();

    const scrollRef = useRef<ScrollView | null>(null);
    const [currentSlide, setCurrentSlide] = useState<number>(0);

    const isLastSlide = currentSlide === SLIDES.length - 1;

    const navigateToLogin = (): void => {
        markIntroSeen();
        router.replace("/(auth)/login");
    };

    const handleNext = (): void => {
        if (isLastSlide) {
            navigateToLogin();
            return;
        }
        const nextIndex = currentSlide + 1;
        setCurrentSlide(nextIndex);
        scrollRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
    };

    const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
        const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
        if (index !== currentSlide) {
            setCurrentSlide(index);
        }
    };

    const footerPaddingBottom = layout.isTablet ? 48 : 36;
    const contentPaddingHorizontal = layout.screenPaddingHorizontal;

    return (
        <YStack flex={1} bg={ds.colors.background}>
            {/* Skip affordance — always visible so users never feel trapped */}
            <XStack px={contentPaddingHorizontal} pt={layout.isTablet ? 24 : 16} pb="$2" justify="flex-end">
                <Button
                    unstyled
                    onPress={navigateToLogin}
                    accessibilityRole="button"
                    accessibilityLabel={t("intro.skip")}
                    px="$3"
                    py="$2"
                >
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                    >
                        {t("intro.skip")}
                    </Text>
                </Button>
            </XStack>

            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                style={{ flex: 1 }}
            >
                {SLIDES.map((slide, index) => (
                    <SlideView
                        key={slide.key}
                        slide={slide}
                        width={screenWidth}
                        paddingHorizontal={contentPaddingHorizontal}
                        isTablet={layout.isTablet}
                        isActive={index === currentSlide}
                        ds={ds}
                        t={t}
                    />
                ))}
            </ScrollView>

            <YStack
                px={contentPaddingHorizontal}
                pt="$5"
                pb={footerPaddingBottom}
                borderTopWidth={1}
                borderTopColor={ds.colors.border}
                bg={ds.colors.background}
            >
                <YStack width="100%" gap="$4" style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}>
                    {/* Progress dots — pill expands on the active slide */}
                    <XStack justify="center" gap="$2">
                        {SLIDES.map((slide, index) => (
                            <AnimatedDot
                                key={slide.key}
                                isActive={index === currentSlide}
                                activeColor={ds.colors.primary}
                                inactiveColor={ds.colors.border}
                            />
                        ))}
                    </XStack>

                    <Button
                        height={56}
                        rounded={ds.radii.md}
                        borderWidth={0}
                        bg={ds.colors.primary}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={handleNext}
                        style={{ boxShadow: ds.shadows.accent }}
                        accessibilityRole="button"
                    >
                        <XStack items="center" gap="$2">
                            <Text
                                color={ds.colors.primaryForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelLg.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.4}
                            >
                                {isLastSlide ? t("intro.ctaSignIn") : t("intro.ctaNext")}
                            </Text>
                            <ArrowRight size={16} color={ds.colors.primaryForeground} />
                        </XStack>
                    </Button>
                </YStack>
            </YStack>
        </YStack>
    );
}

interface SlideViewProps {
    readonly slide: IntroSlide;
    readonly width: number;
    readonly paddingHorizontal: number;
    readonly isTablet: boolean;
    readonly isActive: boolean;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly t: (key: string) => string;
}

const SPRING_CONFIG = { damping: 18, stiffness: 180 } as const;

function SlideView({ slide, width, paddingHorizontal, isTablet, isActive, ds, t }: SlideViewProps) {
    const { Icon } = slide;
    const { height: screenHeight } = useWindowDimensions();

    const imageScale = useSharedValue(0.94);
    const eyebrowOpacity = useSharedValue(0);
    const eyebrowY = useSharedValue(12);
    const titleOpacity = useSharedValue(0);
    const titleY = useSharedValue(12);
    const bodyOpacity = useSharedValue(0);
    const bodyY = useSharedValue(12);

    useEffect(() => {
        if (isActive) {
            imageScale.value = withSpring(1, { damping: 14, stiffness: 130 });
            eyebrowOpacity.value = withDelay(60, withTiming(1, { duration: 260 }));
            eyebrowY.value = withDelay(60, withSpring(0, SPRING_CONFIG));
            titleOpacity.value = withDelay(130, withTiming(1, { duration: 260 }));
            titleY.value = withDelay(130, withSpring(0, SPRING_CONFIG));
            bodyOpacity.value = withDelay(200, withTiming(1, { duration: 260 }));
            bodyY.value = withDelay(200, withSpring(0, SPRING_CONFIG));
        } else {
            imageScale.value = 0.94;
            eyebrowOpacity.value = 0;
            eyebrowY.value = 12;
            titleOpacity.value = 0;
            titleY.value = 12;
            bodyOpacity.value = 0;
            bodyY.value = 12;
        }
    }, [isActive, imageScale, eyebrowOpacity, eyebrowY, titleOpacity, titleY, bodyOpacity, bodyY]);

    const imageStyle = useAnimatedStyle(() => ({
        transform: [{ scale: imageScale.value }],
    }));

    const eyebrowStyle = useAnimatedStyle(() => ({
        opacity: eyebrowOpacity.value,
        transform: [{ translateY: eyebrowY.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleY.value }],
    }));

    const bodyStyle = useAnimatedStyle(() => ({
        opacity: bodyOpacity.value,
        transform: [{ translateY: bodyY.value }],
    }));

    // ─── Tablet: side-by-side layout ────────────────────────────────────────
    // Portrait phone-frame images are tall and narrow (~9:19 ratio). Stacking
    // them in a vertical layout on a wide tablet wastes horizontal space and
    // forces a short, small image. A two-column layout lets the image fill the
    // full available height while the text sits beside it, vertically centered.
    if (isTablet) {
        const imageColWidth = width * 0.44;
        // Use 68% of screen height so the image is large but clear of safe-area
        // insets, the skip bar, and the footer.
        const tabletImageHeight = screenHeight * 0.68;

        return (
            <XStack width={width} flex={1} items="center" px={paddingHorizontal} gap="$8">
                {/* Left column: screenshot, drives its own height */}
                <YStack width={imageColWidth} items="center" justify="center">
                    <Animated.View style={imageStyle}>
                        <Image
                            source={SLIDE_IMAGES[slide.key]}
                            style={{ width: imageColWidth, height: tabletImageHeight }}
                            resizeMode="contain"
                            accessibilityRole="image"
                            accessibilityLabel={t(slide.titleKey)}
                        />
                    </Animated.View>
                </YStack>

                {/* Right column: text, vertically centered */}
                <YStack flex={1} justify="center" gap="$6">
                    <Animated.View style={eyebrowStyle}>
                        <XStack items="center" gap="$2">
                            <YStack
                                width={32}
                                height={32}
                                rounded={ds.radii.sm}
                                items="center"
                                justify="center"
                                bg={ds.colors.primarySoft}
                                borderWidth={1}
                                borderColor={ds.colors.primary}
                            >
                                <Icon size={16} color={ds.colors.primary} />
                            </YStack>
                            <Paragraph
                                color={ds.colors.primary}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelMd.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.8}
                            >
                                {t(slide.labelKey)}
                            </Paragraph>
                        </XStack>
                    </Animated.View>

                    <Animated.View style={titleStyle}>
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={36}
                            lineHeight={44}
                            textTransform="uppercase"
                            fontStyle="italic"
                            letterSpacing={-0.5}
                        >
                            {t(slide.titleKey)}
                        </Text>
                    </Animated.View>

                    <Animated.View style={bodyStyle}>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyLg.fontSize}
                            lineHeight={ds.typography.bodyLg.lineHeight}
                        >
                            {t(slide.bodyKey)}
                        </Paragraph>
                    </Animated.View>
                </YStack>
            </XStack>
        );
    }

    // ─── Phone: vertical layout ──────────────────────────────────────────────
    return (
        <YStack width={width} flex={1} justify="flex-start" gap="$4" pb="$2">
            {/* Screenshot image — centered, contain so the phone frame stays intact */}
            <YStack height={300} width={width} items="center" justify="center" overflow="hidden">
                <Animated.View style={imageStyle}>
                    <Image
                        source={SLIDE_IMAGES[slide.key]}
                        style={{ width: width * 0.62, height: 300 }}
                        resizeMode="contain"
                        accessibilityRole="image"
                        accessibilityLabel={t(slide.titleKey)}
                    />
                </Animated.View>
            </YStack>

            {/* Text content — each element staggers in when the slide becomes active */}
            <YStack px={paddingHorizontal} gap="$3" style={{ maxWidth: 520 }}>
                <Animated.View style={eyebrowStyle}>
                    <XStack items="center" gap="$2">
                        <YStack
                            width={28}
                            height={28}
                            rounded={ds.radii.sm}
                            items="center"
                            justify="center"
                            bg={ds.colors.primarySoft}
                            borderWidth={1}
                            borderColor={ds.colors.primary}
                        >
                            <Icon size={14} color={ds.colors.primary} />
                        </YStack>
                        <Paragraph
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.8}
                        >
                            {t(slide.labelKey)}
                        </Paragraph>
                    </XStack>
                </Animated.View>

                <Animated.View style={titleStyle}>
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={24}
                        lineHeight={30}
                        textTransform="uppercase"
                        fontStyle="italic"
                        letterSpacing={-0.5}
                    >
                        {t(slide.titleKey)}
                    </Text>
                </Animated.View>

                <Animated.View style={bodyStyle}>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                        lineHeight={ds.typography.bodyMd.lineHeight}
                    >
                        {t(slide.bodyKey)}
                    </Paragraph>
                </Animated.View>
            </YStack>
        </YStack>
    );
}

interface AnimatedDotProps {
    readonly isActive: boolean;
    readonly activeColor: string;
    readonly inactiveColor: string;
}

function AnimatedDot({ isActive, activeColor, inactiveColor }: AnimatedDotProps) {
    const progress = useSharedValue(isActive ? 1 : 0);

    useEffect(() => {
        progress.value = withSpring(isActive ? 1 : 0, { damping: 14, stiffness: 160 });
    }, [isActive, progress]);

    const animStyle = useAnimatedStyle(() => ({
        width: 8 + progress.value * 16,
        backgroundColor: interpolateColor(progress.value, [0, 1], [inactiveColor, activeColor]),
    }));

    return <Animated.View style={[animStyle, { height: 8, borderRadius: 999 }]} />;
}
