import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { type Href, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ArrowRight, ClipboardList } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";

import { getExecuteFlowSubject } from "lib/audit/execute-flow";
import { canEditAuditInputs, shouldPersistCleanupWrite } from "lib/audit/store-sync-core";
import { useDesignSystem } from "lib/design-system";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    getInstrumentSectionLocalProgress,
    getPreAuditValues,
    getVisiblePreAuditQuestions,
    getVisibleSections,
    isRequiredPreAuditComplete,
} from "lib/audit/selectors";
import type { AuditSession, PreAuditQuestion } from "lib/audit/types";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

interface CenteredMessageCardProps {
    readonly title: string;
    readonly message: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
}

interface FieldCardProps {
    readonly title: string;
    readonly description: string | null;
    readonly children: React.ReactNode;
}

interface ChoiceFieldCardProps {
    readonly question: PreAuditQuestion;
    readonly value: string | string[] | undefined;
    readonly disabled: boolean;
    readonly onSingleSelect: (nextValue: string) => void;
    readonly onToggleSelect: (nextValue: string) => void;
}

interface MatrixFieldCardProps {
    readonly questions: readonly PreAuditQuestion[];
    readonly values: Readonly<Record<string, string | string[]>>;
    readonly disabled: boolean;
    readonly onSelectValue: (questionKey: string, optionKey: string) => void;
}

/**
 * Step-three setup screen for onsite-only questions.
 */
export default function SpaceAuditScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const navigation = useNavigation();
    const { t } = useTranslation(["audit", "common"]);
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
    const syncStateByAuditId = usePlayspaceAuditStore((state) => state.syncStateByAuditId);
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
    const latestAuditSessionRef = useRef<AuditSession | undefined>(auditSession);
    const canEditInputsRef = useRef(false);
    const scrollViewRef = useRef<ScrollView | null>(null);

    const themedHeaderOptions = useMemo(
        () => ({
            headerShown: true,
            headerBackButtonMenuEnabled: true,
            headerBackButtonDisplayMode: "generic",
            headerBackVisible: true,
            headerBlurEffect: "light",
            headerStyle: { backgroundColor: ds.colors.surface },
            headerTintColor: ds.colors.primary,
            headerTitleStyle: {
                color: ds.colors.foreground,
                fontFamily: ds.fonts.bodyBold,
            },
        }),
        [ds],
    );

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

    const canEditInputs =
        auditSession !== undefined &&
        canEditAuditInputs({
            session: auditSession,
            phase: syncStateByAuditId[auditSession.audit_id]?.phase,
        });

    useEffect(() => {
        latestAuditSessionRef.current = auditSession;
    }, [auditSession]);

    useEffect(() => {
        canEditInputsRef.current = canEditInputs;
    }, [canEditInputs]);

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

    const scrollToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: auditSession !== undefined,
        rerunKey: auditSession?.audit_id ?? placeId ?? "space-audit",
        scrollToOffset,
    });

    useLayoutEffect(() => {
        if (auditSession !== undefined) {
            navigation.setOptions({ ...themedHeaderOptions, title: `${auditSession.place_name}` });
        }
    }, [themedHeaderOptions, navigation, auditSession]);

    const flushToStore = useCallback(() => {
        const latestAuditSession = latestAuditSessionRef.current;
        if (
            pairKey === null ||
            latestAuditSession === undefined ||
            !formInitializedRef.current ||
            !canEditInputsRef.current
        ) {
            return;
        }

        if (
            !shouldPersistCleanupWrite({
                currentValue: getPreAuditValues(latestAuditSession),
                nextValue: formValuesRef.current,
            })
        ) {
            return;
        }

        applyLocalPreAudit(pairKey, formValuesRef.current);
    }, [applyLocalPreAudit, pairKey]);

    useEffect(() => {
        return () => {
            flushToStore();
        };
    }, [flushToStore]);

    const updateFormValue = useCallback(
        (key: string, value: string | string[]) => {
            if (!canEditInputs) {
                return;
            }

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
        [applyLocalPreAudit, canEditInputs, pairKey],
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
                            : t("spaceAudit.unavailableTitle", { ns: "audit" })
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
                title={t("spaceAudit.preparingTitle", { ns: "audit" })}
                message={t("spaceAudit.preparingMessage", { ns: "audit" })}
            />
        );
    }

    const selectedMode = auditSession.selected_execution_mode;
    if (selectedMode === null) {
        return (
            <CenteredMessageCard
                title={t("auditInfo.modeMissingTitle", { ns: "audit" })}
                message={t("auditInfo.modeMissingMessage", { ns: "audit" })}
                actionLabel={t("auditInfo.backToPreamble", { ns: "audit" })}
                onAction={() => {
                    router.replace(
                        `/execute/${placeId}?projectId=${encodeURIComponent(projectId)}` as Href,
                    );
                }}
            />
        );
    }

    if (selectedMode === "survey") {
        return (
            <CenteredMessageCard
                title={t("spaceAudit.skipForSurveyTitle", { ns: "audit" })}
                message={t("spaceAudit.skipForSurveyMessage", { ns: "audit" })}
                actionLabel={t("copy.continueToSubject", {
                    ns: "audit",
                    subject: t("subjects.survey", { ns: "audit" }),
                })}
                onAction={() => {
                    router.replace(
                        getFirstSectionRoute(placeId, projectId, auditSession, instrument) as Href,
                    );
                }}
            />
        );
    }

    const setupQuestions = getVisiblePreAuditQuestions(
        instrument.pre_audit_questions.filter((question) => question.page_key === "space_setup"),
        selectedMode,
    );
    const matrixQuestions = setupQuestions.filter(
        (question) => question.group_key === "current_users_matrix",
    );
    const standaloneQuestions = setupQuestions.filter(
        (question) => question.group_key !== "current_users_matrix",
    );
    const isSetupComplete = isRequiredPreAuditComplete(setupQuestions, formValues, selectedMode);
    const nextRoute = getFirstSectionRoute(placeId, projectId, auditSession, instrument);
    const flowSubject = t(`subjects.${getExecuteFlowSubject(selectedMode)}`, { ns: "audit" });

    const standaloneCards = standaloneQuestions.map((question) => {
        const questionValue = formValues[question.key];
        return (
            <ChoiceFieldCard
                key={question.key}
                question={question}
                value={questionValue}
                disabled={!canEditInputs}
                onSingleSelect={(nextValue) => {
                    updateFormValue(question.key, nextValue);
                }}
                onToggleSelect={(nextValue) => {
                    const currentValue = formValues[question.key];
                    const currentItems = Array.isArray(currentValue)
                        ? currentValue.filter((item) => typeof item === "string")
                        : [];
                    const nextItems = currentItems.includes(nextValue)
                        ? currentItems.filter((item) => item !== nextValue)
                        : [...currentItems, nextValue];
                    updateFormValue(question.key, nextItems);
                }}
            />
        );
    });

    const sidebar = (
        <YStack width={layout.supportRailWidth} gap="$3">
            <FieldCard
                title={t("spaceAudit.sidebarTitle", { ns: "audit" })}
                description={t("spaceAudit.sidebarDescription", { ns: "audit" })}
            >
                <YStack gap="$2.5">
                    <Paragraph
                        color={ds.colors.secondaryForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {t("spaceAudit.intro", { ns: "audit" })}
                    </Paragraph>
                    <SummaryRow
                        label={t("spaceAudit.title", { ns: "audit" })}
                        value={
                            isSetupComplete
                                ? t("preAudit.complete", { ns: "audit" })
                                : t("preAudit.needed", { ns: "audit" })
                        }
                    />
                </YStack>
            </FieldCard>
            <Button
                height={layout.buttonHeight}
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.input}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    flushToStore();
                    router.replace(
                        `/execute/${placeId}/pre-audit?projectId=${encodeURIComponent(projectId)}`,
                    );
                }}
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {t("spaceAudit.backToAuditInfo", { ns: "audit" })}
                </Text>
            </Button>
            <Button
                height={layout.buttonHeight}
                rounded={ds.radii.md}
                borderWidth={0}
                bg={isSetupComplete ? ds.colors.primary : ds.colors.mutedSurface}
                disabled={!isSetupComplete}
                opacity={isSetupComplete ? 1 : 0.6}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    flushToStore();
                    router.replace(nextRoute as Href);
                }}
            >
                <XStack items="center" gap="$2">
                    <Text
                        color={ds.colors.primaryForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelLg.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.1}
                    >
                        {t("copy.continueToSubject", { ns: "audit", subject: flowSubject })}
                    </Text>
                    <ArrowRight size={16} color={ds.colors.primaryForeground} />
                </XStack>
            </Button>
        </YStack>
    );

    return (
        <ScrollView
            ref={scrollViewRef}
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 132,
                gap: layout.sectionGap,
                maxWidth: layout.isTablet ? layout.contentMaxWidth : layout.formMaxWidth,
            })}
        >
            <YStack gap="$3">
                <XStack items="center" gap="$2">
                    <ClipboardList size={16} color={ds.colors.primary} />
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        {t("spaceAudit.stepEyebrow", { ns: "audit" })}
                    </Text>
                </XStack>
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
                    {t("spaceAudit.title", { ns: "audit" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                    lineHeight={ds.typography.bodyLg.lineHeight}
                >
                    {t("spaceAudit.subtitle", { ns: "audit" })}
                </Paragraph>
            </YStack>

            {layout.isTablet ? (
                <XStack gap={layout.twoPaneGap} items="flex-start">
                    <YStack flex={1} gap="$3">
                        {matrixQuestions.length > 0 ? (
                            <MatrixFieldCard
                                questions={matrixQuestions}
                                values={formValues}
                                disabled={!canEditInputs}
                                onSelectValue={(questionKey, optionKey) => {
                                    updateFormValue(questionKey, optionKey);
                                }}
                            />
                        ) : null}
                        {standaloneCards}
                        {errorMessage === null ? null : (
                            <Paragraph color={ds.colors.warning} fontFamily={ds.fonts.bodyMedium}>
                                {errorMessage}
                            </Paragraph>
                        )}
                    </YStack>
                    {sidebar}
                </XStack>
            ) : (
                <YStack gap="$3">
                    {matrixQuestions.length > 0 ? (
                        <MatrixFieldCard
                            questions={matrixQuestions}
                            values={formValues}
                            disabled={!canEditInputs}
                            onSelectValue={(questionKey, optionKey) => {
                                updateFormValue(questionKey, optionKey);
                            }}
                        />
                    ) : null}
                    {standaloneCards}
                    {errorMessage === null ? null : (
                        <Paragraph color={ds.colors.warning} fontFamily={ds.fonts.bodyMedium}>
                            {errorMessage}
                        </Paragraph>
                    )}
                    <Button
                        height={layout.controlHeight}
                        rounded={ds.radii.md}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            flushToStore();
                            router.replace(
                                `/execute/${placeId}/pre-audit?projectId=${encodeURIComponent(projectId)}` as Href,
                            );
                        }}
                    >
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {t("spaceAudit.backToAuditInfo", { ns: "audit" })}
                        </Text>
                    </Button>
                    <Button
                        height={layout.controlHeight}
                        rounded={ds.radii.md}
                        borderWidth={0}
                        bg={isSetupComplete ? ds.colors.primary : ds.colors.mutedSurface}
                        disabled={!isSetupComplete}
                        opacity={isSetupComplete ? 1 : 0.6}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            flushToStore();
                            router.replace(nextRoute as Href);
                        }}
                    >
                        <XStack items="center" gap="$2">
                            <Text
                                color={ds.colors.primaryForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelLg.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.1}
                            >
                                {t("copy.continueToSubject", {
                                    ns: "audit",
                                    subject: flowSubject,
                                })}
                            </Text>
                            <ArrowRight size={16} color={ds.colors.primaryForeground} />
                        </XStack>
                    </Button>
                </YStack>
            )}
        </ScrollView>
    );
}

/**
 * Shared shell used by the space-audit fields.
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
                        lineHeight={
                            layout.isTablet
                                ? ds.typography.bodyMd.lineHeight
                                : ds.typography.bodySm.lineHeight
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

/**
 * Render a standard single-select or multi-select question card.
 */
function ChoiceFieldCard({
    question,
    value,
    disabled,
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
                            minW={layout.isTablet ? 180 : "100%"}
                            height="auto"
                            rounded={ds.radii.md}
                            disabled={disabled}
                            borderWidth={1}
                            borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                            bg={isSelected ? ds.colors.primarySoft : ds.colors.input}
                            opacity={disabled ? 0.6 : 1}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                if (disabled) {
                                    return;
                                }
                                if (question.input_type === "single_select") {
                                    onSingleSelect(option.key);
                                    return;
                                }

                                onToggleSelect(option.key);
                            }}
                        >
                            <YStack p="$3" gap="$1" mx="$2" items="center">
                                <Text
                                    color={isSelected ? ds.colors.primary : ds.colors.foreground}
                                    fontFamily={
                                        isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium
                                    }
                                    fontSize={ds.typography.bodyMd.fontSize}
                                    style={{ textAlign: "center" }}
                                >
                                    {option.label}
                                </Text>
                                {option.description ? (
                                    <Paragraph
                                        color={ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodyXs.fontSize}
                                        style={{ textAlign: "center" }}
                                    >
                                        {option.description}
                                    </Paragraph>
                                ) : null}
                            </YStack>
                        </Button>
                    );
                })}
            </XStack>
        </FieldCard>
    );
}

/**
 * Render the age-group-by-quantity matrix with a tablet-first layout.
 */
function MatrixFieldCard({
    questions,
    values,
    disabled,
    onSelectValue,
}: Readonly<MatrixFieldCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const matrixOptions = questions[0]?.options ?? [];

    if (questions.length === 0) {
        return null;
    }

    return (
        <FieldCard title={t("spaceAudit.matrixHeading")} description={t("spaceAudit.intro")}>
            {layout.isTablet ? (
                <YStack
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    overflow="hidden"
                >
                    <XStack bg={ds.colors.surfaceMuted}>
                        <MatrixHeaderCell flex={1.4} label={t("spaceAudit.matrixAgeColumn")} />
                        {matrixOptions.map((option) => (
                            <MatrixHeaderCell key={option.key} flex={1} label={option.label} />
                        ))}
                    </XStack>
                    {questions.map((question, rowIndex) => (
                        <XStack
                            key={question.key}
                            borderTopWidth={rowIndex === 0 ? 0 : 1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surface}
                        >
                            <YStack
                                flex={1.4}
                                px="$3"
                                py="$3"
                                justify="center"
                                borderRightWidth={1}
                                borderColor={ds.colors.border}
                            >
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.bodyMd.fontSize}
                                >
                                    {question.label}
                                </Text>
                            </YStack>
                            {matrixOptions.map((option, columnIndex) => {
                                const isSelected = values[question.key] === option.key;

                                return (
                                    <YStack
                                        key={`${question.key}.${option.key}`}
                                        flex={1}
                                        px="$2"
                                        py="$2"
                                        items="center"
                                        justify="center"
                                        borderRightWidth={
                                            columnIndex === matrixOptions.length - 1 ? 0 : 1
                                        }
                                        borderColor={ds.colors.border}
                                    >
                                        <Button
                                            width={52}
                                            height={52}
                                            rounded={ds.radii.md}
                                            disabled={disabled}
                                            borderWidth={1}
                                            borderColor={
                                                isSelected ? ds.colors.primary : ds.colors.border
                                            }
                                            bg={
                                                isSelected ? ds.colors.primarySoft : ds.colors.input
                                            }
                                            opacity={disabled ? 0.6 : 1}
                                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                            onPress={() => {
                                                if (disabled) {
                                                    return;
                                                }
                                                onSelectValue(question.key, option.key);
                                            }}
                                        >
                                            <Text
                                                color={
                                                    isSelected
                                                        ? ds.colors.primary
                                                        : ds.colors.foreground
                                                }
                                                fontFamily={
                                                    isSelected
                                                        ? ds.fonts.bodyBold
                                                        : ds.fonts.bodyMedium
                                                }
                                                fontSize={ds.typography.bodySm.fontSize}
                                                style={{ textAlign: "center" }}
                                            >
                                                {option.label}
                                            </Text>
                                        </Button>
                                    </YStack>
                                );
                            })}
                        </XStack>
                    ))}
                </YStack>
            ) : (
                <YStack gap="$3">
                    {questions.map((question) => (
                        <ChoiceFieldCard
                            key={question.key}
                            question={question}
                            value={values[question.key]}
                            disabled={disabled}
                            onSingleSelect={(nextValue) => {
                                onSelectValue(question.key, nextValue);
                            }}
                            onToggleSelect={(nextValue) => {
                                onSelectValue(question.key, nextValue);
                            }}
                        />
                    ))}
                </YStack>
            )}
        </FieldCard>
    );
}

interface MatrixHeaderCellProps {
    readonly flex: number;
    readonly label: string;
}

/**
 * Header cell for the tablet matrix layout.
 */
function MatrixHeaderCell({ flex, label }: Readonly<MatrixHeaderCellProps>) {
    const ds = useDesignSystem();

    return (
        <YStack flex={flex} px="$3" py="$2.5" borderRightWidth={1} borderColor={ds.colors.border}>
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodySm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.1}
                style={{ textAlign: "center" }}
            >
                {label}
            </Text>
        </YStack>
    );
}

interface SummaryRowProps {
    readonly label: string;
    readonly value: string;
}

/**
 * Compact status row used in the tablet sidebar.
 */
function SummaryRow({ label, value }: Readonly<SummaryRowProps>) {
    const ds = useDesignSystem();

    return (
        <YStack gap="$1">
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodySm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.1}
            >
                {label}
            </Text>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodyMd.fontSize}
            >
                {value}
            </Text>
        </YStack>
    );
}

/**
 * Generic centered loading or error placeholder.
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
 * Resolve a first-section route after the setup flow.
 */
function getFirstSectionRoute(
    placeId: string,
    projectId: string,
    auditSession: AuditSession,
    instrument: ReturnType<typeof useLocalizedInstrument>,
): string {
    const sections = getVisibleSections(
        instrument,
        auditSession.selected_execution_mode,
        Object.fromEntries(
            Object.entries(auditSession.sections).map(([sectionKey, sectionState]) => [
                sectionKey,
                sectionState.responses,
            ]),
        ),
    );
    const firstIncomplete = sections.find((section) => {
        const progress = getInstrumentSectionLocalProgress(auditSession, section);
        return !progress.isComplete;
    });
    const targetSection = firstIncomplete ?? sections[0];

    if (targetSection === undefined) {
        return `/execute/${placeId}?projectId=${encodeURIComponent(projectId)}`;
    }

    return `/execute/${placeId}/section/${targetSection.section_key}?projectId=${encodeURIComponent(projectId)}`;
}

/**
 * Read a single path or query parameter.
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
