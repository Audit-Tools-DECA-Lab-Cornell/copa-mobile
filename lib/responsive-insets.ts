import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getResponsiveTabBarLayout, useResponsiveLayout } from "lib/responsive-layout";
import { GLOBAL_FAB_BOTTOM_OFFSET, GLOBAL_FAB_DIAMETER } from "lib/responsive-layout-tokens";

interface FabAwareBottomPaddingOptions {
    /**
     * Whether the scroll container sits above the tab bar (tab screens).
     * Stack screens without a tab bar should pass `false` so the full FAB
     * height is cleared.
     */
    readonly aboveTabBar?: boolean;
}

/**
 * Bottom padding for scrollable content so list ends clear the safe area and
 * the globally mounted bug-report FAB (G8). Replaces the hardcoded
 * `bottomPadding: 92` previously copied across tab screens.
 *
 * Lives apart from `lib/responsive-layout` so that module stays free of the
 * safe-area-context dependency (it is unit-tested with a minimal RN mock).
 *
 * @param options Tab bar context for the calling screen.
 * @returns Bottom padding in pixels.
 */
export function useFabAwareBottomPadding(options: Readonly<FabAwareBottomPaddingOptions> = {}): number {
    const layout = useResponsiveLayout();
    const insets = useSafeAreaInsets();
    const aboveTabBar = options.aboveTabBar ?? true;

    // Top edge of the FAB measured from the window bottom.
    const fabTopFromWindowBottom = Math.max(insets.bottom, 0) + GLOBAL_FAB_BOTTOM_OFFSET + GLOBAL_FAB_DIAMETER;
    // Tab screens already end above the tab bar, so only the FAB overlap
    // beyond the tab bar needs clearing.
    const obstructionHeight = aboveTabBar ? getResponsiveTabBarLayout(layout).height : Math.max(insets.bottom, 0);
    const fabOverlap = Math.max(fabTopFromWindowBottom - obstructionHeight, 0);

    return fabOverlap + layout.screenPaddingVertical;
}
