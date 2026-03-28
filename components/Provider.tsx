import { TamaguiProvider, type TamaguiProviderProps } from "tamagui";
import { ToastProvider, ToastViewport } from "@tamagui/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CurrentToast } from "./CurrentToast";
import { config } from "../tamagui.config";

interface ProviderProps extends Omit<TamaguiProviderProps, "config" | "defaultTheme"> {
    /** Tamagui theme name — typically "light" or "dark". */
    readonly theme?: "light" | "dark";
}

/**
 * Keep the toast viewport inside the safe area and allow stacked notifications.
 */
function SafeToastViewport() {
    const { left, right, top } = useSafeAreaInsets();
    return (
        <ToastViewport
            multipleToasts
            flexDirection="column-reverse"
            top={top}
            left={left}
            right={right}
            paddingTop="$2"
            paddingHorizontal="$4"
            items="center"
        />
    );
}

/**
 * Global provider wrapping Tamagui, toasts, and theme selection.
 */
export function Provider({ children, theme = "dark", ...rest }: Readonly<ProviderProps>) {
    return (
        <TamaguiProvider config={config} defaultTheme={theme} {...rest}>
            <ToastProvider swipeDirection="vertical" duration={6000} native={[]}>
                {children}
                <CurrentToast />
                <SafeToastViewport />
            </ToastProvider>
        </TamaguiProvider>
    );
}
