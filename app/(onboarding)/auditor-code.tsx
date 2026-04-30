import { useEffect, useState } from "react";
import { Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useAuthStore } from "stores/auth-store";
import { fetchMyAuditorProfile } from "lib/audit/profile-api";
import { createModuleLogger } from "lib/logger";

const logger = createModuleLogger("onboarding.auditor-code");

/**
 * Step 4 (final) of onboarding: reveals the auditor code and explains its purpose.
 */
export default function AuditorCodeScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation("onboarding");
    const session = useAuthStore((state) => state.session);

    const [auditorCode, setAuditorCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let isSubscribed = true;

        if (session === null) {
            setAuditorCode(null);
            setIsLoading(false);
            setErrorMessage(t("common.sessionExpired", "Session expired. Please sign in again."));
            return () => {
                isSubscribed = false;
            };
        }

        setIsLoading(true);
        setErrorMessage(null);

        void fetchMyAuditorProfile(session)
            .then((profile) => {
                if (!isSubscribed) {
                    return;
                }
                setAuditorCode(profile.auditor_code ?? null);
                setIsLoading(false);
            })
            .catch((error: Error) => {
                logger.error("Failed to fetch auditor profile", error.message);
                if (!isSubscribed) {
                    return;
                }
                setErrorMessage(
                    t(
                        "auditorCode.loadFailed",
                        "We could not load your auditor code. You can continue and find it later in settings.",
                    ),
                );
                setIsLoading(false);
            });

        return () => {
            isSubscribed = false;
        };
    }, [session, t]);

    const handleEnter = (): void => {
        router.replace("/(tabs)");
    };

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: layout.screenPaddingHorizontal,
                paddingVertical: layout.isTablet ? 64 : 32,
                justifyContent: "center",
                backgroundColor: ds.colors.background,
            }}
        >
            <YStack gap="$8" width="100%" style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}>
                <YStack items="center" gap="$4">
                    <Image
                        source={require("../../assets/images/icon.png")}
                        style={{ width: layout.isTablet ? 96 : 84, height: layout.isTablet ? 96 : 84 }}
                        resizeMode="contain"
                    />
                    <YStack items="center" gap="$2">
                        <Paragraph
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.4}
                            style={{ textAlign: "center" }}
                        >
                            {t("auditorCode.stepLabel", "Step 4 of 4")}
                        </Paragraph>
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={
                                layout.isTablet ? ds.typography.displayMd.fontSize : ds.typography.displaySm.fontSize
                            }
                            textTransform="uppercase"
                            fontStyle="italic"
                            letterSpacing={-0.5}
                            style={{ textAlign: "center" }}
                        >
                            {t("auditorCode.title")}
                        </Text>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            style={{ textAlign: "center" }}
                        >
                            {t("auditorCode.subtitle")}
                        </Paragraph>
                    </YStack>
                </YStack>

                <YStack
                    rounded={ds.radii.xl}
                    borderWidth={2}
                    borderColor={errorMessage === null ? ds.colors.primary : ds.colors.border}
                    bg={errorMessage === null ? ds.colors.primarySoft : ds.colors.surface}
                    p={layout.isTablet ? "$7" : "$6"}
                    items="center"
                    gap="$2"
                    style={{ boxShadow: errorMessage === null ? ds.shadows.accent : ds.shadows.card }}
                    accessibilityRole="text"
                >
                    <Paragraph
                        color={errorMessage === null ? ds.colors.primary : ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={2}
                    >
                        {t("auditorCode.codeLabel")}
                    </Paragraph>
                    {isLoading ? (
                        <YStack width={150} height={52} rounded={ds.radii.md} bg={ds.colors.border} opacity={0.55} />
                    ) : (
                        <Text
                            color={auditorCode !== null ? ds.colors.primary : ds.colors.mutedForeground}
                            fontFamily={ds.fonts.monoMedium}
                            fontSize={
                                layout.isTablet ? ds.typography.displayMd.fontSize : ds.typography.titleMd.fontSize
                            }
                            letterSpacing={1}
                            selectable
                        >
                            {auditorCode ?? "—"}
                        </Text>
                    )}
                </YStack>

                {errorMessage !== null ? <StatusMessage message={errorMessage} ds={ds} /> : null}

                <YStack
                    rounded={ds.radii.lg}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surface}
                    p="$4"
                    style={{ boxShadow: ds.shadows.card }}
                >
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                        lineHeight={ds.typography.bodyMd.lineHeight}
                    >
                        {t("auditorCode.explanation")}
                    </Paragraph>
                </YStack>

                <Button
                    height={56}
                    rounded={ds.radii.md}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    disabled={isLoading}
                    opacity={isLoading ? 0.65 : 1}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={handleEnter}
                    style={{ boxShadow: isLoading ? "none" : ds.shadows.accent }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isLoading, busy: isLoading }}
                >
                    <XStack items="center" gap="$2">
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelLg.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.4}
                        >
                            {isLoading ? t("auditorCode.loading", "Loading") : t("auditorCode.submit")}
                        </Text>
                        <ArrowRight size={16} color={ds.colors.primaryForeground} />
                    </XStack>
                </Button>
            </YStack>
        </ScrollView>
    );
}

interface StatusMessageProps {
    readonly message: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
}

function StatusMessage({ message, ds }: StatusMessageProps) {
    return (
        <YStack borderWidth={1} borderColor={ds.colors.danger} bg={ds.colors.dangerSoft} rounded={ds.radii.md} p="$3">
            <Paragraph color={ds.colors.danger} fontFamily={ds.fonts.bodyMedium}>
                {message}
            </Paragraph>
        </YStack>
    );
}
