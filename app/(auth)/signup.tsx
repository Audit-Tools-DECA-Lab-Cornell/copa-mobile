import { useCallback, useRef } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ShieldAlert } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import {
    isDemoAppleSignInEnabled,
    isDemoGoogleSignInEnabled,
    isGlassUiEnabled,
} from "lib/feature-flags";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";

/**
 * Signup route shares auditor access setup guidance.
 */
export default function SignupScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const toast = useToastController();
    const { t } = useTranslation("auth");
    const isGlassEnabled = isGlassUiEnabled();
    const isDemoAppleSignInVisible = isDemoAppleSignInEnabled();
    const isDemoGoogleSignInVisible = isDemoGoogleSignInEnabled();
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
                bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
                borderWidth={1}
                borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
                rounded={ds.radii.lg}
                p={layout.isTablet ? "$5" : "$4"}
                style={{
                    maxWidth: layout.formMaxWidth,
                    alignSelf: "center",
                    boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
                }}
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

                {isDemoAppleSignInVisible || isDemoGoogleSignInVisible ? (
                    <YStack gap="$2.5">
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.4}
                            px="$1"
                        >
                            {t("login.social.label")}
                        </Paragraph>
                        {isDemoAppleSignInVisible ? (
                            <Button
                                height={52}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    toast.show(t("login.social.restrictedTitle"), {
                                        message: t("login.social.restrictedMessage", {
                                            provider: t("login.social.apple"),
                                        }),
                                        variant: "info",
                                    });
                                }}
                            >
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelLg.fontSize}
                                >
                                    {t("login.social.apple")}
                                </Text>
                            </Button>
                        ) : null}
                        {isDemoGoogleSignInVisible ? (
                            <Button
                                height={52}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    toast.show(t("login.social.restrictedTitle"), {
                                        message: t("login.social.restrictedMessage", {
                                            provider: t("login.social.google"),
                                        }),
                                        variant: "info",
                                    });
                                }}
                            >
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelLg.fontSize}
                                >
                                    {t("login.social.google")}
                                </Text>
                            </Button>
                        ) : null}
                    </YStack>
                ) : null}
            </YStack>
        </ScrollView>
    );
}
