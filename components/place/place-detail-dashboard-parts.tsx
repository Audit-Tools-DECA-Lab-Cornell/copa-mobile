import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Button, Text, XStack } from "tamagui";
import type { AuditorPlace } from "lib/audit/places-api";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

interface CompletionRingProps {
    readonly progress: number;
    readonly size: number;
    readonly strokeWidth: number;
}

export function CompletionRing({ progress, size, strokeWidth }: Readonly<CompletionRingProps>) {
    const ds = useDesignSystem();
    const normalizedProgress = clampNumber(progress, 0, 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - normalizedProgress / 100);

    return (
        <View
            style={{
                width: size,
                height: size,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Svg width={size} height={size} style={{ position: "absolute" }}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={ds.colors.border}
                    strokeWidth={strokeWidth}
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={ds.colors.primary}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <Text
                color={ds.colors.primary}
                fontFamily={ds.fonts.headingBold}
                fontSize={
                    size >= 180 ? ds.typography.displayMd.fontSize : size >= 150 ? ds.typography.metricMd.fontSize : 34
                }
                lineHeight={
                    size >= 180
                        ? ds.typography.displayMd.lineHeight
                        : size >= 150
                          ? ds.typography.metricMd.lineHeight
                          : 40
                }
                adjustsFontSizeToFit={true}
                minimumFontScale={0.72}
                numberOfLines={1}
            >
                {Math.round(normalizedProgress)}%
            </Text>
        </View>
    );
}

export function MetricLabel({ children }: Readonly<{ children: ReactNode }>) {
    const ds = useDesignSystem();
    return (
        <Text
            color={ds.colors.mutedForeground}
            fontFamily={ds.fonts.bodyBold}
            fontSize={ds.typography.labelMd.fontSize}
            textTransform="uppercase"
            letterSpacing={1}
        >
            {children}
        </Text>
    );
}

interface PlaceCoordinate {
    readonly latitude: number;
    readonly longitude: number;
}

interface QuickActionButtonProps {
    readonly icon: ReactNode;
    readonly label: string;
    readonly onPress: () => void;
    readonly variant?: "primary" | "secondary";
    readonly rightIcon?: ReactNode;
    readonly compact?: boolean;
    readonly fill?: boolean;
}

export function QuickActionButton({
    icon,
    label,
    onPress,
    variant = "secondary",
    rightIcon,
    compact = false,
    fill = false,
}: Readonly<QuickActionButtonProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const isPrimary = variant === "primary";
    const buttonHeight = compact
        ? layout.compactControlHeight + 8
        : layout.isTablet
          ? layout.buttonHeight
          : layout.controlHeight;

    return (
        <Button
            flex={fill ? 1 : undefined}
            minW={fill ? (layout.isTablet ? 210 : 150) : undefined}
            height={buttonHeight}
            rounded={ds.radii.md}
            borderWidth={isPrimary ? 0 : 1}
            borderColor={isPrimary ? "transparent" : ds.colors.border}
            bg={isPrimary ? ds.colors.primary : ds.colors.input}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={onPress}
            px={compact ? "$3" : "$4"}
        >
            <XStack flex={1} items="center" gap="$2.5">
                <XStack width={22} items="center" justify="center">
                    {icon}
                </XStack>
                <Text
                    flex={1}
                    color={isPrimary ? ds.colors.primaryForeground : ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={compact ? ds.typography.labelMd.fontSize : ds.typography.labelLg.fontSize}
                    textTransform="uppercase"
                    letterSpacing={compact ? 0.8 : 1.1}
                    numberOfLines={compact ? 2 : 1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.78}
                >
                    {label}
                </Text>
                {rightIcon ? (
                    <XStack width={20} items="center" justify="flex-end">
                        {rightIcon}
                    </XStack>
                ) : null}
            </XStack>
        </Button>
    );
}

/** Validate and normalize place coordinates before they reach the map view. */
export function getPlaceCoordinate(lat: AuditorPlace["lat"], lng: AuditorPlace["lng"]): PlaceCoordinate | null {
    if (typeof lat !== "number" || !Number.isFinite(lat)) {
        return null;
    }
    if (typeof lng !== "number" || !Number.isFinite(lng)) {
        return null;
    }
    if (lat < -90 || lat > 90) {
        return null;
    }
    if (lng < -180 || lng > 180) {
        return null;
    }

    return {
        latitude: lat,
        longitude: lng,
    };
}

function clampNumber(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}
