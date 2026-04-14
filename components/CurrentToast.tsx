import { useTranslation } from "react-i18next";
import { Button, H4, XStack, YStack } from "tamagui";

import { AlertTriangle, CheckCircle2, Info, X } from "@tamagui/lucide-icons-2";
import { Toast, useToastController, useToastState } from "@tamagui/toast";

type ToastVariant = "success" | "error" | "info";
type ToastThemeName = "success" | "error" | "accent";
type ActiveToastState = NonNullable<ReturnType<typeof useToastState>>;

/**
 * Resolve the variant for the active toast, defaulting to a neutral info state.
 */
function getToastVariant(currentToast: ActiveToastState): ToastVariant {
    return (currentToast.variant as ToastVariant) || "info";
}

/**
 * Map semantic toast variants to the child themes already registered in Tamagui.
 */
function getToastThemeName(variant: ToastVariant): ToastThemeName {
    return (variant as ToastThemeName) || "accent";
}

/**
 * Normalize the optional toast message so empty values do not reserve layout space.
 */
function getToastMessage(message: ActiveToastState["message"]): string | null {
    return typeof message === "string" && message.trim().length > 0 ? message : null;
}

/**
 * Render a semantic icon that matches the toast tone.
 */
function renderToastIcon(variant: ToastVariant) {
    switch (variant) {
        case "success":
            return <CheckCircle2 size={24} color="$color10" />;
        case "error":
            return <AlertTriangle size={24} color="$color10" />;
        case "info":
            return <Info size={24} color="$color10" />;
    }
}

/**
 * Custom toast shell built with the documented Tamagui toast anatomy.
 */
export function CurrentToast() {
    const currentToast = useToastState();
    const { t } = useTranslation("common");

    if (!currentToast || currentToast.isHandledNatively) return null;

    const toastOptionalProps: {
        duration?: number;
        viewportName?: string;
    } = {};

    if (typeof currentToast.duration === "number") {
        toastOptionalProps.duration = currentToast.duration;
    }

    if (typeof currentToast.viewportName === "string") {
        toastOptionalProps.viewportName = currentToast.viewportName;
    }

    const toastVariant = getToastVariant(currentToast);
    const toastTheme = getToastThemeName(toastVariant);
    const toastMessage = getToastMessage(currentToast.message);

    return (
        <Toast
            key={currentToast.id}
            {...toastOptionalProps}
            type="foreground"
            transition={{ delay: 100 }}
            enterStyle={{ opacity: 0, scale: 0.96, y: -16 }}
            exitStyle={{ opacity: 0, scale: 0.98, y: -12 }}
            y={0}
            width={"100%"}
            borderColor="$borderColor"
            borderWidth={1}
            shadowOpacity={0.18}
            shadowRadius={18}
            shadowOffset={{ width: 0, height: 10 }}
            elevation={8}
            rounded="$6"
            px="$4"
            pt="$3"
            pb="$4"
        >
            <XStack gap="$3" items="flex-start" width="100%" justify="center">
                <YStack flex={1} gap="$2.5" pt="$0.5" justify="center">
                    <XStack flex={1} justify="flex-start" items="center" gap="$2">
                        <YStack theme={toastTheme} items="center" justify="center" background="$color7">
                            {renderToastIcon(toastVariant)}
                        </YStack>
                        <Toast.Title
                            theme={toastTheme}
                            color="$color10"
                            fontFamily="$bodyBold"
                            fontSize="$4"
                            lineHeight="$4"
                            pt="$1"
                        >
                            {currentToast.title}
                        </Toast.Title>
                    </XStack>
                    {toastMessage === null ? null : (
                        <Toast.Description
                            color="$color12"
                            fontFamily="$body"
                            fontSize="$3"
                            lineHeight="$3"
                            width="100%"
                        >
                            {toastMessage}
                        </Toast.Description>
                    )}
                </YStack>

                <Toast.Close asChild>
                    <Button
                        chromeless
                        circular
                        size="$2"
                        icon={<X size={18} />}
                        accessibilityLabel={t("toast.hide", { ns: "common" })}
                    />
                </Toast.Close>
            </XStack>
        </Toast>
    );
}

/**
 * Local demo controls used to validate toast rendering during development.
 */
export function ToastControl() {
    const toast = useToastController();
    const { t } = useTranslation("common");

    return (
        <YStack gap="$2" items="center">
            <H4>{t("toast.demo", { ns: "common" })}</H4>
            <XStack gap="$2" justify="center">
                <Button
                    onPress={() => {
                        toast.show(t("toast.success", { ns: "common" }), {
                            message: t("dontWorryWeveGotYourData", "Don't worry, we've got your data."),
                            variant: "success",
                        });
                    }}
                >
                    {t("toast.show", { ns: "common" })}
                </Button>
                <Button
                    onPress={() => {
                        toast.hide();
                    }}
                >
                    {t("toast.hide", { ns: "common" })}
                </Button>
            </XStack>
        </YStack>
    );
}
