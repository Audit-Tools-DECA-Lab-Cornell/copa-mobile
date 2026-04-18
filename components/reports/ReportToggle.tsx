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
 * Segmented control switching between short and extended report layouts.
 */
export const ReportToggle = memo(function ReportToggle({ value, onChange }: ReportToggleProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");

    return (
        <XStack rounded={ds.radii.md} p="$1" gap="$1" width="100%" style={{ backgroundColor: ds.colors.input }}>
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
                            px="$4"
                            rounded={ds.radii.full}
                            bg={isActive ? ds.colors.surfaceMuted : ds.colors.surface}
                            justify="center"
                            items="center"
                        >
                            <Text
                                color={isActive ? ds.colors.mutedForeground : ds.colors.foreground}
                                fontFamily={isActive ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                                lineHeight={ds.typography.bodyMd.lineHeight}
                                style={{ textAlign: "center" }}
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
