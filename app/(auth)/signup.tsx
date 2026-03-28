import { useCallback, useRef } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ShieldAlert } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";

/**
 * Signup route shares auditor access setup guidance.
 */
export default function SignupScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation("auth");
    const scrollViewRef = useRef<ScrollView | null>(null);

    const scrollSignupToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: true,
        scrollToOffset: scrollSignupToOffset,
    });

    return (
        <ScrollView
            ref={scrollViewRef}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: layout.screenPaddingHorizontal,
                paddingVertical: 32,
                justifyContent: "center",
                backgroundColor: ds.colors.background,
            }}
        >
            <YStack
                gap="$6"
                width="100%"
                style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}
            >
                <YStack items="center" gap="$4">
                    <YStack
                        width={88}
                        height={88}
                        items="center"
                        justify="center"
                        rounded={ds.radii.xl}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surfaceMuted}
                        style={{
                            boxShadow: ds.shadows.card,
                        }}
                    >
                        <ShieldAlert size={34} color={ds.colors.warning} />
                    </YStack>

                    <YStack items="center" gap="$2">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.displayMd.fontSize}
                            lineHeight={ds.typography.displayMd.lineHeight}
                            textTransform="uppercase"
                            letterSpacing={-0.5}
                        >
                            {t("signup.title")}
                        </Text>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            style={{ textAlign: "center" }}
                        >
                            {t("signup.subtitle")}
                        </Paragraph>
                    </YStack>
                </YStack>

                <YStack
                    borderWidth={1}
                    borderColor={ds.colors.warning}
                    bg={ds.colors.warningSoft}
                    rounded={ds.radii.lg}
                    p="$4"
                    gap="$3"
                >
                    <XStack items="center" gap="$2">
                        <ShieldAlert size={18} color={ds.colors.warning} />
                        <Text
                            color={ds.colors.warning}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {t("signup.warningTitle")}
                        </Text>
                    </XStack>
                    <Paragraph
                        color={ds.colors.secondaryForeground}
                        fontFamily={ds.fonts.bodyMedium}
                    >
                        {t("signup.warningBody")}
                    </Paragraph>
                </YStack>

                <Button
                    height={52}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surface}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.replace("/(auth)/login");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <ArrowLeft size={16} color={ds.colors.foreground} />
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelLg.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.3}
                        >
                            {t("signup.backToSignIn")}
                        </Text>
                    </XStack>
                </Button>
            </YStack>
        </ScrollView>
    );
}
