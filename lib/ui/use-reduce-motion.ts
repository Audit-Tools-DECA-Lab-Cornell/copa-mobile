import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * React hook that exposes the device's reduce-motion accessibility preference.
 * Animated components should check this and skip non-essential motion when true,
 * matching the @media (prefers-reduced-motion: reduce) contract on web.
 *
 * @returns True when the OS reports reduce-motion is enabled.
 */
export function useReduceMotion(): boolean {
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        let mounted = true;

        AccessibilityInfo.isReduceMotionEnabled()
            .then((enabled) => {
                if (mounted) {
                    setReduceMotion(enabled);
                }
            })
            .catch(() => {
                // Best-effort: on platforms that throw, default to motion enabled.
            });

        const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
            setReduceMotion(enabled);
        });

        return () => {
            mounted = false;
            subscription.remove();
        };
    }, []);

    return reduceMotion;
}
