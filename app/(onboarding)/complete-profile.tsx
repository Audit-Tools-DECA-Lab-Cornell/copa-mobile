import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ChevronDown, UserCircle2 } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, type ColorTokens, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { OnboardingShell } from "components/onboarding/onboarding-shell";
import { useAuthStore } from "stores/auth-store";
import { updateMyAuditorProfile } from "lib/audit/profile-api";
import { createModuleLogger } from "lib/logger";

const logger = createModuleLogger("onboarding.complete-profile");

interface SelectOption {
    readonly value: string;
    readonly labelKey: string;
}

const GENDER_OPTIONS: readonly SelectOption[] = [
    { value: "male", labelKey: "genderOptions.male" },
    { value: "female", labelKey: "genderOptions.female" },
    { value: "non-binary", labelKey: "genderOptions.nonBinary" },
    { value: "prefer-not-to-say", labelKey: "genderOptions.preferNotToSay" },
    { value: "other", labelKey: "genderOptions.other" },
];

const AGE_RANGE_OPTIONS: readonly SelectOption[] = [
    { value: "under-18", labelKey: "ageRangeOptions.under18" },
    { value: "18-24", labelKey: "ageRangeOptions.18to24" },
    { value: "25-34", labelKey: "ageRangeOptions.25to34" },
    { value: "35-44", labelKey: "ageRangeOptions.35to44" },
    { value: "45-54", labelKey: "ageRangeOptions.45to54" },
    { value: "55-64", labelKey: "ageRangeOptions.55to64" },
    { value: "65+", labelKey: "ageRangeOptions.65plus" },
];

function isValidOptionalEmail(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function getOptionLabel(
    value: string | null,
    options: readonly SelectOption[],
    keyPrefix: string,
    placeholder: string,
    t: (key: string) => string,
): string {
    if (value === null) {
        return placeholder;
    }

    const option = options.find((item) => item.value === value);
    return option !== undefined ? t(`${keyPrefix}${option.labelKey}`) : value;
}

/**
 * Step 2 of onboarding: the auditor fills out their profile.
 */
export default function CompleteProfileScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["onboarding", "common"]);
    const session = useAuthStore((state) => state.session);

    const [fullName, setFullName] = useState<string>(session?.user.name ?? "");
    const [phone, setPhone] = useState<string>("");
    const [email, setEmail] = useState<string>(session?.user.email ?? "");
    const [gender, setGender] = useState<string | null>(null);
    const [ageRange, setAgeRange] = useState<string | null>(null);
    const [city, setCity] = useState<string>("");
    const [province, setProvince] = useState<string>("");
    const [country, setCountry] = useState<string>("");
    const [role, setRole] = useState<string>("");
    const [isGenderOpen, setIsGenderOpen] = useState<boolean>(false);
    const [isAgeRangeOpen, setIsAgeRangeOpen] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const isEmailValid = useMemo(() => isValidOptionalEmail(email), [email]);
    const canSubmit = !isLoading && fullName.trim().length > 0 && isEmailValid;

    const closeDropdowns = (): void => {
        setIsGenderOpen(false);
        setIsAgeRangeOpen(false);
    };

    const handleSubmit = async (): Promise<void> => {
        if (isLoading) {
            return;
        }

        setErrorMessage(null);

        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim();

        if (trimmedName.length === 0) {
            setErrorMessage(t("completeProfile.validation.fullNameRequired"));
            return;
        }
        if (!isValidOptionalEmail(trimmedEmail)) {
            setErrorMessage(t("completeProfile.validation.invalidEmail", "Enter a valid email address."));
            return;
        }
        if (session === null) {
            setErrorMessage(t("sessionExpired", { ns: "common" }));
            return;
        }

        setIsLoading(true);
        try {
            await updateMyAuditorProfile(session, {
                full_name: trimmedName,
                phone: phone.trim() || undefined,
                email: trimmedEmail || undefined,
                gender: gender ?? undefined,
                age_range: ageRange ?? undefined,
                city: city.trim() || undefined,
                province: province.trim() || undefined,
                country: country.trim() || undefined,
                role: role.trim() || undefined,
            });
            router.replace("/(onboarding)/accept-terms");
        } catch (error) {
            logger.error("Failed to save profile", error instanceof Error ? error.message : String(error));
            setErrorMessage(t("completeProfile.validation.saveFailed", "Failed to save profile. Please try again."));
        } finally {
            setIsLoading(false);
        }
    };

    const genderLabel = getOptionLabel(
        gender,
        GENDER_OPTIONS,
        "completeProfile.",
        t("completeProfile.genderPlaceholder"),
        t,
    );
    const ageRangeLabel = getOptionLabel(
        ageRange,
        AGE_RANGE_OPTIONS,
        "completeProfile.",
        t("completeProfile.ageRangePlaceholder"),
        t,
    );

    return (
        <OnboardingShell
            step={2}
            totalSteps={4}
            icon={UserCircle2}
            eyebrow={t("completeProfile.stepLabel", "Step 2 of 4")}
            title={t("completeProfile.title", "Complete your profile")}
            subtitle={t(
                "completeProfile.headerSubtitle",
                "Your details help your manager find you and tailor assignments.",
            )}
            ctaLabel={t("completeProfile.submit", "Save and continue")}
            ctaLoadingLabel={t("completeProfile.submitting", "Saving...")}
            canSubmit={canSubmit}
            isLoading={isLoading}
            onCtaPress={() => {
                void handleSubmit();
            }}
            errorMessage={errorMessage}
            helperText={t(
                "completeProfile.helperText",
                "Only your full name is required - everything else is optional.",
            )}
            avoidKeyboard
        >
            <ProfileSection title={t("completeProfile.sectionContact", "Contact details")} ds={ds}>
                <ProfileField label={t("completeProfile.fullNameLabel")} required ds={ds}>
                    <StyledInput
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                        textContentType="name"
                        placeholder={t("completeProfile.fullNamePlaceholder")}
                        ds={ds}
                        onFocus={closeDropdowns}
                    />
                </ProfileField>

                <XStack gap="$3" style={{ flexDirection: layout.isTablet ? "row" : "column" }}>
                    <ProfileField label={t("completeProfile.phoneLabel")} ds={ds} style={{ flex: 1 }}>
                        <StyledInput
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            textContentType="telephoneNumber"
                            placeholder={t("completeProfile.phonePlaceholder")}
                            ds={ds}
                            onFocus={closeDropdowns}
                        />
                    </ProfileField>

                    <ProfileField label={t("completeProfile.emailLabel")} ds={ds} style={{ flex: 1 }}>
                        <StyledInput
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            textContentType="emailAddress"
                            placeholder={t("completeProfile.emailPlaceholder")}
                            ds={ds}
                            onFocus={closeDropdowns}
                        />
                    </ProfileField>
                </XStack>

                {email.trim().length > 0 && !isEmailValid ? (
                    <Paragraph
                        color={ds.colors.danger}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                        px="$1"
                    >
                        {t("completeProfile.validation.invalidEmail", "Enter a valid email address.")}
                    </Paragraph>
                ) : null}
            </ProfileSection>

            <ProfileSection title={t("completeProfile.sectionDemographics", "About you")} ds={ds}>
                <XStack gap="$3" style={{ flexDirection: layout.isTablet ? "row" : "column" }}>
                    <ProfileField label={t("completeProfile.genderLabel")} ds={ds} style={{ flex: 1 }}>
                        <SelectButton
                            label={genderLabel}
                            isOpen={isGenderOpen}
                            hasValue={gender !== null}
                            ds={ds}
                            onPress={() => {
                                setIsGenderOpen((value) => !value);
                                setIsAgeRangeOpen(false);
                            }}
                        />
                        {isGenderOpen ? (
                            <DropdownList
                                options={GENDER_OPTIONS}
                                onSelect={(value) => {
                                    setGender(value);
                                    setIsGenderOpen(false);
                                }}
                                selectedValue={gender}
                                keyPrefix="completeProfile."
                                ds={ds}
                                isTablet={layout.isTablet}
                                t={t}
                            />
                        ) : null}
                    </ProfileField>

                    <ProfileField label={t("completeProfile.ageRangeLabel")} ds={ds} style={{ flex: 1 }}>
                        <SelectButton
                            label={ageRangeLabel}
                            isOpen={isAgeRangeOpen}
                            hasValue={ageRange !== null}
                            ds={ds}
                            onPress={() => {
                                setIsAgeRangeOpen((value) => !value);
                                setIsGenderOpen(false);
                            }}
                        />
                        {isAgeRangeOpen ? (
                            <DropdownList
                                options={AGE_RANGE_OPTIONS}
                                onSelect={(value) => {
                                    setAgeRange(value);
                                    setIsAgeRangeOpen(false);
                                }}
                                selectedValue={ageRange}
                                keyPrefix="completeProfile."
                                ds={ds}
                                isTablet={layout.isTablet}
                                t={t}
                            />
                        ) : null}
                    </ProfileField>
                </XStack>
            </ProfileSection>

            <ProfileSection title={t("completeProfile.sectionLocation", "Where you work")} ds={ds}>
                <XStack gap="$3" style={{ flexDirection: layout.isTablet ? "row" : "column" }}>
                    <ProfileField label={t("completeProfile.cityLabel")} ds={ds} style={{ flex: 1 }}>
                        <StyledInput
                            value={city}
                            onChangeText={setCity}
                            autoCapitalize="words"
                            placeholder={t("completeProfile.cityPlaceholder")}
                            ds={ds}
                            onFocus={closeDropdowns}
                        />
                    </ProfileField>

                    <ProfileField label={t("completeProfile.provinceLabel")} ds={ds} style={{ flex: 1 }}>
                        <StyledInput
                            value={province}
                            onChangeText={setProvince}
                            autoCapitalize="words"
                            placeholder={t("completeProfile.provincePlaceholder")}
                            ds={ds}
                            onFocus={closeDropdowns}
                        />
                    </ProfileField>
                </XStack>

                <XStack gap="$3" style={{ flexDirection: layout.isTablet ? "row" : "column" }}>
                    <ProfileField label={t("completeProfile.countryLabel")} ds={ds} style={{ flex: 1 }}>
                        <StyledInput
                            value={country}
                            onChangeText={setCountry}
                            autoCapitalize="words"
                            textContentType="countryName"
                            placeholder={t("completeProfile.countryPlaceholder")}
                            ds={ds}
                            onFocus={closeDropdowns}
                        />
                    </ProfileField>

                    <ProfileField label={t("completeProfile.roleLabel")} ds={ds} style={{ flex: 1 }}>
                        <StyledInput
                            value={role}
                            onChangeText={setRole}
                            autoCapitalize="words"
                            placeholder={t("completeProfile.rolePlaceholder")}
                            ds={ds}
                            onFocus={closeDropdowns}
                        />
                    </ProfileField>
                </XStack>
            </ProfileSection>
        </OnboardingShell>
    );
}

interface ProfileSectionProps {
    readonly title: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly children: ReactNode;
}

/**
 * Logical grouping for related profile fields.  Renders a small uppercase
 * eyebrow plus a card-like surface to give each section visual weight.
 */
function ProfileSection({ title, ds, children }: ProfileSectionProps) {
    return (
        <YStack gap="$3">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelMd.fontSize}
                textTransform="uppercase"
                letterSpacing={1.5}
                px="$1"
            >
                {title}
            </Paragraph>
            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$4"
                style={{ boxShadow: ds.shadows.card }}
            >
                {children}
            </YStack>
        </YStack>
    );
}

interface ProfileFieldProps {
    readonly label: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly children: ReactNode;
    readonly required?: boolean;
    readonly style?: { readonly flex?: number };
}

function ProfileField({ label, ds, children, required = false, style }: ProfileFieldProps) {
    return (
        <YStack gap="$2" style={style}>
            <XStack items="center" gap="$1" px="$1">
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.5}
                >
                    {label}
                </Paragraph>
                {required ? (
                    <Paragraph color={ds.colors.primary} fontFamily={ds.fonts.bodyBold}>
                        *
                    </Paragraph>
                ) : null}
            </XStack>
            {children}
        </YStack>
    );
}

interface StyledInputProps {
    readonly value: string;
    readonly onChangeText: (text: string) => void;
    readonly placeholder: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly autoCapitalize?: "none" | "words" | "sentences" | "characters";
    readonly keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
    readonly textContentType?: "name" | "emailAddress" | "telephoneNumber" | "countryName" | "none";
    readonly onFocus?: (() => void) | undefined;
}

function StyledInput({
    value,
    onChangeText,
    placeholder,
    ds,
    autoCapitalize = "sentences",
    keyboardType = "default",
    textContentType = "none",
    onFocus,
}: StyledInputProps) {
    return (
        <XStack
            items="center"
            px="$4"
            height={56}
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
        >
            <Input
                unstyled
                flex={1}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize={autoCapitalize}
                autoCorrect={false}
                keyboardType={keyboardType}
                textContentType={textContentType}
                placeholder={placeholder}
                placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.titleSm.fontSize}
                onFocus={onFocus}
            />
        </XStack>
    );
}

interface SelectButtonProps {
    readonly label: string;
    readonly isOpen: boolean;
    readonly hasValue: boolean;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly onPress: () => void;
}

function SelectButton({ label, isOpen, hasValue, ds, onPress }: SelectButtonProps) {
    return (
        <Button
            width="100%"
            height={56}
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={isOpen ? ds.colors.primary : ds.colors.border}
            bg={isOpen ? ds.colors.primarySoft : ds.colors.input}
            px="$4"
            justify="space-between"
            pressStyle={{ opacity: 0.92 }}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
        >
            <Text
                color={hasValue ? ds.colors.foreground : ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.titleSm.fontSize}
            >
                {label}
            </Text>
            <ChevronDown size={16} color={ds.colors.mutedForeground} />
        </Button>
    );
}

interface DropdownListProps {
    readonly options: readonly SelectOption[];
    readonly onSelect: (value: string) => void;
    readonly selectedValue: string | null;
    readonly keyPrefix: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly isTablet: boolean;
    readonly t: (key: string) => string;
}

function DropdownList({ options, onSelect, selectedValue, keyPrefix, ds, isTablet, t }: DropdownListProps) {
    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p="$1"
            gap="$0.5"
            style={{ boxShadow: ds.shadows.card }}
        >
            {options.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                    <Button
                        key={option.value}
                        height={isTablet ? 50 : 44}
                        rounded={ds.radii.sm}
                        borderWidth={1}
                        borderColor={isSelected ? ds.colors.primary : "transparent"}
                        bg={isSelected ? ds.colors.primarySoft : "transparent"}
                        pressStyle={{ opacity: 0.92 }}
                        justify="flex-start"
                        px="$3"
                        onPress={() => {
                            onSelect(option.value);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                    >
                        <Text
                            color={isSelected ? ds.colors.primary : ds.colors.foreground}
                            fontFamily={isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyMd.fontSize}
                        >
                            {t(`${keyPrefix}${option.labelKey}`)}
                        </Text>
                    </Button>
                );
            })}
        </YStack>
    );
}
