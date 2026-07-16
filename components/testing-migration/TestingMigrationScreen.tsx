import { ArrowRight, CheckCircle2, ExternalLink, ShieldCheck } from "@tamagui/lucide-icons-2";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Share, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";

import { useConfirm } from "components/ui/confirm-dialog";
import { useDesignSystem } from "lib/design-system";
import { logger } from "lib/logger";
import { usePreferencesStore } from "stores/preferences-store";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { recordTestingMigrationEvent, TESTING_MIGRATION_EVENTS } from "lib/testing-migration/config";

interface TestingMigrationScreenProps {
    readonly closedTestUrl: string | null;
}

export function TestingMigrationScreen({ closedTestUrl }: Readonly<TestingMigrationScreenProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation("common");
    const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
    const layout = useResponsiveLayout();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const requestConfirm = useConfirm();

    useEffect(() => {
        recordTestingMigrationEvent(TESTING_MIGRATION_EVENTS.screenViewed);
    }, []);

    const handlePrimaryPress = (): void => {
        recordTestingMigrationEvent(TESTING_MIGRATION_EVENTS.primaryCtaTapped);

        if (closedTestUrl === null) {
            openSupportEmail(t("testingMigration.reasonMissingLink"));
            return;
        }

        WebBrowser.openBrowserAsync(closedTestUrl).catch((error: unknown) => {
            logger.withError(error).warn("failed to open testing opt-in link");
            openSupportEmail(t("testingMigration.reasonOpenLinkFailed"));
        });
    };

    const handleSecondaryPress = (): void => {
        recordTestingMigrationEvent(TESTING_MIGRATION_EVENTS.secondaryCtaTapped);
        openSupportEmail(t("testingMigration.reasonAlreadyUpdated"));
    };

    const openSupportEmail = (reason: string): void => {
        const body = t("testingMigration.supportEmailBody", { reason });
        const subject = t("testingMigration.supportEmailSubject");
        const message = `${subject}

${body}`;

        Share.share(
            {
                message,
                title: t("testingMigration.shareTitle"),
            },
            {
                dialogTitle: t("testingMigration.shareFallbackMessage"),
                subject,
            },
        ).catch((error: unknown) => {
            logger.withError(error).warn("failed to open sharing options for testing migration support");
            // Acknowledge-only: no cancelLabel renders a single OK button.
            void requestConfirm({
                title: t("testingMigration.shareTitle"),
                message: t("testingMigration.shareFailed"),
                confirmLabel: t("actions.ok"),
            });
        });
    };

    return (
        <YStack flex={1} bg={ds.colors.background} accessibilityViewIsModal>
            <StatusBar style={resolvedTheme === "light" ? "dark" : "light"} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                    bottomPadding: Math.max(insets.bottom + 28, 36),
                    gap: layout.isTablet ? 28 : 22,
                    maxWidth: layout.isTablet ? 640 : layout.contentMaxWidth,
                })}
            >
                <YStack minH={height - insets.top - insets.bottom - 40} justify="center" gap="$5">
                    <YStack
                        bg={ds.colors.surface}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        rounded={ds.radii.xl}
                        px={layout.isTablet ? "$6" : "$4"}
                        py={layout.isTablet ? "$6" : "$5"}
                        gap="$5"
                        style={{ boxShadow: ds.shadows.card }}
                        accessibilityRole="summary"
                        accessibilityLabel={t("testingMigration.noticeLabel")}
                    >
                        <YStack
                            width={64}
                            height={64}
                            rounded={ds.radii.full}
                            bg={ds.colors.primarySoft}
                            borderWidth={1}
                            borderColor={ds.colors.primary}
                            items="center"
                            justify="center"
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                        >
                            <ShieldCheck size={30} color={ds.colors.primary} />
                        </YStack>

                        <YStack gap="$3">
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.headingBold}
                                fontSize={
                                    layout.isTablet
                                        ? ds.typography.displayMd.fontSize
                                        : ds.typography.displaySm.fontSize
                                }
                                lineHeight={
                                    layout.isTablet
                                        ? ds.typography.displayMd.lineHeight
                                        : ds.typography.displaySm.lineHeight
                                }
                                accessibilityRole="header"
                            >
                                {t("testingMigration.title")}
                            </Text>
                            <YStack gap="$3">
                                <Paragraph
                                    color={ds.colors.secondaryForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={
                                        layout.isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize
                                    }
                                    lineHeight={layout.isTablet ? 24 : 22}
                                >
                                    {t("testingMigration.bodyPrimary")}
                                </Paragraph>
                                <Paragraph
                                    color={ds.colors.secondaryForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={
                                        layout.isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize
                                    }
                                    lineHeight={layout.isTablet ? 24 : 22}
                                >
                                    {t("testingMigration.bodySecondary")}
                                </Paragraph>
                            </YStack>
                        </YStack>

                        <YStack gap="$3">
                            <Button
                                height={56}
                                rounded={ds.radii.md}
                                borderWidth={0}
                                bg={ds.colors.primary}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={handlePrimaryPress}
                                accessibilityRole="button"
                                accessibilityLabel={t("testingMigration.primaryCta")}
                                accessibilityHint={t("testingMigration.primaryHint")}
                                style={{ boxShadow: ds.shadows.accent }}
                            >
                                <XStack items="center" gap="$2">
                                    <Text
                                        color={ds.colors.primaryForeground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelLg.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.4}
                                    >
                                        {t("testingMigration.primaryCta")}
                                    </Text>
                                    <ExternalLink size={16} color={ds.colors.primaryForeground} />
                                </XStack>
                            </Button>

                            <Button
                                height={52}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={ds.colors.input}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={handleSecondaryPress}
                                accessibilityRole="button"
                                accessibilityLabel={t("testingMigration.secondaryCta")}
                                accessibilityHint={t("testingMigration.secondaryHint")}
                            >
                                <XStack items="center" gap="$2">
                                    <CheckCircle2 size={16} color={ds.colors.foreground} />
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelMd.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.3}
                                    >
                                        {t("testingMigration.secondaryCta")}
                                    </Text>
                                    <ArrowRight size={16} color={ds.colors.foreground} />
                                </XStack>
                            </Button>
                        </YStack>

                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                            lineHeight={ds.typography.bodySm.lineHeight}
                            text="center"
                        >
                            {t("testingMigration.supportText")}
                        </Paragraph>
                    </YStack>
                </YStack>
            </ScrollView>
        </YStack>
    );
}
