import { useEffect, useState, type FC, type ReactNode } from "react";
import { ScrollView, TextStyle, type DimensionValue } from "react-native";
import { useRouter } from "expo-router";
import {
    Accessibility,
    Check,
    ChevronDown,
    Eye,
    Globe,
    Info,
    LogOut,
    Moon,
    Monitor,
    Sun,
    Type,
    User,
} from "@tamagui/lucide-icons";
import type { IconProps } from "@tamagui/helpers-icon";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Separator, Slider, Text, XStack, YStack } from "tamagui";
import { useDesignSystem, type DesignSystemTheme } from "lib/design-system";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import {
    fetchMyAccount,
    fetchMyAuditorProfile,
    type MyAccount,
    type MyAuditorProfile,
} from "lib/audit/profile-api";
import { useAuthStore } from "stores/auth-store";
import {
    usePreferencesStore,
    type LanguagePreference,
    type ThemeMode,
} from "stores/preferences-store";

const THEME_OPTIONS: readonly { key: ThemeMode; Icon: FC<IconProps> }[] = [
    { key: "system", Icon: Monitor },
    { key: "light", Icon: Sun },
    { key: "dark", Icon: Moon },
];

const LANGUAGE_OPTIONS: readonly {
    key: LanguagePreference;
    translationKey: "system" | "english" | "german" | "french" | "japanese" | "hindi";
}[] = [
    { key: "system", translationKey: "system" },
    { key: "en", translationKey: "english" },
    { key: "de", translationKey: "german" },
    { key: "fr", translationKey: "french" },
    { key: "ja", translationKey: "japanese" },
    { key: "hi", translationKey: "hindi" },
];

type ResolvedAppLanguage = Exclude<LanguagePreference, "system">;

/**
 * Resolve the active i18n language tag to one of the app's explicit language codes.
 *
 * @param languageTag Current i18n language tag.
 * @returns Supported concrete app language.
 */
function resolveAppLanguage(languageTag: string | undefined): ResolvedAppLanguage {
    const normalizedLanguage = typeof languageTag === "string" ? languageTag.toLowerCase() : "";

    if (normalizedLanguage.startsWith("de")) {
        return "de";
    }

    if (normalizedLanguage.startsWith("fr")) {
        return "fr";
    }

    if (normalizedLanguage.startsWith("ja")) {
        return "ja";
    }

    if (normalizedLanguage.startsWith("hi")) {
        return "hi";
    }

    return "en";
}

/**
 * Settings tab with read-only profile, appearance, accessibility, and about.
 *
 * Profile editing is deferred until the authentication and manager dashboard
 * flows are designed.
 */
export default function SettingsScreen() {
    const ds = useDesignSystem();
    const router = useRouter();
    const { t, i18n } = useTranslation(["settings", "common"]);
    const instrument = useLocalizedInstrument();
    const session = useAuthStore((state) => state.session);
    const logout = useAuthStore((state) => state.logout);

    const themeMode = usePreferencesStore((state) => state.themeMode);
    const setThemeMode = usePreferencesStore((state) => state.setThemeMode);
    const languagePreference = usePreferencesStore((state) => state.languagePreference);
    const setLanguagePreference = usePreferencesStore((state) => state.setLanguagePreference);
    const fontScale = usePreferencesStore((state) => state.fontScale);
    const setFontScale = usePreferencesStore((state) => state.setFontScale);
    const highContrast = usePreferencesStore((state) => state.highContrast);
    const setHighContrast = usePreferencesStore((state) => state.setHighContrast);
    const dyslexicFont = usePreferencesStore((state) => state.dyslexicFont);
    const setDyslexicFont = usePreferencesStore((state) => state.setDyslexicFont);

    const [account, setAccount] = useState<MyAccount | null>(null);
    const [profile, setProfile] = useState<MyAuditorProfile | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

    useEffect(() => {
        if (session === null) {
            setAccount(null);
            setProfile(null);
            setIsLoading(false);
            return;
        }

        let isSubscribed = true;

        setIsLoading(true);
        setAccount(null);
        setProfile(null);

        void Promise.allSettled([fetchMyAccount(session), fetchMyAuditorProfile(session)]).then(
            (results) => {
                if (!isSubscribed) {
                    return;
                }

                const [accountResult, profileResult] = results;

                setAccount(accountResult.status === "fulfilled" ? accountResult.value : null);
                setProfile(profileResult.status === "fulfilled" ? profileResult.value : null);
                setIsLoading(false);
            },
        );

        return () => {
            isSubscribed = false;
        };
    }, [session]);

    const userName = account?.name ?? session?.user.name ?? "—";
    const userEmail = account?.email ?? session?.user.email ?? "—";
    const accountType = session === null ? "—" : t("accountTypes.auditor", { ns: "common" });
    const activeLanguage = resolveAppLanguage(i18n.resolvedLanguage ?? i18n.language);
    const getLanguageOptionLabel = (preference: LanguagePreference): string => {
        const matchingOption = LANGUAGE_OPTIONS.find((option) => option.key === preference);

        if (matchingOption === undefined) {
            return t("language.english", { ns: "settings" });
        }

        return t(`language.${matchingOption.translationKey}`, { ns: "settings" });
    };
    const selectedLanguageLabel = getLanguageOptionLabel(languagePreference);

    if (isLoading) {
        return <SettingsSkeletonScreen ds={ds} />;
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: ds.spacing.screenPaddingHorizontal,
                paddingTop: ds.spacing.screenPaddingVertical,
                paddingBottom: 92,
                gap: 24,
            }}
        >
            <YStack gap="$2">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={ds.typography.displayMd.fontSize}
                    lineHeight={ds.typography.displayMd.lineHeight}
                >
                    {t("title", { ns: "settings" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {t("subtitle", { ns: "settings" })}
                </Paragraph>
            </YStack>

            {/* Profile Card (read-only) */}
            <SettingsCard ds={ds} label={t("profile.label", { ns: "settings" })} Icon={User}>
                <ProfileRow
                    ds={ds}
                    label={t("profile.name", { ns: "settings" })}
                    value={userName}
                />
                <Separator borderColor={ds.colors.border} />
                <ProfileRow
                    ds={ds}
                    label={t("profile.email", { ns: "settings" })}
                    value={userEmail}
                />
                <Separator borderColor={ds.colors.border} />
                <ProfileRow
                    ds={ds}
                    label={t("profile.accountType", { ns: "settings" })}
                    value={accountType}
                />

                {profile === null ? null : (
                    <>
                        <Separator borderColor={ds.colors.border} />
                        <ProfileRow
                            ds={ds}
                            label={t("profile.auditorCode", { ns: "settings" })}
                            value={profile.auditor_code}
                        />
                        {profile.role === null ? null : (
                            <>
                                <Separator borderColor={ds.colors.border} />
                                <ProfileRow
                                    ds={ds}
                                    label={t("profile.role", { ns: "settings" })}
                                    value={profile.role}
                                    textTransform="capitalize"
                                />
                            </>
                        )}
                        {profile.country === null ? null : (
                            <>
                                <Separator borderColor={ds.colors.border} />
                                <ProfileRow
                                    ds={ds}
                                    label={t("profile.country", { ns: "settings" })}
                                    value={profile.country}
                                    textTransform="capitalize"
                                />
                            </>
                        )}
                    </>
                )}

                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {t("profile.editingComingSoon", { ns: "settings" })}
                </Paragraph>

                <Button
                    height={46}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.danger}
                    bg={ds.colors.dangerSoft}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        logout()
                            .then(() => {
                                router.replace("/(auth)/login");
                            })
                            .catch(() => undefined);
                    }}
                >
                    <XStack items="center" gap="$2">
                        <LogOut size={14} color={ds.colors.danger} />
                        <Text
                            color={ds.colors.danger}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelLg.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {t("actions.signOut", { ns: "common" })}
                        </Text>
                    </XStack>
                </Button>
            </SettingsCard>

            {/* Appearance Card */}
            <SettingsCard ds={ds} label={t("appearance.label", { ns: "settings" })} Icon={Sun}>
                <YStack gap="$1.5">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleMd.fontSize}
                    >
                        {t("appearance.theme", { ns: "settings" })}
                    </Text>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {t("appearance.themeDescription", { ns: "settings" })}
                    </Paragraph>
                </YStack>
                <XStack gap="$2">
                    {THEME_OPTIONS.map((option) => {
                        const isSelected = themeMode === option.key;
                        const OptionIcon = option.Icon;
                        return (
                            <Button
                                key={option.key}
                                flex={1}
                                height={56}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                                bg={isSelected ? ds.colors.primarySoft : ds.colors.input}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => setThemeMode(option.key)}
                            >
                                <YStack items="center" gap="$1">
                                    <OptionIcon
                                        size={18}
                                        color={
                                            isSelected
                                                ? ds.colors.primary
                                                : ds.colors.mutedForeground
                                        }
                                    />
                                    <Text
                                        color={
                                            isSelected ? ds.colors.primary : ds.colors.foreground
                                        }
                                        fontFamily={
                                            isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium
                                        }
                                        fontSize={ds.typography.bodySm.fontSize}
                                    >
                                        {t(`appearance.${option.key}`, { ns: "settings" })}
                                    </Text>
                                </YStack>
                            </Button>
                        );
                    })}
                </XStack>
            </SettingsCard>

            {/* Accessibility Card */}
            <SettingsCard
                ds={ds}
                label={t("accessibility.label", { ns: "settings" })}
                Icon={Accessibility}
            >
                <YStack gap="$4">
                    <XStack items="center" gap="$2">
                        <Type size={14} color={ds.colors.primary} />
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyMd.fontSize}
                        >
                            {t("accessibility.fontScaleValue", {
                                ns: "settings",
                                value: fontScale.toFixed(2),
                            })}
                        </Text>
                    </XStack>
                    <Slider
                        value={[fontScale]}
                        min={0.85}
                        max={1.3}
                        step={0.05}
                        onValueChange={(values: number[]) => {
                            const nextValue = values[0];
                            if (typeof nextValue === "number") {
                                setFontScale(nextValue);
                            }
                        }}
                    >
                        <Slider.Track bg={ds.colors.border}>
                            <Slider.TrackActive bg={ds.colors.primary} />
                        </Slider.Track>
                        <Slider.Thumb index={0} size="$1" bg={ds.colors.primary} circular />
                    </Slider>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {t("accessibility.fontScaleDescription", { ns: "settings" })}
                    </Paragraph>
                </YStack>

                <Separator borderColor={ds.colors.border} />

                <ToggleRow
                    ds={ds}
                    label={t("accessibility.highContrast", { ns: "settings" })}
                    description={t("accessibility.highContrastDescription", { ns: "settings" })}
                    icon={Eye}
                    isEnabled={highContrast}
                    onToggle={() => setHighContrast(!highContrast)}
                />

                <Separator borderColor={ds.colors.border} />

                <ToggleRow
                    ds={ds}
                    label={t("accessibility.dyslexicFont", { ns: "settings" })}
                    description={t("accessibility.dyslexicFontDescription", { ns: "settings" })}
                    icon={Type}
                    isEnabled={dyslexicFont}
                    onToggle={() => setDyslexicFont(!dyslexicFont)}
                />
            </SettingsCard>

            {/* Language Card */}
            <SettingsCard ds={ds} label={t("language.label", { ns: "settings" })} Icon={Globe}>
                <YStack gap="$1.5">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleMd.fontSize}
                    >
                        {t("language.selection", { ns: "settings" })}
                    </Text>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {t("language.description", { ns: "settings" })}
                    </Paragraph>
                </YStack>
                <Button
                    width="100%"
                    height={52}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={isLanguageMenuOpen ? ds.colors.primary : ds.colors.border}
                    bg={isLanguageMenuOpen ? ds.colors.primarySoft : ds.colors.input}
                    px="$3.5"
                    justify="space-between"
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        setIsLanguageMenuOpen((currentValue) => !currentValue);
                    }}
                >
                    <Text
                        color={isLanguageMenuOpen ? ds.colors.primary : ds.colors.foreground}
                        fontFamily={isLanguageMenuOpen ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {selectedLanguageLabel}
                    </Text>
                    <ChevronDown
                        size={16}
                        color={isLanguageMenuOpen ? ds.colors.primary : ds.colors.mutedForeground}
                    />
                </Button>

                {isLanguageMenuOpen ? (
                    <YStack
                        width="100%"
                        rounded={ds.radii.md}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surface}
                        p="$1"
                        gap="$1"
                        style={{ boxShadow: ds.shadows.card }}
                    >
                        {LANGUAGE_OPTIONS.map((option) => {
                            const isSelected = languagePreference === option.key;

                            return (
                                <Button
                                    key={option.key}
                                    justify="space-between"
                                    height={46}
                                    rounded={ds.radii.md}
                                    borderWidth={1}
                                    borderColor={isSelected ? ds.colors.primary : "transparent"}
                                    bg={isSelected ? ds.colors.primarySoft : "transparent"}
                                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                    onPress={() => {
                                        setLanguagePreference(option.key);
                                        setIsLanguageMenuOpen(false);
                                    }}
                                >
                                    <Text
                                        color={
                                            isSelected ? ds.colors.primary : ds.colors.foreground
                                        }
                                        fontFamily={
                                            isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium
                                        }
                                        fontSize={ds.typography.bodyMd.fontSize}
                                    >
                                        {getLanguageOptionLabel(option.key)}
                                    </Text>
                                    {isSelected ? (
                                        <Check size={16} color={ds.colors.primary} />
                                    ) : (
                                        <YStack width={16} height={16} />
                                    )}
                                </Button>
                            );
                        })}
                    </YStack>
                ) : null}
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {t("language.currentValue", {
                        ns: "settings",
                        value: t(
                            activeLanguage === "de"
                                ? "language.german"
                                : activeLanguage === "fr"
                                  ? "language.french"
                                  : activeLanguage === "ja"
                                    ? "language.japanese"
                                    : activeLanguage === "hi"
                                      ? "language.hindi"
                                      : "language.english",
                            {
                                ns: "settings",
                            },
                        ),
                    })}
                </Paragraph>
            </SettingsCard>

            {/* About Card */}
            <SettingsCard ds={ds} label={t("about.label", { ns: "settings" })} Icon={Info}>
                <ProfileRow
                    ds={ds}
                    label={t("about.instrument", { ns: "settings" })}
                    value={instrument.instrument_name}
                />
                <Separator borderColor={ds.colors.border} />
                <ProfileRow
                    ds={ds}
                    label={t("about.version", { ns: "settings" })}
                    value={`v${instrument.instrument_version}`}
                />
                <Separator borderColor={ds.colors.border} />
                <ProfileRow
                    ds={ds}
                    label={t("about.app", { ns: "settings" })}
                    value={t("about.appName", { ns: "settings" })}
                />
            </SettingsCard>
        </ScrollView>
    );
}

interface SettingsSkeletonScreenProps {
    readonly ds: DesignSystemTheme;
}

/**
 * Skeleton version of the settings screen shown while profile data loads.
 */
function SettingsSkeletonScreen({ ds }: SettingsSkeletonScreenProps) {
    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: ds.spacing.screenPaddingHorizontal,
                paddingTop: ds.spacing.screenPaddingVertical,
                paddingBottom: 92,
                gap: 24,
            }}
        >
            <YStack gap="$2">
                <SkeletonBlock ds={ds} width="42%" height={34} rounded={ds.radii.sm} />
                <SkeletonBlock ds={ds} width="68%" height={18} rounded={ds.radii.sm} />
            </YStack>

            <SettingsCardSkeleton ds={ds} labelWidth="26%">
                <ProfileSkeletonRow ds={ds} labelWidth="26%" valueWidth="38%" />
                <Separator borderColor={ds.colors.border} />
                <ProfileSkeletonRow ds={ds} labelWidth="24%" valueWidth="46%" />
                <Separator borderColor={ds.colors.border} />
                <ProfileSkeletonRow ds={ds} labelWidth="32%" valueWidth="34%" />
                <Separator borderColor={ds.colors.border} />
                <ProfileSkeletonRow ds={ds} labelWidth="30%" valueWidth="28%" />
                <SkeletonBlock ds={ds} width="78%" height={16} rounded={ds.radii.sm} />
                <SkeletonBlock ds={ds} width="100%" height={46} />
            </SettingsCardSkeleton>

            <SettingsCardSkeleton ds={ds} labelWidth="34%">
                <YStack gap="$1.5">
                    <SkeletonBlock ds={ds} width="34%" height={20} rounded={ds.radii.sm} />
                    <SkeletonBlock ds={ds} width="72%" height={16} rounded={ds.radii.sm} />
                </YStack>
                <XStack gap="$2">
                    <SkeletonBlock ds={ds} flex={1} height={56} />
                    <SkeletonBlock ds={ds} flex={1} height={56} />
                    <SkeletonBlock ds={ds} flex={1} height={56} />
                </XStack>
            </SettingsCardSkeleton>

            <SettingsCardSkeleton ds={ds} labelWidth="28%">
                <YStack gap="$1.5">
                    <SkeletonBlock ds={ds} width="38%" height={20} rounded={ds.radii.sm} />
                    <SkeletonBlock ds={ds} width="70%" height={16} rounded={ds.radii.sm} />
                </YStack>
                <SkeletonBlock ds={ds} width="100%" height={52} />
                <SkeletonBlock ds={ds} width="58%" height={16} rounded={ds.radii.sm} />
            </SettingsCardSkeleton>
        </ScrollView>
    );
}

interface SettingsCardSkeletonProps {
    readonly ds: DesignSystemTheme;
    readonly labelWidth: DimensionValue;
    readonly children: ReactNode;
}

/**
 * Placeholder card wrapper that mirrors the spacing of a real settings card.
 */
function SettingsCardSkeleton({ ds, labelWidth, children }: SettingsCardSkeletonProps) {
    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p="$4"
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            <XStack items="center" gap="$2">
                <SkeletonBlock ds={ds} width={16} height={16} rounded={ds.radii.full} />
                <SkeletonBlock ds={ds} width={labelWidth} height={12} rounded={ds.radii.sm} />
            </XStack>
            {children}
        </YStack>
    );
}

interface SkeletonBlockProps {
    readonly ds: DesignSystemTheme;
    readonly height: number;
    readonly width?: DimensionValue;
    readonly flex?: number;
    readonly rounded?: number;
}

/**
 * Small reusable placeholder block used across the loading skeleton.
 */
function SkeletonBlock({ ds, height, width, flex, rounded }: SkeletonBlockProps) {
    return (
        <YStack
            height={height}
            flex={flex}
            rounded={rounded ?? ds.radii.md}
            bg={ds.colors.surfaceMuted}
            borderWidth={1}
            borderColor={ds.colors.border}
            opacity={0.9}
            style={{ width }}
        />
    );
}

interface ProfileSkeletonRowProps {
    readonly ds: DesignSystemTheme;
    readonly labelWidth: DimensionValue;
    readonly valueWidth: DimensionValue;
}

/**
 * Placeholder row matching the read-only profile and about sections.
 */
function ProfileSkeletonRow({ ds, labelWidth, valueWidth }: ProfileSkeletonRowProps) {
    return (
        <XStack justify="space-between" items="center" py="$1.5">
            <SkeletonBlock ds={ds} width={labelWidth} height={16} rounded={ds.radii.sm} />
            <SkeletonBlock ds={ds} width={valueWidth} height={16} rounded={ds.radii.sm} />
        </XStack>
    );
}

interface SettingsCardProps {
    readonly ds: DesignSystemTheme;
    readonly label: string;
    readonly Icon: FC<IconProps>;
    readonly children: ReactNode;
}

/**
 * Reusable settings section card with a header label and icon.
 */
function SettingsCard({ ds, label, Icon, children }: SettingsCardProps) {
    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p="$4"
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            <XStack items="center" gap="$2">
                <Icon size={16} color={ds.colors.primary} />
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {label}
                </Text>
            </XStack>
            {children}
        </YStack>
    );
}

interface ProfileRowProps {
    readonly ds: DesignSystemTheme;
    readonly label: string;
    readonly value: string;
    readonly textTransform?: TextStyle["textTransform"];
}

/**
 * Compact label/value row for read-only profile display.
 */
function ProfileRow({ ds, label, value, textTransform }: ProfileRowProps) {
    return (
        <XStack justify="space-between" items="center" py="$1.5" flex={1}>
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                flex={1}
            >
                {label}
            </Text>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodySemiBold}
                fontSize={ds.typography.bodyMd.fontSize}
                numberOfLines={1}
                overflow="hidden"
                flex={1}
                textTransform={textTransform}
            >
                {value}
            </Text>
        </XStack>
    );
}

interface ToggleRowProps {
    readonly ds: DesignSystemTheme;
    readonly label: string;
    readonly description: string;
    readonly icon: FC<IconProps>;
    readonly isEnabled: boolean;
    readonly onToggle: () => void;
}

/**
 * Toggle switch row for boolean accessibility preferences.
 */
function ToggleRow({
    ds,
    label,
    description,
    icon: ToggleIcon,
    isEnabled,
    onToggle,
}: ToggleRowProps) {
    const { t } = useTranslation("common");
    return (
        <YStack gap="$1.5">
            <XStack justify="space-between" items="center">
                <XStack items="center" gap="$2" flex={1}>
                    <ToggleIcon size={14} color={ds.colors.primary} />
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyMd.fontSize}
                    >
                        {label}
                    </Text>
                </XStack>
                <Button
                    height={32}
                    px="$3"
                    rounded={ds.radii.full}
                    borderWidth={1}
                    borderColor={isEnabled ? ds.colors.primary : ds.colors.border}
                    bg={isEnabled ? ds.colors.primarySoft : ds.colors.input}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={onToggle}
                >
                    <Text
                        color={isEnabled ? ds.colors.primary : ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                    >
                        {isEnabled ? t("status.on") : t("status.off")}
                    </Text>
                </Button>
            </XStack>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodySm.fontSize}
            >
                {description}
            </Paragraph>
        </YStack>
    );
}
