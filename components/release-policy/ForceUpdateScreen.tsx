import { ExternalLink, RefreshCw, ShieldAlert } from "@tamagui/lucide-icons-2";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";

import { AppButton, buttonForegroundColor } from "components/ui/app-button";
import { AppLoader } from "components/ui/app-loader";
import { useConfirm } from "components/ui/confirm-dialog";
import { useDesignSystem } from "lib/design-system";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import type { ReleasePolicyDecision } from "lib/release-policy-core";

interface ForceUpdateScreenProps {
    readonly decision: ReleasePolicyDecision;
    readonly onRetry: () => void;
}

export function ForceUpdateScreen({ decision, onRetry }: ForceUpdateScreenProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("common");
    const layout = useResponsiveLayout();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const primaryForeground = buttonForegroundColor("primary", ds.colors);
    const requestConfirm = useConfirm();

    const handleOpenUpdate = (): void => {
        WebBrowser.openBrowserAsync(decision.updateUrl).catch(() => {
            // Acknowledge-only: no cancelLabel renders a single OK button.
            void requestConfirm({
                title: t("forceUpdate.alertTitle"),
                message: t("forceUpdate.alertBody"),
                confirmLabel: t("actions.ok"),
            });
        });
    };

    return (
        <YStack flex={1} bg={ds.colors.background} accessibilityViewIsModal>
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
                        accessibilityRole="alert"
                    >
                        <YStack
                            width={64}
                            height={64}
                            rounded={ds.radii.full}
                            bg={ds.colors.dangerSoft}
                            borderWidth={1}
                            borderColor={ds.colors.danger}
                            items="center"
                            justify="center"
                        >
                            <ShieldAlert size={30} color={ds.colors.danger} />
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
                                {t("forceUpdate.title")}
                            </Text>
                            <Paragraph
                                color={ds.colors.secondaryForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={
                                    layout.isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize
                                }
                                lineHeight={layout.isTablet ? 24 : 22}
                            >
                                {t("forceUpdate.body")}
                            </Paragraph>
                            <Paragraph
                                color={ds.colors.secondaryForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={
                                    layout.isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize
                                }
                                lineHeight={layout.isTablet ? 24 : 22}
                            >
                                {t("forceUpdate.latestVersion", { version: decision.latestVersion })}
                            </Paragraph>
                        </YStack>

                        <YStack gap="$3">
                            <AppButton
                                label={t("forceUpdate.primaryCta")}
                                variant="primary"
                                onPress={handleOpenUpdate}
                                iconRight={<ExternalLink size={18} color={primaryForeground} />}
                                accessibilityHint={t("forceUpdate.primaryHint")}
                            />
                            <Button chromeless onPress={onRetry} accessibilityLabel={t("forceUpdate.retryCta")}>
                                <XStack items="center" justify="center" gap="$2">
                                    <RefreshCw size={16} color={ds.colors.primary} />
                                    <Text color={ds.colors.primary} fontFamily={ds.fonts.bodySemiBold}>
                                        {t("forceUpdate.retryCta")}
                                    </Text>
                                </XStack>
                            </Button>
                        </YStack>
                    </YStack>
                </YStack>
            </ScrollView>
        </YStack>
    );
}

export function ReleasePolicyLoadingScreen() {
    const { t } = useTranslation("common");

    return <AppLoader message={t("forceUpdate.loading")} />;
}
