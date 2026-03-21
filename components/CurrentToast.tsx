import { Toast, useToastController, useToastState } from "@tamagui/toast";
import { Button, H4, XStack, YStack, isWeb } from "tamagui";
import { useTranslation } from "react-i18next";

export function CurrentToast() {
    const currentToast = useToastState();

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

    return (
        <Toast
            key={currentToast.id}
            {...toastOptionalProps}
            enterStyle={{ opacity: 0, scale: 0.5, y: -25 }}
            exitStyle={{ opacity: 0, scale: 1, y: -20 }}
            y={isWeb ? "$12" : 0}
            theme="accent"
            rounded="$6"
        >
            <YStack items="center" p="$2" gap="$2">
                <Toast.Title fontWeight="bold">{currentToast.title}</Toast.Title>
                {!!currentToast.message && (
                    <Toast.Description>{currentToast.message}</Toast.Description>
                )}
            </YStack>
        </Toast>
    );
}

export function ToastControl() {
    const toast = useToastController();
    const { t } = useTranslation("common");
    return (
        <YStack gap="$2" items="center">
            <H4>{t("toastDemo", { ns: "common" })}</H4>
            <XStack gap="$2" justify="center">
                <Button
                    onPress={() => {
                        toast.show(t("toastSuccess", { ns: "common" }), {
                            message: t(
                                "dontWorryWeveGotYourData",
                                "Don't worry, we've got your data.",
                            ),
                        });
                    }}
                >
                    {t("toastShow", { ns: "common" })}
                </Button>
                <Button
                    onPress={() => {
                        toast.hide();
                    }}
                >
                    {t("toastHide", { ns: "common" })}
                </Button>
            </XStack>
        </YStack>
    );
}
