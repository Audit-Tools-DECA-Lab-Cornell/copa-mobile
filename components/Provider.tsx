import { TamaguiProvider, type TamaguiProviderProps } from "tamagui";
import { ToastProvider, ToastViewport } from "@tamagui/toast";
import { CurrentToast } from "./CurrentToast";
import { config } from "../tamagui.config";

interface ProviderProps extends Omit<TamaguiProviderProps, "config" | "defaultTheme"> {
    /** Tamagui theme name — typically "light" or "dark". */
    readonly theme?: "light" | "dark";
}

/**
 * Global provider wrapping Tamagui, toasts, and theme selection.
 */
export function Provider({ children, theme = "dark", ...rest }: Readonly<ProviderProps>) {
    return (
        <TamaguiProvider config={config} defaultTheme={theme} {...rest}>
            <ToastProvider swipeDirection="horizontal" duration={6000} native={[]}>
                {children}
                <CurrentToast />
                <ToastViewport top="$8" left={0} right={0} />
            </ToastProvider>
        </TamaguiProvider>
    );
}
