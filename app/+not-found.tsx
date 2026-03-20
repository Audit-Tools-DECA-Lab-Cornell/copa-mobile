import { Link, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { View, Text } from "tamagui";
import { useDesignSystem } from "lib/design-system";

export default function NotFoundScreen() {
    const ds = useDesignSystem();
    const { t } = useTranslation("not-found");

    return (
        <>
            <Stack.Screen options={{ title: t("title") }} />
            <View flex={1} items="center" justify="center" p="$5" bg={ds.colors.background}>
                <Text
                    color={ds.colors.foreground}
                    fontSize={ds.typography.titleLg.fontSize}
                    fontFamily={ds.fonts.bodyBold}
                >
                    {t("message")}
                </Text>
                <Link href="/" style={{ marginTop: 15, paddingVertical: 15 }}>
                    <Text
                        color={ds.colors.primary}
                        fontSize={ds.typography.bodyMd.fontSize}
                        fontFamily={ds.fonts.bodyMedium}
                    >
                        {t("goHome")}
                    </Text>
                </Link>
            </View>
        </>
    );
}
