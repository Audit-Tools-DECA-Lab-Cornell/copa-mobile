import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { XStack, YStack, Text } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useReduceMotion } from "lib/ui/use-reduce-motion";

type SyncState = "offline" | "syncing" | "synced" | "idle";

interface SyncStatusIslandProps {
    readonly state: SyncState;
    readonly onStateChange?: (state: SyncState) => void;
}

/**
 * Floating pill indicator for sync status (offline, syncing, synced, or idle).
 * Displays at the top of the execute screen when sync state is not idle.
 *
 * @param state Current sync state.
 * @param onStateChange Callback when synced auto-dismisses after 1500ms.
 */
export function SyncStatusIsland({ state, onStateChange }: Readonly<SyncStatusIslandProps>) {
    const ds = useDesignSystem();
    const reduceMotion = useReduceMotion();
    const dotOpacity = useRef(new Animated.Value(1)).current;
    const dotScale = useRef(new Animated.Value(1)).current;

    // Auto-dismiss synced state after 1500ms
    useEffect(() => {
        if (state !== "synced") return;
        const timer = setTimeout(() => {
            onStateChange?.("idle");
        }, 1500);
        return () => clearTimeout(timer);
    }, [state, onStateChange]);

    // Breathing animation for offline (slow 2s cycle)
    useEffect(() => {
        if (state !== "offline" || reduceMotion) {
            dotOpacity.setValue(1);
            return;
        }

        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(dotOpacity, {
                    toValue: 0.4,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(dotOpacity, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ]),
        );

        anim.start();
        return () => anim.stop();
    }, [state, dotOpacity, reduceMotion]);

    // Pulse animation for syncing (1.2s cycle)
    useEffect(() => {
        if (state !== "syncing" || reduceMotion) {
            dotScale.setValue(1);
            return;
        }

        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(dotScale, {
                    toValue: 1.15,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(dotScale, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
        );

        anim.start();
        return () => anim.stop();
    }, [state, dotScale, reduceMotion]);

    // Return null for idle state
    if (state === "idle") {
        return null;
    }

    // Determine colors by state
    const getStateColors = () => {
        switch (state) {
            case "offline":
                return { color: ds.colors.warning || "#b8955a" };
            case "syncing":
                return { color: ds.colors.primary || "#c58a5c" };
            case "synced":
                return { color: ds.colors.success || "#5e9470" };
            default:
                return { color: ds.colors.foreground || "#888" };
        }
    };

    const { color } = getStateColors();

    const getLabelText = () => {
        switch (state) {
            case "offline":
                return "Offline";
            case "syncing":
                return "Syncing...";
            case "synced":
                return "Synced";
            default:
                return "";
        }
    };

    return (
        <YStack>
            <XStack
                rounded={24}
                px={14}
                py={8}
                bg={ds.colors.surface}
                borderWidth={0.5}
                borderColor={color}
                gap="$2"
                style={{
                    shadowColor: "rgba(0, 0, 0, 0.3)",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 1,
                    shadowRadius: 16,
                }}
            >
                {/* Animated dot */}
                <Animated.View
                    style={[
                        {
                            width: 7,
                            height: 7,
                            backgroundColor: color,
                            borderRadius: 3.5,
                            opacity: dotOpacity,
                            transform: [{ scale: dotScale }],
                        },
                    ]}
                />

                {/* Label text */}
                <Text
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={11}
                    fontWeight="500"
                    letterSpacing={0.22}
                    color={color}
                >
                    {getLabelText()}
                </Text>
            </XStack>
        </YStack>
    );
}
