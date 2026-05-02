import { JSX, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { ArrowRight } from "@tamagui/lucide-icons-2";
import type { IconProps } from "@tamagui/helpers-icon";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

/**
 * Lucide icon component type used for the onboarding hero badge.
 *
 * Matches the signature exported by `@tamagui/lucide-icons-2` so any imported
 * icon (`Lock`, `Shield`, `KeyRound`, etc.) can be passed directly.
 */
export type OnboardingIcon = (props: IconProps) => JSX.Element;

interface OnboardingShellProps {
    /** Current step index, 1-based. */
    readonly step: number;
    /** Total number of steps in the flow (typically 4). */
    readonly totalSteps: number;
    /** Hero icon used in the colored badge to the left of the title. */
    readonly icon: OnboardingIcon;
    /** Localized eyebrow above the title (e.g. "Step 1 of 4"). */
    readonly eyebrow: string;
    /** Headline for the screen. Rendered uppercase italic to match brand styling. */
    readonly title: string;
    /** Supporting paragraph below the title. */
    readonly subtitle: string;
    /** Page content rendered inside the scroll surface. */
    readonly children: ReactNode;
    /**
     * Primary call-to-action label.  When omitted the sticky footer is hidden
     * (e.g. for fatal-error states).
     */
    readonly ctaLabel?: string | undefined;
    /** Loading-state label swapped in while the CTA is busy. */
    readonly ctaLoadingLabel?: string | undefined;
    /** CTA tap handler. */
    readonly onCtaPress?: (() => void) | undefined;
    /** When `false` the CTA appears disabled. */
    readonly canSubmit?: boolean | undefined;
    /** When `true` the CTA shows the loading label and disables interaction. */
    readonly isLoading?: boolean | undefined;
    /** Optional helper paragraph rendered above the CTA (centered, muted). */
    readonly helperText?: string | undefined;
    /** Optional inline error rendered above the CTA in a danger-tinted card. */
    readonly errorMessage?: string | null | undefined;
    /** Wrap content in `KeyboardAvoidingView` for screens with form inputs. */
    readonly avoidKeyboard?: boolean | undefined;
    /** Extra spacing below content; defaults to a comfortable padding. */
    readonly contentBottomPadding?: number | undefined;
    /** Optional override for the scroll surface style (rare). */
    readonly contentStyle?: StyleProp<ViewStyle> | undefined;
}

/**
 * Shared chrome for every screen in the onboarding flow.
 *
 * Renders three regions:
 *   1. Sticky header — progress segments, eyebrow, icon badge, title, subtitle.
 *   2. Scrollable body — the unique content for each step.
 *   3. Sticky footer — primary CTA, optional helper text, optional inline error.
 *
 * The shell is fully responsive: phone widths use a single-column compact
 * header; tablet widths gain larger typography, generous padding, and a wider
 * icon badge.  A centered `formMaxWidth` content track keeps line lengths
 * comfortable on iPad / wide screens.
 */
export function OnboardingShell({
    step,
    totalSteps,
    icon: Icon,
    eyebrow,
    title,
    subtitle,
    children,
    ctaLabel,
    ctaLoadingLabel,
    onCtaPress,
    canSubmit = true,
    isLoading = false,
    helperText,
    errorMessage,
    avoidKeyboard = false,
    contentBottomPadding,
    contentStyle,
}: OnboardingShellProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    const headerPaddingTop = layout.isTablet ? 36 : 28;
    const headerPaddingBottom = layout.isTablet ? 24 : 20;
    const heroIconBox = layout.isTablet ? 56 : 48;
    const heroIconSize = layout.isTablet ? 26 : 22;
    const titleTypography = layout.isTablet ? ds.typography.metricMd : ds.typography.metricSm;
    const bodyTopPadding = layout.isTablet ? 28 : 20;
    const bodyBottomPadding = contentBottomPadding ?? (layout.isTablet ? 36 : 28);
    const footerPaddingBottom = layout.isTablet ? 40 : 28;
    const showFooter = typeof ctaLabel === "string" && ctaLabel.length > 0 && typeof onCtaPress === "function";

    const body = (
        <YStack flex={1} bg={ds.colors.background}>
            <OnboardingHeader
                eyebrow={eyebrow}
                heroIconBox={heroIconBox}
                heroIconSize={heroIconSize}
                Icon={Icon}
                paddingBottom={headerPaddingBottom}
                paddingHorizontal={layout.screenPaddingHorizontal}
                paddingTop={headerPaddingTop}
                step={step}
                subtitle={subtitle}
                title={title}
                titleTypography={titleTypography}
                contentMaxWidth={layout.formMaxWidth}
                ds={ds}
                totalSteps={totalSteps}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    {
                        flexGrow: 1,
                        paddingHorizontal: layout.screenPaddingHorizontal,
                        paddingTop: bodyTopPadding,
                        paddingBottom: bodyBottomPadding,
                    },
                    contentStyle,
                ]}
            >
                <YStack
                    width="100%"
                    gap={layout.isTablet ? "$5" : "$4"}
                    style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}
                >
                    {children}
                </YStack>
            </ScrollView>

            {showFooter ? (
                <OnboardingFooter
                    canSubmit={canSubmit}
                    contentMaxWidth={layout.formMaxWidth}
                    ctaLabel={ctaLabel}
                    ctaLoadingLabel={ctaLoadingLabel ?? ctaLabel}
                    ds={ds}
                    errorMessage={errorMessage ?? null}
                    helperText={helperText}
                    isLoading={isLoading}
                    onCtaPress={onCtaPress}
                    paddingBottom={footerPaddingBottom}
                    paddingHorizontal={layout.screenPaddingHorizontal}
                />
            ) : null}
        </YStack>
    );

    if (!avoidKeyboard) {
        return body;
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
            style={{ flex: 1, backgroundColor: ds.colors.background }}
        >
            {body}
        </KeyboardAvoidingView>
    );
}

interface OnboardingHeaderProps {
    readonly eyebrow: string;
    readonly heroIconBox: number;
    readonly heroIconSize: number;
    readonly Icon: OnboardingIcon;
    readonly paddingBottom: number;
    readonly paddingHorizontal: number;
    readonly paddingTop: number;
    readonly step: number;
    readonly subtitle: string;
    readonly title: string;
    readonly titleTypography: { readonly fontSize: number; readonly lineHeight: number };
    readonly contentMaxWidth: number;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly totalSteps: number;
}

function OnboardingHeader({
    eyebrow,
    heroIconBox,
    heroIconSize,
    Icon,
    paddingBottom,
    paddingHorizontal,
    paddingTop,
    step,
    subtitle,
    title,
    titleTypography,
    contentMaxWidth,
    ds,
    totalSteps,
}: OnboardingHeaderProps) {
    return (
        <YStack
            px={paddingHorizontal}
            pt={paddingTop}
            pb={paddingBottom}
            borderBottomWidth={1}
            borderBottomColor={ds.colors.border}
            bg={ds.colors.background}
            gap="$4"
        >
            <YStack width="100%" style={{ maxWidth: contentMaxWidth, alignSelf: "center" }} gap="$4">
                <ProgressSegments currentStep={step} totalSteps={totalSteps} ds={ds} />

                <YStack gap="$3">
                    <Paragraph
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        {eyebrow}
                    </Paragraph>

                    <XStack items="flex-start" gap="$3">
                        <YStack
                            width={heroIconBox}
                            height={heroIconBox}
                            rounded={ds.radii.md}
                            items="center"
                            justify="center"
                            bg={ds.colors.primarySoft}
                            borderWidth={1}
                            borderColor={ds.colors.primary}
                        >
                            <Icon size={heroIconSize} color={ds.colors.primary} />
                        </YStack>
                        <YStack flex={1} gap="$2">
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.headingBold}
                                fontSize={titleTypography.fontSize}
                                lineHeight={titleTypography.lineHeight}
                                textTransform="uppercase"
                                fontStyle="italic"
                                letterSpacing={-0.5}
                            >
                                {title}
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                                lineHeight={ds.typography.bodyMd.lineHeight}
                            >
                                {subtitle}
                            </Paragraph>
                        </YStack>
                    </XStack>
                </YStack>
            </YStack>
        </YStack>
    );
}

interface ProgressSegmentsProps {
    readonly currentStep: number;
    readonly totalSteps: number;
    readonly ds: ReturnType<typeof useDesignSystem>;
}

function ProgressSegments({ currentStep, totalSteps, ds }: ProgressSegmentsProps) {
    const segments = Array.from({ length: totalSteps }, (_, index) => index + 1);

    return (
        <XStack
            gap="$2"
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
        >
            {segments.map((segmentStep) => {
                const isActive = segmentStep === currentStep;
                const isComplete = segmentStep < currentStep;
                const fillColor = isActive || isComplete ? ds.colors.primary : ds.colors.border;

                return (
                    <YStack
                        key={segmentStep}
                        flex={1}
                        height={6}
                        rounded={ds.radii.full}
                        bg={fillColor}
                        opacity={isComplete ? 0.85 : 1}
                    />
                );
            })}
        </XStack>
    );
}

interface OnboardingFooterProps {
    readonly canSubmit: boolean;
    readonly contentMaxWidth: number;
    readonly ctaLabel: string;
    readonly ctaLoadingLabel: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly errorMessage: string | null;
    readonly helperText: string | undefined;
    readonly isLoading: boolean;
    readonly onCtaPress: () => void;
    readonly paddingBottom: number;
    readonly paddingHorizontal: number;
}

function OnboardingFooter({
    canSubmit,
    contentMaxWidth,
    ctaLabel,
    ctaLoadingLabel,
    ds,
    errorMessage,
    helperText,
    isLoading,
    onCtaPress,
    paddingBottom,
    paddingHorizontal,
}: OnboardingFooterProps) {
    const isInteractive = canSubmit && !isLoading;
    return (
        <YStack
            px={paddingHorizontal}
            pt="$4"
            pb={paddingBottom}
            borderTopWidth={1}
            borderTopColor={ds.colors.border}
            bg={ds.colors.background}
        >
            <YStack width="100%" gap="$3" style={{ maxWidth: contentMaxWidth, alignSelf: "center" }}>
                {errorMessage !== null ? (
                    <YStack
                        borderWidth={1}
                        borderColor={ds.colors.danger}
                        bg={ds.colors.dangerSoft}
                        rounded={ds.radii.md}
                        p="$3"
                    >
                        <Paragraph color={ds.colors.danger} fontFamily={ds.fonts.bodyMedium}>
                            {errorMessage}
                        </Paragraph>
                    </YStack>
                ) : null}

                {typeof helperText === "string" && helperText.length > 0 ? (
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                        lineHeight={ds.typography.bodySm.lineHeight}
                        style={{ textAlign: "center" }}
                    >
                        {helperText}
                    </Paragraph>
                ) : null}

                <Button
                    height={56}
                    rounded={ds.radii.md}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    disabled={!isInteractive}
                    opacity={isInteractive ? 1 : 0.5}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={onCtaPress}
                    style={{ boxShadow: isInteractive ? ds.shadows.accent : "none" }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !isInteractive, busy: isLoading }}
                >
                    <XStack items="center" gap="$2">
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelLg.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.4}
                        >
                            {isLoading ? ctaLoadingLabel : ctaLabel}
                        </Text>
                        <ArrowRight size={16} color={ds.colors.primaryForeground} />
                    </XStack>
                </Button>
            </YStack>
        </YStack>
    );
}

/**
 * Standardized inline error card used inside an onboarding screen body
 * (above the sticky footer).  Use this when an error needs to live next to
 * a specific input rather than at the bottom of the screen.
 */
export function OnboardingInlineError({
    message,
    ds,
}: {
    readonly message: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
}) {
    return (
        <YStack borderWidth={1} borderColor={ds.colors.danger} bg={ds.colors.dangerSoft} rounded={ds.radii.md} p="$3">
            <Paragraph color={ds.colors.danger} fontFamily={ds.fonts.bodyMedium}>
                {message}
            </Paragraph>
        </YStack>
    );
}
