import { useMemo, useEffect } from "react";
import { Animated } from "react-native";
import { YStack, XStack, Text, View } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useReduceMotion } from "lib/ui/use-reduce-motion";

interface AuditProgressDotsProps {
    readonly placeName: string;
    readonly auditLabel: string;
    readonly totalDomains: number;
    readonly completedDomains: number;
    readonly activeDomain: number;
    readonly progressPercent: number;
}

/**
 * Domain progress indicator for the execute tab header.
 * Shows place/audit info and animated dot progress across domains.
 *
 * @param placeName Name of the place being audited.
 * @param auditLabel Label like "Audit #3".
 * @param totalDomains Total number of domains in this audit.
 * @param completedDomains Number of fully completed domains.
 * @param activeDomain Currently active domain (1-indexed).
 * @param progressPercent Overall audit progress percentage.
 */
export function AuditProgressDots({
    placeName,
    auditLabel,
    totalDomains,
    completedDomains,
    activeDomain,
    progressPercent,
}: Readonly<AuditProgressDotsProps>) {
    const ds = useDesignSystem();
    const reduceMotion = useReduceMotion();

    // Create animated values for each dot
    const dotAnimations = useMemo(
        () => Array.from({ length: totalDomains }, () => ({ color: new Animated.Value(0) })),
        [totalDomains],
    );

    // Animate dot transitions on domain advance.
    // Spec: previous active dot terracotta→moss spring 400ms; next dot edge→terracotta spring
    // 300ms with 100ms delay. Uses Animated.spring so the color shift carries the same
    // settling feel as the rest of the system (matching audit-section-block progress bar).
    useEffect(() => {
        dotAnimations.forEach((dot, index) => {
            let targetValue = 0; // remaining (edge color)
            if (index < completedDomains) {
                targetValue = 2; // completed (moss)
            } else if (index === completedDomains) {
                targetValue = 1; // active (terracotta)
            }

            if (reduceMotion) {
                dot.color.setValue(targetValue);
                return;
            }

            const springAnim = Animated.spring(dot.color, {
                toValue: targetValue,
                stiffness: 200,
                damping: 18,
                useNativeDriver: false,
            });

            if (index === completedDomains) {
                // 100ms delay so the previous dot's moss transition starts first.
                const timeoutId = setTimeout(() => springAnim.start(), 100);
                return () => clearTimeout(timeoutId);
            }
            springAnim.start();
            return undefined;
        });
    }, [completedDomains, dotAnimations, reduceMotion]);

    const getColorForDot = (index: number) => {
        if (index < completedDomains) {
            return ds.colors.success;
        } else if (index === completedDomains) {
            return ds.colors.primary;
        } else {
            return ds.colors.border;
        }
    };

    return (
        <YStack gap="$3" width="100%">
            {/* Row 1: Place name and audit label */}
            <Text fontFamily={ds.fonts.bodyBold} fontSize={13} fontWeight="600" color={ds.colors.foreground}>
                {placeName} · {auditLabel}
            </Text>

            {/* Row 2: Progress text */}
            <Text fontFamily={ds.fonts.bodyMedium} fontSize={11} fontWeight="400" color={ds.colors.mutedForeground}>
                Domain {activeDomain} of {totalDomains} · {progressPercent}% complete
            </Text>

            {/* Row 3: Dot row */}
            <XStack gap={6}>
                {Array.from({ length: totalDomains }).map((_, index) => (
                    <View
                        key={index}
                        width={8}
                        height={8}
                        bg={getColorForDot(index)}
                        rounded={4}
                        opacity={index > completedDomains ? 0.4 : 1}
                    />
                ))}
            </XStack>
        </YStack>
    );
}
