import { type JSX, useRef, useState } from "react";
import {
    Image,
    ScrollView,
    useWindowDimensions,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
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
                {SLIDES.map((slide) => (
                    <SlideView
                        key={slide.key}
                        slide={slide}
                        width={screenWidth}
                        paddingHorizontal={contentPaddingHorizontal}
                        isTablet={layout.isTablet}
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
                        {SLIDES.map((slide, index) => {
                            const isActive = index === currentSlide;
                            return (
                                <YStack
                                    key={slide.key}
                                    width={isActive ? 24 : 8}
                                    height={8}
                                    rounded={ds.radii.full}
                                    bg={isActive ? ds.colors.primary : ds.colors.border}
                                />
                            );
                        })}
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
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly t: (key: string) => string;
}

function SlideView({ slide, width, paddingHorizontal, isTablet, ds, t }: SlideViewProps) {
    const { Icon } = slide;

    // The mockup images are tall portrait frames. Give the image generous vertical
    // space and let the text sit below it without crowding either region.
    const imageAreaHeight = isTablet ? 380 : 300;
    const titleFontSize = isTablet ? 30 : 24;
    const titleLineHeight = isTablet ? 38 : 30;

    return (
        <YStack width={width} flex={1} justify="flex-start" gap={isTablet ? "$5" : "$4"} pb="$2">
            {/* Screenshot image — centered, contain so the phone frame stays intact */}
            <YStack height={imageAreaHeight} width={width} items="center" justify="center" overflow="hidden">
                <Image
                    source={SLIDE_IMAGES[slide.key]}
                    style={{
                        width: width * (isTablet ? 0.52 : 0.62),
                        height: imageAreaHeight,
                    }}
                    resizeMode="contain"
                    accessibilityRole="image"
                    accessibilityLabel={t(slide.titleKey)}
                />
            </YStack>

            {/* Text content */}
            <YStack px={paddingHorizontal} gap={isTablet ? "$4" : "$3"} style={{ maxWidth: 520 }}>
                {/* Icon badge + eyebrow on one line */}
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

                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={titleFontSize}
                    lineHeight={titleLineHeight}
                    textTransform="uppercase"
                    fontStyle="italic"
                    letterSpacing={-0.5}
                >
                    {t(slide.titleKey)}
                </Text>

                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize}
                    lineHeight={isTablet ? ds.typography.bodyLg.lineHeight : ds.typography.bodyMd.lineHeight}
                >
                    {t(slide.bodyKey)}
                </Paragraph>
            </YStack>
        </YStack>
    );
}
