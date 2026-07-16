import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BackHandler, Platform, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { AppButton } from "components/ui/app-button";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { MOTION, useDesignSystem } from "lib/design-system";

export interface ConfirmOptions {
    readonly title: string;
    readonly message: string;
    readonly confirmLabel: string;
    /**
     * Label for the secondary (cancel) button. When absent the dialog is an
     * acknowledge-only notice: just the primary button renders, and dismissing
     * via the scrim or Android back resolves the same as confirming.
     */
    readonly cancelLabel?: string | undefined;
    /** Optional heading for `items`, e.g. "Unanswered questions:". */
    readonly listLabel?: string | undefined;
    /** Optional detail lines rendered as a scrollable list under the message. */
    readonly items?: readonly string[] | undefined;
}

export interface ConfirmDialogProps extends ConfirmOptions {
    readonly onConfirm: () => void;
    readonly onCancel: () => void;
}

/** Cap the list so a long list of unanswered questions cannot push the buttons off-screen. */
const ITEM_LIST_MAX_HEIGHT = 168;

/**
 * Branded confirm dialog rendered as an absolute overlay INSIDE the current
 * screen's window - deliberately not a React Native `Alert`/`Modal`. On Android
 * those spawn a separate native dialog window that does not inherit the
 * activity's hidden-navigation-bar flag (applied app-wide by
 * `useHiddenAndroidNavBar`), so opening one reveals the system navigation bar
 * and shoves the audit footer upward. An in-window overlay keeps the hidden nav
 * bar hidden, so nothing shifts.
 *
 * @param props Dialog copy, optional detail list, and the two outcome handlers.
 * @returns Full-bleed scrim with a centered brand card.
 */
export function ConfirmDialog({
    title,
    message,
    confirmLabel,
    cancelLabel,
    listLabel,
    items,
    onConfirm,
    onCancel,
}: Readonly<ConfirmDialogProps>) {
    const ds = useDesignSystem();
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();
    const progress = useSharedValue<number>(reducedMotion ? 1 : 0);

    useEffect(() => {
        if (reducedMotion) {
            progress.value = 1;
            return;
        }

        progress.value = withTiming(1, {
            duration: MOTION.durationBase,
            easing: Easing.out(Easing.quad),
        });
    }, [progress, reducedMotion]);

    // Acknowledge-only dialogs (no cancel button) treat every dismissal -
    // scrim tap, Android back - as the acknowledgement itself.
    const dismiss = cancelLabel === undefined ? onConfirm : onCancel;

    /**
     * The Android hardware back button must dismiss the dialog rather than pop
     * the screen underneath it, which would strand the auditor mid-section (G2).
     */
    useEffect(() => {
        if (Platform.OS !== "android") {
            return;
        }

        const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
            dismiss();
            return true;
        });

        return () => {
            subscription.remove();
        };
    }, [dismiss]);

    const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
    const cardStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scale: 0.96 + progress.value * 0.04 }],
    }));

    const hasItems = items !== undefined && items.length > 0;

    return (
        <Animated.View
            accessibilityViewIsModal={true}
            style={[
                {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 100_000,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: insets.top + 24,
                    paddingBottom: insets.bottom + 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    backgroundColor: "rgba(7, 9, 11, 0.55)",
                },
                scrimStyle,
            ]}
        >
            {/* Tapping the scrim is the one-handed way out (G2/G3). */}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={cancelLabel ?? confirmLabel}
                onPress={dismiss}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <Animated.View style={[{ width: "100%", maxWidth: 420 }, cardStyle]}>
                <YStack
                    width="100%"
                    gap="$4"
                    p="$5"
                    rounded={ds.radii.lg}
                    bg={ds.colors.surface}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    style={{ boxShadow: ds.shadows.card }}
                >
                    <YStack gap="$2">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.titleMd.fontSize}
                            lineHeight={ds.typography.titleMd.lineHeight}
                        >
                            {title}
                        </Text>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyMd.fontSize}
                            lineHeight={ds.typography.bodyMd.lineHeight}
                        >
                            {message}
                        </Paragraph>
                    </YStack>

                    {!hasItems ? null : (
                        <YStack gap="$2">
                            {listLabel === undefined ? null : (
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelSm.fontSize}
                                    lineHeight={ds.typography.labelSm.lineHeight}
                                    textTransform="uppercase"
                                    letterSpacing={1.2}
                                >
                                    {listLabel}
                                </Text>
                            )}
                            <YStack
                                rounded={ds.radii.md}
                                bg={ds.colors.mutedSurface}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                overflow="hidden"
                            >
                                <ScrollView style={{ maxHeight: ITEM_LIST_MAX_HEIGHT }}>
                                    {/* Short question codes read better as wrapped
                                        chips than as one sparse row each. */}
                                    <XStack flexWrap="wrap" gap="$2" p="$3">
                                        {items.map((item) => (
                                            <YStack
                                                key={item}
                                                rounded={ds.radii.sm}
                                                px="$2.5"
                                                py="$1.5"
                                                bg={ds.colors.primarySoft}
                                            >
                                                <Text
                                                    color={ds.colors.primary}
                                                    fontFamily={ds.fonts.monoBold}
                                                    fontSize={ds.typography.labelSm.fontSize}
                                                    lineHeight={ds.typography.labelSm.lineHeight}
                                                >
                                                    {item}
                                                </Text>
                                            </YStack>
                                        ))}
                                    </XStack>
                                </ScrollView>
                            </YStack>
                        </YStack>
                    )}

                    {/* Stacked full-width targets: glove-first, one-handed (G3). */}
                    <YStack gap="$2.5">
                        <AppButton variant="primary" label={confirmLabel} onPress={onConfirm} />
                        {cancelLabel === undefined ? null : (
                            <AppButton variant="secondary" label={cancelLabel} onPress={onCancel} />
                        )}
                    </YStack>
                </YStack>
            </Animated.View>
        </Animated.View>
    );
}

/**
 * Imperative confirm backed by the in-window `ConfirmDialog`. `requestConfirm`
 * resolves to the user's choice; render `confirmDialog` inside the screen tree
 * (it is `null` while nothing is pending) so the overlay stays within the
 * activity's window and the Android navigation bar remains hidden.
 *
 * @returns The request function and the element to render.
 */
export function useConfirmDialog(): {
    requestConfirm: (options: ConfirmOptions) => Promise<boolean>;
    confirmDialog: ReactNode;
} {
    const [active, setActive] = useState<PendingConfirm | null>(null);
    // A single overlay cannot stack, so requests that arrive while another
    // dialog is showing wait in FIFO order instead of replacing the active one
    // (which would leave its promise unresolved forever).
    const queueRef = useRef<PendingConfirm[]>([]);
    const activeRef = useRef<PendingConfirm | null>(null);
    const nextIdRef = useRef(0);

    const requestConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            nextIdRef.current += 1;
            const entry: PendingConfirm = { id: nextIdRef.current, options, resolve };
            if (activeRef.current === null) {
                activeRef.current = entry;
                setActive(entry);
                return;
            }
            queueRef.current.push(entry);
        });
    }, []);

    // Settlement is id-checked: the outgoing dialog stays mounted until React
    // re-renders, so a duplicate dismissal (e.g. two rapid Android-back
    // presses) could otherwise settle the NEXT queued request before its
    // dialog was ever shown.
    const settle = useCallback((id: number, value: boolean) => {
        const settled = activeRef.current;
        if (settled === null || settled.id !== id) {
            return;
        }
        const next = queueRef.current.shift() ?? null;
        activeRef.current = next;
        setActive(next);
        settled.resolve(value);
    }, []);

    // Keyed per request so each queued dialog remounts with a fresh entrance
    // animation instead of morphing the previous card's copy in place.
    const confirmDialog =
        active === null ? null : (
            <ConfirmDialog
                key={active.id}
                {...active.options}
                onConfirm={() => {
                    settle(active.id, true);
                }}
                onCancel={() => {
                    settle(active.id, false);
                }}
            />
        );

    return { requestConfirm, confirmDialog };
}

interface PendingConfirm {
    readonly id: number;
    readonly options: ConfirmOptions;
    readonly resolve: (value: boolean) => void;
}

const ConfirmDialogContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * Root-level host for the in-window confirm dialog. Mounting this once (in
 * `app/_layout.tsx`, inside the Tamagui provider) renders the overlay after
 * `children`, so it covers tab bars, audit footers, and screens that are bare
 * `ScrollView`s - an overlay rendered inside those would scroll with the
 * content instead of covering the screen.
 */
export function ConfirmDialogProvider({ children }: Readonly<{ children: ReactNode }>) {
    const { requestConfirm, confirmDialog } = useConfirmDialog();

    return (
        <ConfirmDialogContext.Provider value={requestConfirm}>
            {children}
            {confirmDialog}
        </ConfirmDialogContext.Provider>
    );
}

/**
 * Confirm request backed by the root `ConfirmDialogProvider` overlay. Resolves
 * `true` when the primary action is chosen; `false` on cancel. Acknowledge-only
 * dialogs (no `cancelLabel`) always resolve `true`.
 */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
    const requestConfirm = useContext(ConfirmDialogContext);
    if (requestConfirm === null) {
        throw new Error("useConfirm must be used inside ConfirmDialogProvider");
    }
    return requestConfirm;
}
