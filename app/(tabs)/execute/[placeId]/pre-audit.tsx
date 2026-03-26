import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import { getPreAuditValues } from "lib/audit/selectors";
import type { PreAuditQuestion } from "lib/audit/types";
import { formatLocalizedDate, formatLocalizedTime } from "lib/i18n/format";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Pre-audit page for first-page auditor questions and automatic timestamps.
 *
 * Form values are kept in local state for responsive interactions and flushed
 * to the Zustand store (and then to disk) on each selection change, on blur,
 * and on component unmount. Event-driven sync then pushes dirty pre-audit
 * data to the API when connectivity is available.
 */
export default function PreAuditScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t, i18n } = useTranslation(["audit", "common"]);
    const instrument = useLocalizedInstrument();
    const params = useLocalSearchParams<{
        placeId?: string | string[];
        projectId?: string | string[];
    }>();
    const authSession = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const ensurePlaceAudit = usePlayspaceAuditStore((state) => state.ensurePlaceAudit);
    const applyLocalPreAudit = usePlayspaceAuditStore((state) => state.applyLocalPreAudit);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);

    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const pairKey =
        placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const auditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];

    const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
    const formValuesRef = useRef<Record<string, string | string[]>>({});
    const formInitializedRef = useRef(false);

    useEffect(() => {
        hydrate(authSession?.user.id ?? null).catch(() => undefined);
    }, [authSession, hydrate]);

    useEffect(() => {
        if (
            !isHydrated ||
            authSession === null ||
            currentUserId !== authSession.user.id ||
            placeId === null ||
            projectId === null
        ) {
            return;
        }
        ensurePlaceAudit(authSession, projectId, placeId).catch(() => undefined);
    }, [authSession, currentUserId, ensurePlaceAudit, isHydrated, placeId, projectId]);

    useEffect(() => {
        formInitializedRef.current = false;
    }, [auditSession?.audit_id]);

    useEffect(() => {
        if (auditSession === undefined) {
            formInitializedRef.current = false;
            formValuesRef.current = {};
            setFormValues({});
            return;
        }

        if (formInitializedRef.current) {
            return;
        }
        const stored = getPreAuditValues(auditSession);
        setFormValues(stored);
        formValuesRef.current = stored;
        formInitializedRef.current = true;
    }, [auditSession]);

    const flushToStore = useCallback(() => {
        if (pairKey !== null && formInitializedRef.current) {
            applyLocalPreAudit(pairKey, formValuesRef.current);
        }
    }, [pairKey, applyLocalPreAudit]);

    useEffect(() => {
        return () => {
            if (pairKey !== null && formInitializedRef.current) {
                applyLocalPreAudit(pairKey, formValuesRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pairKey]);

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
            if (pairKey !== null) {
                const nextValues = { ...formValuesRef.current, [key]: value };
                formValuesRef.current = nextValues;
                applyLocalPreAudit(pairKey, nextValues);
            }
        },
        [pairKey, applyLocalPreAudit],
    );

    if (
        placeId === null ||
        projectId === null ||
        authSession === null ||
        currentUserId !== authSession.user.id ||
        auditSession === undefined
    ) {
        if (
            placeId !== null &&
            projectId !== null &&
            authSession !== null &&
            errorMessage !== null
        ) {
            return (
                <CenteredMessageCard
                    title={
                        errorMessage.includes("403")
                            ? t("overview.accessDeniedTitle", { ns: "audit" })
                            : t("preAudit.unavailableTitle", { ns: "audit" })
                    }
                    message={errorMessage}
                    actionLabel={t("actions.retry", { ns: "common" })}
                    onAction={() => {
                        ensurePlaceAudit(authSession, projectId, placeId).catch(() => undefined);
                    }}
                />
            );
        }

        return (
            <CenteredMessageCard
                title={t("preAudit.preparingTitle", { ns: "audit" })}
                message={t("preAudit.preparingMessage", { ns: "audit" })}
            />
        );
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 132,
                gap: layout.sectionGap,
                maxWidth: layout.formMaxWidth,
            })}
        >
            <YStack gap="$3">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={
                        layout.isTablet
                            ? ds.typography.displayLg.fontSize
                            : ds.typography.displayMd.fontSize
                    }
                    lineHeight={
                        layout.isTablet
                            ? ds.typography.displayLg.lineHeight
                            : ds.typography.displayMd.lineHeight
                    }
                >
                    {t("preAudit.title", { ns: "audit" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                >
                    {t("preAudit.subtitle", { ns: "audit" })}
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
                                language={i18n.language}
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
                <Paragraph color={ds.colors.warning} fontFamily={ds.fonts.bodyMedium}>
                    {errorMessage}
                </Paragraph>
            )}

            <Button
                height={layout.controlHeight}
                rounded={ds.radii.md}
                borderWidth={0}
                bg={ds.colors.primary}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    flushToStore();
                    router.back();
                }}
            >
                <Text
                    color={ds.colors.primaryForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelLg.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {t("preAudit.saveAndContinue", { ns: "audit" })}
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
    readonly language: string;
}

/**
 * @param props Auto-field props.
 * @returns Read-only timestamp card.
 */
function AutoFieldCard({ question, auditSession, language }: Readonly<AutoFieldCardProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation("audit");
    return (
        <FieldCard title={question.label} description={question.description ?? null}>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodyLg.fontSize}
            >
                {formatAutoValue(question.key, auditSession, language, t)}
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
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
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
                            height={layout.isTablet ? 48 : 42}
                            rounded={ds.radii.md}
                            borderWidth={1}
                            borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                            bg={isSelected ? ds.colors.primarySoft : ds.colors.input}
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
                                color={isSelected ? ds.colors.primary : ds.colors.foreground}
                                fontFamily={isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                fontSize={
                                    layout.isTablet
                                        ? ds.typography.bodyMd.fontSize
                                        : ds.typography.bodySm.fontSize
                                }
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
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            <YStack gap="$1">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={
                        layout.isTablet
                            ? ds.typography.titleLg.fontSize
                            : ds.typography.titleMd.fontSize
                    }
                >
                    {title}
                </Text>
                {description === null ? null : (
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={
                            layout.isTablet
                                ? ds.typography.bodyMd.fontSize
                                : ds.typography.bodySm.fontSize
                        }
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
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack
            flex={1}
            justify="center"
            px={layout.screenPaddingHorizontal}
            bg={ds.colors.background}
        >
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
                <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
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
    language: string,
    t: TFunction<"audit">,
): string {
    if (questionKey === "audit_date") {
        return formatLocalizedDate(auditSession.started_at, language);
    }
    if (questionKey === "started_at") {
        return formatLocalizedTime(auditSession.started_at, language);
    }
    if (questionKey === "submitted_at") {
        return auditSession.submitted_at === null
            ? t("autoValues.generatedOnSubmit")
            : formatLocalizedTime(auditSession.submitted_at, language);
    }
    if (questionKey === "total_minutes") {
        return auditSession.total_minutes === null
            ? t("autoValues.calculatedOnSubmit")
            : t("autoValues.minutes", { count: auditSession.total_minutes });
    }
    return "";
}
