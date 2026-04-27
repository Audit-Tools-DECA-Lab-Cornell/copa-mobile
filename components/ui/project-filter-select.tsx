import { Check, ChevronDown } from "@tamagui/lucide-icons-2";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useState } from "react";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, ScrollView as TamaguiScrollView, Sheet, Text, XStack, YStack } from "tamagui";

/** Selected project: all assignments, or one project id. */
export type ProjectFilterValue = "all" | string;

export interface ProjectFilterSelectProps {
    readonly uniqueProjects: readonly { id: string; name: string }[];
    readonly value: ProjectFilterValue;
    readonly onChange: (next: ProjectFilterValue) => void;
    readonly sectionLabel: string;
    readonly allProjectsLabel: string;
}

/**
 * Single-row control that opens a bottom sheet to pick a project filter (dropdown pattern).
 */
export function ProjectFilterSelect({
    uniqueProjects,
    value,
    onChange,
    sectionLabel,
    allProjectsLabel,
}: Readonly<ProjectFilterSelectProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const insets = useSafeAreaInsets();
    const [sheetOpen, setSheetOpen] = useState(false);

    const selectedLabel =
        value === "all"
            ? allProjectsLabel
            : (uniqueProjects.find((project) => project.id === value)?.name ?? allProjectsLabel);

    const controlHeight = layout.isTablet ? layout.buttonHeight : layout.controlHeight;
    const triggerA11yLabel = `${sectionLabel}: ${selectedLabel}`;

    return (
        <YStack gap="$2">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelSm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {sectionLabel}
            </Paragraph>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={triggerA11yLabel}
                onPress={() => {
                    setSheetOpen(true);
                }}
            >
                <XStack
                    items="center"
                    gap="$3"
                    px={layout.isTablet ? "$4" : "$3"}
                    height={controlHeight}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.input}
                >
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={layout.isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize}
                        flex={1}
                        numberOfLines={1}
                    >
                        {selectedLabel}
                    </Text>
                    <ChevronDown size={layout.isTablet ? 20 : 18} color={ds.colors.mutedForeground} />
                </XStack>
            </Pressable>

            <Sheet
                modal
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                snapPoints={[58]}
                snapPointsMode="percent"
                dismissOnSnapToBottom
                zIndex={100_000}
            >
                <Sheet.Overlay opacity={0.5} />
                <Sheet.Frame
                    p="$4"
                    pb={insets.bottom + 16}
                    bg={ds.colors.background}
                    borderTopLeftRadius={layout.isTablet ? ds.radii.xl : ds.radii.lg}
                    borderTopRightRadius={layout.isTablet ? ds.radii.xl : ds.radii.lg}
                >
                    <Sheet.Handle bg={ds.colors.border} />
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={ds.typography.titleMd.fontSize}
                        mb="$3"
                        mt="$2"
                    >
                        {sectionLabel}
                    </Text>
                    <TamaguiScrollView style={{ maxHeight: "72%" }} showsVerticalScrollIndicator={false}>
                        <YStack gap="$1">
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ selected: value === "all" }}
                                onPress={() => {
                                    onChange("all");
                                    setSheetOpen(false);
                                }}
                            >
                                <XStack
                                    items="center"
                                    gap="$3"
                                    py="$3"
                                    px="$3"
                                    rounded={ds.radii.md}
                                    bg={value === "all" ? ds.colors.primarySoft : "transparent"}
                                >
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={value === "all" ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodyMd.fontSize}
                                        flex={1}
                                    >
                                        {allProjectsLabel}
                                    </Text>
                                    {value === "all" ? (
                                        <Check size={20} color={ds.colors.primary} strokeWidth={2.5} />
                                    ) : null}
                                </XStack>
                            </Pressable>
                            {uniqueProjects.map((project) => {
                                const isSelected = value === project.id;
                                return (
                                    <Pressable
                                        key={project.id}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isSelected }}
                                        onPress={() => {
                                            onChange(project.id);
                                            setSheetOpen(false);
                                        }}
                                    >
                                        <XStack
                                            items="center"
                                            gap="$3"
                                            py="$3"
                                            px="$3"
                                            rounded={ds.radii.md}
                                            bg={isSelected ? ds.colors.primarySoft : "transparent"}
                                        >
                                            <Text
                                                color={ds.colors.foreground}
                                                fontFamily={isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                                fontSize={ds.typography.bodyMd.fontSize}
                                                flex={1}
                                                numberOfLines={2}
                                            >
                                                {project.name}
                                            </Text>
                                            {isSelected ? (
                                                <Check size={20} color={ds.colors.primary} strokeWidth={2.5} />
                                            ) : null}
                                        </XStack>
                                    </Pressable>
                                );
                            })}
                        </YStack>
                    </TamaguiScrollView>
                </Sheet.Frame>
            </Sheet>
        </YStack>
    );
}
