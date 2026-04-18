import { memo } from "react";
import { Pressable } from "react-native";
import { Text, XStack } from "tamagui";
import { useTranslation } from "react-i18next";
import { useDesignSystem } from "lib/design-system";

export interface ReportToggleProps {
    readonly value: "short" | "extended";
    readonly onChange: (value: "short" | "extended") => void;
}

/**
 * Segmented pill control switching between short and extended report layouts.
 *
 * Active tab: primary-tinted surface with bold text.
 * Inactive tab: transparent background with muted text.
 */
export const ReportToggle = memo(function ReportToggle({ value, onChange }: ReportToggleProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");

    return (
        <XStack
            rounded={ds.radii.full}
            borderWidth={1}
            borderColor={ds.colors.border}
            p="$0.5"
            gap="$0.5"
            width="100%"
            style={{ backgroundColor: ds.colors.input }}
        >
            {(["short", "extended"] as const).map((mode) => {
                const isActive = value === mode;
                return (
                    <Pressable
                        key={mode}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={t(`toggle.${mode}`, { ns: "reports" })}
                        onPress={() => {
                            onChange(mode);
                        }}
                        style={{ flex: 1 }}
                    >
                        <XStack
                            minH={44}
                            px="$3"
                            rounded={ds.radii.full}
                            justify="center"
                            items="center"
                            style={{
                                backgroundColor: isActive ? ds.colors.primary : "transparent",
                                // Subtle shadow only on active segment
                                boxShadow: isActive ? ds.shadows.accent : undefined,
                            }}
                        >
                            <Text
                                color={isActive ? ds.colors.primaryForeground : ds.colors.mutedForeground}
                                fontFamily={isActive ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                                lineHeight={ds.typography.bodyMd.lineHeight}
                                style={{ textAlign: "center", letterSpacing: isActive ? 0.1 : 0 }}
                            >
                                {t(`toggle.${mode}`, { ns: "reports" })}
                            </Text>
                        </XStack>
                    </Pressable>
                );
            })}
        </XStack>
    );
});
