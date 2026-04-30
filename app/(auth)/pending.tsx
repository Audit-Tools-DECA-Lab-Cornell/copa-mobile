import { useCallback, useRef } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";

/**
 * Shown after a successful self-signup access request.
 * The auditor waits here until their manager creates their account.
 */
export default function PendingScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation("auth");
    const params = useLocalSearchParams<{ managerEmail?: string }>();
    const managerEmail = params.managerEmail ?? "";
    const scrollViewRef = useRef<ScrollView | null>(null);

    const scrollToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({ contentReady: true, scrollToOffset });

    return (
        <ScrollView
            ref={scrollViewRef}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: layout.screenPaddingHorizontal,
                paddingVertical: 48,
                justifyContent: "center",
                backgroundColor: ds.colors.background,
            }}
        >
            <YStack gap="$6" width="100%" style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}>
                {/* Icon */}
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
                        style={{ boxShadow: ds.shadows.card }}
                    >
                        <Clock size={34} color={ds.colors.warning} />
                    </YStack>

                    <YStack items="center" gap="$2">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.displayMd.fontSize}
                            lineHeight={ds.typography.displayMd.lineHeight}
                            textTransform="uppercase"
                            fontStyle="italic"
                            letterSpacing={-0.5}
                        >
                            {t("pending.title")}
                        </Text>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodySemiBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.4}
                            style={{ textAlign: "center" }}
                        >
                            {t("pending.subtitle")}
                        </Paragraph>
                    </YStack>
                </YStack>

                {/* Info card */}
                <YStack
                    rounded={ds.radii.lg}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surface}
                    p="$4"
                    gap="$3"
                    style={{ boxShadow: ds.shadows.card }}
                >
                    <Paragraph color={ds.colors.foreground} fontFamily={ds.fonts.bodyMedium}>
                        {t("pending.body")}
                    </Paragraph>
                    {managerEmail.length > 0 ? (
                        <XStack
                            rounded={ds.radii.md}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surfaceMuted}
                            px="$3"
                            py="$2"
                        >
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.monoMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                            >
                                {managerEmail}
                            </Text>
                        </XStack>
                    ) : null}
                </YStack>

                {/* Back to sign in */}
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
                            {t("pending.backToSignIn")}
                        </Text>
                    </XStack>
                </Button>
            </YStack>
        </ScrollView>
    );
}
