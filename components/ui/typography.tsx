import { Text, type GetProps } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

/**
 * Semantic text primitives that enforce the app's typography hierarchy:
 *
 * - `ScreenTitle`  - one per screen (display size, heading font).
 * - `CardTitle`    - card / section headings (title size, semibold).
 * - `Body`         - default copy (bodyMd).
 * - `Meta`         - secondary metadata (bodySm, muted).
 * - `Eyebrow`      - small sentence-case section label (12px floor, subtle
 *                    tracking). Uppercase treatment is reserved for status
 *                    badges, not eyebrows.
 * - `MetricValue`  - big numerals for stat cards.
 *
 * Each accepts all Tamagui `Text` props so callers can layer layout tweaks
 * without re-deriving fonts, sizes, or colors.
 */
type AppTextProps = GetProps<typeof Text>;

export function ScreenTitle(props: AppTextProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const typo = layout.isTablet ? ds.typography.displayLg : ds.typography.displayMd;
    return (
        <Text
            color={ds.colors.foreground}
            fontFamily={ds.fonts.headingBold}
            fontSize={typo.fontSize}
            lineHeight={typo.lineHeight}
            accessibilityRole="header"
            {...props}
        />
    );
}

export function CardTitle(props: AppTextProps) {
    const ds = useDesignSystem();
    return (
        <Text
            color={ds.colors.foreground}
            fontFamily={ds.fonts.bodySemiBold}
            fontSize={ds.typography.titleMd.fontSize}
            lineHeight={ds.typography.titleMd.lineHeight}
            {...props}
        />
    );
}

export function Body(props: AppTextProps) {
    const ds = useDesignSystem();
    return (
        <Text
            color={ds.colors.foreground}
            fontFamily={ds.fonts.bodyRegular}
            fontSize={ds.typography.bodyMd.fontSize}
            lineHeight={ds.typography.bodyMd.lineHeight}
            {...props}
        />
    );
}

export function Meta(props: AppTextProps) {
    const ds = useDesignSystem();
    return (
        <Text
            color={ds.colors.mutedForeground}
            fontFamily={ds.fonts.bodyRegular}
            fontSize={ds.typography.bodySm.fontSize}
            lineHeight={ds.typography.bodySm.lineHeight}
            {...props}
        />
    );
}

export function Eyebrow(props: AppTextProps) {
    const ds = useDesignSystem();
    return (
        <Text
            color={ds.colors.mutedForeground}
            fontFamily={ds.fonts.bodySemiBold}
            fontSize={ds.typography.labelLg.fontSize}
            lineHeight={ds.typography.labelLg.lineHeight}
            letterSpacing={0.4}
            {...props}
        />
    );
}

export function MetricValue(props: AppTextProps) {
    const ds = useDesignSystem();
    return (
        <Text
            color={ds.colors.foreground}
            fontFamily={ds.fonts.headingBold}
            fontSize={ds.typography.metricMd.fontSize}
            lineHeight={ds.typography.metricMd.lineHeight}
            {...props}
        />
    );
}
