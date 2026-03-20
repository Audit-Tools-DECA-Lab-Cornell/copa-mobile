import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { designSystem } from "lib/design-system";
import { getPreAuditValues } from "lib/audit/selectors";
import type { PreAuditQuestion } from "lib/audit/types";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Pre-audit page for first-page auditor questions and automatic timestamps.
 *
 * Form values are kept in local state for responsive interactions and flushed
 * to the Zustand store (and then to disk) on each selection change, on blur,
 * and on component unmount.  The background sync timer pushes dirty pre-audit
 * data to the API when connectivity is available.
 */
export default function PreAuditScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ placeId?: string | string[] }>();
    const authSession = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const ensurePlaceAudit = usePlayspaceAuditStore((state) => state.ensurePlaceAudit);
    const applyLocalPreAudit = usePlayspaceAuditStore((state) => state.applyLocalPreAudit);
    const instrument = usePlayspaceAuditStore((state) => state.instrument);
    const sessionsByPlaceId = usePlayspaceAuditStore((state) => state.sessionsByPlaceId);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);

    const placeId = readSingleParam(params.placeId);
    const auditSession = placeId === null ? undefined : sessionsByPlaceId[placeId];

    const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
    const formValuesRef = useRef<Record<string, string | string[]>>({});
    const formInitializedRef = useRef(false);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (!isHydrated || authSession === null || placeId === null) {
            return;
        }
        void ensurePlaceAudit(authSession, placeId).catch(() => {});
    }, [authSession, ensurePlaceAudit, isHydrated, placeId]);

    useEffect(() => {
        if (formInitializedRef.current || auditSession === undefined) {
            return;
        }
        const stored = getPreAuditValues(auditSession);
        setFormValues(stored);
        formValuesRef.current = stored;
        formInitializedRef.current = true;
    }, [auditSession]);

    const flushToStore = useCallback(() => {
        if (placeId !== null && formInitializedRef.current) {
            applyLocalPreAudit(placeId, formValuesRef.current);
        }
    }, [placeId, applyLocalPreAudit]);

    useEffect(() => {
        return () => {
            if (placeId !== null && formInitializedRef.current) {
                applyLocalPreAudit(placeId, formValuesRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [placeId]);

    /**
     * Helper to update local state AND the ref, then immediately flush to store.
     */
    const updateFormValue = useCallback(
        (key: string, value: string | string[]) => {
            setFormValues((current) => {
                const next = { ...current, [key]: value };
                formValuesRef.current = next;
                return next;
            });
            if (placeId !== null) {
                const nextValues = { ...formValuesRef.current, [key]: value };
                formValuesRef.current = nextValues;
                applyLocalPreAudit(placeId, nextValues);
            }
        },
        [placeId, applyLocalPreAudit],
    );

    if (
        placeId === null ||
        authSession === null ||
        instrument === null ||
        auditSession === undefined
    ) {
        if (placeId !== null && authSession !== null && errorMessage !== null) {
            return (
                <CenteredMessageCard
                    title={errorMessage.includes("403") ? "Access Denied" : "Pre-Audit Unavailable"}
                    message={errorMessage}
                    actionLabel="Retry"
                    onAction={() => {
                        void ensurePlaceAudit(authSession, placeId).catch(() => {});
                    }}
                />
            );
        }

        return (
            <CenteredMessageCard
                title="Preparing Pre-Audit"
                message="Loading the pre-audit questions and any saved draft values..."
            />
        );
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: designSystem.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: designSystem.spacing.screenPaddingHorizontal,
                paddingTop: designSystem.spacing.screenPaddingVertical,
                paddingBottom: 132,
                gap: 20,
            }}
        >
            <YStack gap="$3">
                <Text
                    color={designSystem.colors.foreground}
                    fontFamily={designSystem.fonts.headingBold}
                    fontSize={designSystem.typography.displayMd.fontSize}
                    lineHeight={designSystem.typography.displayMd.lineHeight}
                >
                    Pre-Audit Setup
                </Text>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyLg.fontSize}
                >
                    Complete the first-page context questions before moving through the section
                    pages.
                </Paragraph>
            </YStack>

            <YStack gap="$3">
                {instrument.pre_audit_questions.map((question) => {
                    if (question.input_type === "auto_timestamp") {
                        return (
                            <AutoFieldCard
                                key={question.key}
                                question={question}
                                auditSession={auditSession}
                            />
                        );
                    }

                    const questionValue = formValues[question.key];
                    return (
                        <ChoiceFieldCard
                            key={question.key}
                            question={question}
                            value={questionValue}
                            onSingleSelect={(nextValue) => {
                                updateFormValue(question.key, nextValue);
                            }}
                            onToggleSelect={(nextValue) => {
                                const currentValue = formValues[question.key];
                                const currentItems = Array.isArray(currentValue)
                                    ? currentValue.filter((v) => typeof v === "string")
                                    : [];
                                const nextItems = currentItems.includes(nextValue)
                                    ? currentItems.filter((v) => v !== nextValue)
                                    : [...currentItems, nextValue];
                                updateFormValue(question.key, nextItems);
                            }}
                        />
                    );
                })}
            </YStack>

            {errorMessage === null ? null : (
                <Paragraph
                    color={designSystem.colors.warning}
                    fontFamily={designSystem.fonts.bodyMedium}
                >
                    {errorMessage}
                </Paragraph>
            )}

            <Button
                height={52}
                rounded={designSystem.radii.md}
                borderWidth={0}
                bg={designSystem.colors.primary}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    flushToStore();
                    router.replace(`/(tabs)/execute/${placeId}`);
                }}
            >
                <Text
                    color={designSystem.colors.primaryForeground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.labelLg.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    Save pre-audit and continue
                </Text>
            </Button>
        </ScrollView>
    );
}

interface AutoFieldCardProps {
    readonly question: PreAuditQuestion;
    readonly auditSession: {
        readonly started_at: string;
        readonly submitted_at: string | null;
        readonly total_minutes: number | null;
    };
}

/**
 * @param props Auto-field props.
 * @returns Read-only timestamp card.
 */
function AutoFieldCard({ question, auditSession }: Readonly<AutoFieldCardProps>) {
    return (
        <FieldCard title={question.label} description={question.description ?? null}>
            <Text
                color={designSystem.colors.foreground}
                fontFamily={designSystem.fonts.bodyBold}
                fontSize={designSystem.typography.bodyLg.fontSize}
            >
                {formatAutoValue(question.key, auditSession)}
            </Text>
        </FieldCard>
    );
}

interface ChoiceFieldCardProps {
    readonly question: PreAuditQuestion;
    readonly value: string | string[] | undefined;
    readonly onSingleSelect: (nextValue: string) => void;
    readonly onToggleSelect: (nextValue: string) => void;
}

/**
 * @param props Choice question props.
 * @returns Selectable option card.
 */
function ChoiceFieldCard({
    question,
    value,
    onSingleSelect,
    onToggleSelect,
}: Readonly<ChoiceFieldCardProps>) {
    const selectedValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

    return (
        <FieldCard title={question.label} description={question.description ?? null}>
            <XStack gap="$2" flexWrap="wrap" justify="space-between">
                {question.options.map((option) => {
                    const isSelected = selectedValues.includes(option.key);

                    return (
                        <Button
                            key={`${question.key}.${option.key}`}
                            width="48.5%"
                            height={42}
                            rounded={designSystem.radii.md}
                            borderWidth={1}
                            borderColor={
                                isSelected
                                    ? designSystem.colors.primary
                                    : designSystem.colors.border
                            }
                            bg={
                                isSelected
                                    ? designSystem.colors.primarySoft
                                    : designSystem.colors.input
                            }
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                if (question.input_type === "single_select") {
                                    onSingleSelect(option.key);
                                    return;
                                }
                                onToggleSelect(option.key);
                            }}
                        >
                            <Text
                                color={
                                    isSelected
                                        ? designSystem.colors.primary
                                        : designSystem.colors.foreground
                                }
                                fontFamily={
                                    isSelected
                                        ? designSystem.fonts.bodyBold
                                        : designSystem.fonts.bodyMedium
                                }
                                fontSize={designSystem.typography.bodySm.fontSize}
                                numberOfLines={2}
                                style={{ textAlign: "center" }}
                            >
                                {option.label}
                            </Text>
                        </Button>
                    );
                })}
            </XStack>
        </FieldCard>
    );
}

interface FieldCardProps {
    readonly title: string;
    readonly description: string | null;
    readonly children: ReactNode;
}

/**
 * @param props Field shell props.
 * @returns Framed field card.
 */
function FieldCard({ title, description, children }: Readonly<FieldCardProps>) {
    return (
        <YStack
            rounded={designSystem.radii.lg}
            borderWidth={1}
            borderColor={designSystem.colors.border}
            bg={designSystem.colors.surface}
            p="$4"
            gap="$3"
            style={{ boxShadow: designSystem.shadows.card }}
        >
            <YStack gap="$1">
                <Text
                    color={designSystem.colors.foreground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.titleMd.fontSize}
                >
                    {title}
                </Text>
                {description === null ? null : (
                    <Paragraph
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyMedium}
                        fontSize={designSystem.typography.bodySm.fontSize}
                    >
                        {description}
                    </Paragraph>
                )}
            </YStack>
            {children}
        </YStack>
    );
}

interface CenteredMessageCardProps {
    readonly title: string;
    readonly message: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
}

/**
 * @param props Message card props.
 * @returns Centered loading/error card.
 */
function CenteredMessageCard({
    title,
    message,
    actionLabel,
    onAction,
}: Readonly<CenteredMessageCardProps>) {
    return (
        <YStack
            flex={1}
            justify="center"
            px={designSystem.spacing.screenPaddingHorizontal}
            bg={designSystem.colors.background}
        >
            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.border}
                bg={designSystem.colors.surface}
                p="$4"
                gap="$2"
            >
                <Text
                    color={designSystem.colors.foreground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.titleLg.fontSize}
                >
                    {title}
                </Text>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                >
                    {message}
                </Paragraph>
                {actionLabel !== undefined && typeof onAction === "function" ? (
                    <Button
                        mt="$2"
                        height={44}
                        rounded={designSystem.radii.md}
                        borderWidth={1}
                        borderColor={designSystem.colors.border}
                        bg={designSystem.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={onAction}
                    >
                        <Text
                            color={designSystem.colors.foreground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={designSystem.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {actionLabel}
                        </Text>
                    </Button>
                ) : null}
            </YStack>
        </YStack>
    );
}

/**
 * @param value Raw route parameter.
 * @returns First string value or null.
 */
function readSingleParam(value: string | string[] | undefined): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim().length > 0) {
        return value[0];
    }
    return null;
}

/**
 * @param questionKey Auto field key.
 * @param auditSession Minimal audit session timestamp data.
 * @returns Readable automatic value.
 */
function formatAutoValue(
    questionKey: string,
    auditSession: {
        readonly started_at: string;
        readonly submitted_at: string | null;
        readonly total_minutes: number | null;
    },
): string {
    if (questionKey === "audit_date") {
        return new Date(auditSession.started_at).toLocaleDateString();
    }
    if (questionKey === "started_at") {
        return new Date(auditSession.started_at).toLocaleTimeString();
    }
    if (questionKey === "submitted_at") {
        return auditSession.submitted_at === null
            ? "Generated on final submit"
            : new Date(auditSession.submitted_at).toLocaleTimeString();
    }
    if (questionKey === "total_minutes") {
        return auditSession.total_minutes === null
            ? "Calculated on final submit"
            : `${auditSession.total_minutes} minutes`;
    }
    return "";
}
