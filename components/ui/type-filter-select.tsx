import { Check, ChevronDown } from "@tamagui/lucide-icons-2";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useState } from "react";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet, Text, XStack, YStack } from "tamagui";

export interface TypeFilterOption {
    readonly id: string;
    readonly label: string;
}

export interface TypeFilterSelectProps {
    /** Short label for the filter category, e.g. "Status", "Sort", "Audit Type". */
    readonly label: string;
    /** Ordered list of options - the first option is treated as the default/all value. */
    readonly options: readonly TypeFilterOption[];
    /** Currently selected option id. */
    readonly value: string;
    readonly onChange: (value: string) => void;
}

/**
 * Compact type-labeled filter button that opens a content-sized bottom-sheet dropdown.
 * Shows the filter category and current selection in one pill: "Status: Submitted ▾".
 * The trigger highlights in primary color when a non-default option is active.
 * The sheet auto-sizes to its contents so it feels like a dropdown, not a half-screen modal.
 *
 * IMPORTANT: `onPress` lives directly on the outer XStack (not in a wrapping Pressable) because
 * Tamagui 2.x activates its own internal gesture handler whenever `pressStyle` is present on a
 * Stack - a nested Pressable would lose touches to that handler before its `onPress` fires.
 *
 * @param props Filter label, options, current value, and change handler.
 * @returns A pressable pill button backed by a fit-height Sheet option list.
 */
export function TypeFilterSelect({ label, options, value, onChange }: Readonly<TypeFilterSelectProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const insets = useSafeAreaInsets();
    const [sheetOpen, setSheetOpen] = useState(false);

    const defaultId = options[0]?.id ?? "all";
    const isActive = value !== defaultId;
    const selectedLabel = options.find((opt) => opt.id === value)?.label ?? options[0]?.label ?? value;

    return (
        <>
            {/* Trigger: onPress lives on the XStack itself - see JSDoc above */}
            <XStack
                items="center"
                gap="$1.5"
                px={layout.isTablet ? "$3.5" : "$3"}
                height={Math.max(layout.compactControlHeight, 44)}
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={isActive ? ds.colors.primary : ds.colors.border}
                bg={isActive ? ds.colors.primarySoft : ds.colors.surface}
                pressStyle={{ opacity: 0.88, scale: 0.985 }}
                onPress={() => {
                    setSheetOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${selectedLabel}`}
                cursor="pointer"
            >
                {/* Filter type prefix - always dim */}
                <Text
                    color={isActive ? ds.colors.primary : ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={layout.isTablet ? ds.typography.labelMd.fontSize : ds.typography.labelSm.fontSize}
                    opacity={0.7}
                >
                    {`${label}:`}
                </Text>
                {/* Selected value - bold */}
                <Text
                    color={isActive ? ds.colors.primary : ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={layout.isTablet ? ds.typography.labelMd.fontSize : ds.typography.labelSm.fontSize}
                    letterSpacing={0.2}
                    numberOfLines={1}
                >
                    {selectedLabel}
                </Text>
                <ChevronDown
                    size={layout.isTablet ? 16 : 14}
                    color={isActive ? ds.colors.primary : ds.colors.mutedForeground}
                />
            </XStack>

            <Sheet
                modal
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                snapPoints={[options.length * 56 + 100]}
                snapPointsMode="constant"
                dismissOnSnapToBottom
                zIndex={100_000}
            >
                <Sheet.Overlay opacity={0.35} />
                <Sheet.Frame
                    pb={insets.bottom + 8}
                    bg={ds.colors.surface}
                    borderTopLeftRadius={ds.radii.xl}
                    borderTopRightRadius={ds.radii.xl}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    style={{ borderBottomWidth: 0 }}
                >
                    <Sheet.Handle bg={ds.colors.border} mt="$2" mb="$1" />

                    {/* Compact header: filter category + current selection */}
                    <XStack
                        items="center"
                        justify="space-between"
                        px="$4"
                        pt="$2"
                        pb="$3"
                        borderBottomWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelSm.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {label}
                        </Text>
                        <Text
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                        >
                            {selectedLabel}
                        </Text>
                    </XStack>

                    {/* Option rows */}
                    <YStack py="$1.5">
                        {options.map((option) => {
                            const isSelected = value === option.id;
                            return (
                                <Pressable
                                    key={option.id}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: isSelected }}
                                    onPress={() => {
                                        onChange(option.id);
                                        setSheetOpen(false);
                                    }}
                                >
                                    {({ pressed }) => (
                                        <XStack
                                            items="center"
                                            gap="$3"
                                            px="$4"
                                            py="$3"
                                            bg={
                                                isSelected
                                                    ? ds.colors.primarySoft
                                                    : pressed
                                                      ? ds.colors.mutedSurface
                                                      : "transparent"
                                            }
                                        >
                                            <Text
                                                color={isSelected ? ds.colors.primary : ds.colors.foreground}
                                                fontFamily={isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                                fontSize={
                                                    layout.isTablet
                                                        ? ds.typography.bodyLg.fontSize
                                                        : ds.typography.bodyMd.fontSize
                                                }
                                                flex={1}
                                            >
                                                {option.label}
                                            </Text>
                                            {isSelected ? (
                                                <Check size={18} color={ds.colors.primary} strokeWidth={2.5} />
                                            ) : null}
                                        </XStack>
                                    )}
                                </Pressable>
                            );
                        })}
                    </YStack>
                </Sheet.Frame>
            </Sheet>
        </>
    );
}
