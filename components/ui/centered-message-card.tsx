import { Button, Paragraph, Text, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

export interface CenteredMessageCardProps {
    readonly title: string;
    readonly message: string;
    readonly actionLabel?: string | undefined;
    readonly onAction?: (() => void) | undefined;
    /** Test identifier forwarded to the primary action button. */
    readonly actionTestID?: string | undefined;
    readonly secondaryActionLabel?: string | undefined;
    readonly onSecondaryAction?: (() => void) | undefined;
}

/**
 * Centered status card for loading/error/empty states, with an optional
 * primary action (e.g. Retry) and a quieter secondary exit (e.g. Back) so a
 * wait state never traps the user (G2/G7). Shared across the execute flow;
 * previously duplicated per screen.
 */
export function CenteredMessageCard({
    title,
    message,
    actionLabel,
    onAction,
    actionTestID,
    secondaryActionLabel,
    onSecondaryAction,
}: Readonly<CenteredMessageCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <YStack flex={1} justify="center" px={layout.screenPaddingHorizontal} bg={ds.colors.background}>
            <YStack
                width="100%"
                style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$2"
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleLg.fontSize}
                >
                    {title}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                >
                    {message}
                </Paragraph>
                {actionLabel !== undefined && typeof onAction === "function" ? (
                    <Button
                        mt="$2"
                        height={44}
                        rounded={ds.radii.md}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={onAction}
                        testID={actionTestID}
                    >
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {actionLabel}
                        </Text>
                    </Button>
                ) : null}
                {secondaryActionLabel !== undefined && typeof onSecondaryAction === "function" ? (
                    <Button
                        mt="$1"
                        height={44}
                        rounded={ds.radii.md}
                        chromeless
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={onSecondaryAction}
                    >
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {secondaryActionLabel}
                        </Text>
                    </Button>
                ) : null}
            </YStack>
        </YStack>
    );
}
