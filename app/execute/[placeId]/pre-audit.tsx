import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { type Href, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { ArrowRight, ClipboardList } from "@tamagui/lucide-icons-2";
import { doesExecutionModeRequireSpaceAudit, getExecuteFlowSubject } from "lib/audit/execute-flow";
import { useDesignSystem } from "lib/design-system";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import { getInstrumentSectionLocalProgress, getVisibleSections } from "lib/audit/selectors";
import type { AuditSession, PreAuditQuestion } from "lib/audit/types";
import { fetchMyAuditorProfile, type MyAuditorProfile } from "lib/audit/profile-api";
import { formatLocalizedDate, formatLocalizedDateTime, formatLocalizedDurationFromMinutes } from "lib/i18n/format";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Step-two setup screen that shows generated audit metadata and routes into
 * either the space-audit setup or directly into the section flow.
 */
export default function PreAuditScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const navigation = useNavigation();
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
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);

    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const pairKey = placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const auditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];
    const scrollViewRef = useRef<ScrollView | null>(null);
    const [auditorProfile, setAuditorProfile] = useState<MyAuditorProfile | null>(null);

    const themedHeaderOptions = useMemo(
        () => ({
            headerShown: true,
            headerBackButtonMenuEnabled: true,
            headerBackButtonDisplayMode: "generic",
            headerBackVisible: true,
            headerBlurEffect: "light",
            headerStyle: { backgroundColor: ds.colors.surface },
            headerTintColor: ds.colors.primary,
            contentStyle: { paddingTop: 20 },
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
        if (authSession === null) {
            setAuditorProfile(null);
            return;
        }

        fetchMyAuditorProfile(authSession)
            .then((profile) => {
                setAuditorProfile(profile);
            })
            .catch(() => {
                setAuditorProfile(null);
            });
    }, [authSession]);

    const scrollPreAuditToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: auditSession !== undefined,
        rerunKey: auditSession?.audit_id ?? placeId ?? "audit-info",
        scrollToOffset: scrollPreAuditToOffset,
    });

    useLayoutEffect(() => {
        if (auditSession === undefined) {
            return;
        }

        navigation.setOptions({
            ...themedHeaderOptions,
            headerTitle: () => (
                <YStack justify="center">
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodySemiBold}
                        fontSize={ds.typography.titleLg.fontSize}
                        lineHeight={ds.typography.titleLg.lineHeight}
                    >
                        {auditSession.place_name}
                    </Text>
                </YStack>
            ),
        });
    }, [themedHeaderOptions, navigation, auditSession, ds]);

    if (
        placeId === null ||
        projectId === null ||
        authSession === null ||
        currentUserId !== authSession.user.id ||
        auditSession === undefined
    ) {
        if (placeId !== null && projectId !== null && authSession !== null && errorMessage !== null) {
            return (
                <CenteredMessageCard
                    title={
                        errorMessage.includes("403")
                            ? t("overview.accessDeniedTitle", { ns: "audit" })
                            : t("auditInfo.unavailableTitle", { ns: "audit" })
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
                title={t("auditInfo.preparingTitle", { ns: "audit" })}
                message={t("auditInfo.preparingMessage", { ns: "audit" })}
            />
        );
    }

    if (auditSession.selected_execution_mode === null) {
        return (
            <CenteredMessageCard
                title={t("auditInfo.modeMissingTitle", { ns: "audit" })}
                message={t("auditInfo.modeMissingMessage", { ns: "audit" })}
                actionLabel={t("auditInfo.backToPreamble", { ns: "audit" })}
                onAction={() => {
                    router.replace(`/execute/${placeId}?projectId=${encodeURIComponent(projectId)}`);
                }}
            />
        );
    }

    const visibleSections = getVisibleSections(
        instrument,
        auditSession.selected_execution_mode,
        Object.fromEntries(
            Object.entries(auditSession.sections).map(([sectionKey, sectionState]) => [
                sectionKey,
                sectionState.responses,
            ]),
        ),
    );
    const firstSection = getNextSectionTarget(visibleSections, auditSession);
    const auditInfoQuestions = instrument.pre_audit_questions.filter((question) => question.page_key === "audit_info");
    const flowSubject = t(`subjects.${getExecuteFlowSubject(auditSession.selected_execution_mode)}`, {
        ns: "audit",
    });
    const nextRoute = doesExecutionModeRequireSpaceAudit(auditSession.selected_execution_mode)
        ? `/execute/${placeId}/space-audit?projectId=${encodeURIComponent(projectId)}`
        : `/execute/${placeId}/section/${firstSection?.section_key}?projectId=${encodeURIComponent(projectId)}`;

    const auditInfoCards = auditInfoQuestions.map((question) => (
        <AutoFieldCard
            key={question.key}
            question={question}
            auditSession={auditSession}
            language={i18n.language}
            auditorCode={auditorProfile?.auditor_code ?? null}
        />
    ));

    const sidebar = (
        <YStack width="100%" gap="$3">
            <FieldCard
                title={t("auditInfo.summaryTitle", { ns: "audit" })}
                description={t("auditInfo.summaryDescription", { ns: "audit" })}
            >
                <YStack gap="$2.5">
                    <SummaryRow
                        label={t("auditInfo.selectedModeLabel", { ns: "audit" })}
                        value={resolveExecutionModeLabel(auditSession.selected_execution_mode, t)}
                    />
                    <SummaryRow label={t("auditInfo.placeLabel", { ns: "audit" })} value={auditSession.place_name} />
                    <SummaryRow
                        label={t("auditInfo.projectLabel", { ns: "audit" })}
                        value={auditSession.project_name}
                    />
                </YStack>
            </FieldCard>
            <Button
                height={layout.buttonHeight}
                rounded={ds.radii.sm}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.input}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    router.replace(`/execute/${placeId}?projectId=${encodeURIComponent(projectId)}`);
                }}
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {t("auditInfo.backToPreamble", { ns: "audit" })}
                </Text>
            </Button>
            <Button
                height={layout.buttonHeight}
                rounded={ds.radii.sm}
                borderWidth={0}
                bg={ds.colors.primary}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
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
                includeTopPadding: false,
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
                        {t("auditInfo.stepEyebrow", { ns: "audit" })}
                    </Text>
                </XStack>
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={layout.isTablet ? ds.typography.displayLg.fontSize : ds.typography.displayMd.fontSize}
                    lineHeight={
                        layout.isTablet ? ds.typography.displayLg.lineHeight : ds.typography.displayMd.lineHeight
                    }
                >
                    {t("auditInfo.title", { ns: "audit" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                >
                    {t("auditInfo.subtitle", { ns: "audit" })}
                </Paragraph>
            </YStack>

            {layout.isTablet ? (
                <YStack gap="$3">
                    <YStack gap="$3">
                        {auditInfoCards}
                        {errorMessage === null ? null : (
                            <Paragraph color={ds.colors.warning} fontFamily={ds.fonts.bodyMedium}>
                                {errorMessage}
                            </Paragraph>
                        )}
                    </YStack>
                    {sidebar}
                </YStack>
            ) : (
                <YStack gap="$3">
                    {auditInfoCards}
                    {errorMessage === null ? null : (
                        <Paragraph color={ds.colors.warning} fontFamily={ds.fonts.bodyMedium}>
                            {errorMessage}
                        </Paragraph>
                    )}
                    <Button
                        height={layout.controlHeight}
                        rounded={ds.radii.sm}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            router.replace(`/execute/${placeId}?projectId=${encodeURIComponent(projectId)}`);
                        }}
                    >
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {t("auditInfo.backToPreamble", { ns: "audit" })}
                        </Text>
                    </Button>
                    <Button
                        height={layout.controlHeight}
                        rounded={ds.radii.sm}
                        borderWidth={0}
                        bg={ds.colors.primary}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
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

interface AutoFieldCardProps {
    readonly question: PreAuditQuestion;
    readonly auditSession: AuditSession;
    readonly language: string;
    readonly auditorCode: string | null;
}

/**
 * Render one read-only audit-information field.
 */
function AutoFieldCard({ question, auditSession, language, auditorCode }: Readonly<AutoFieldCardProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation("audit");
    return (
        <FieldCard title={question.label} description={question.description ?? null}>
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodyLg.fontSize}
            >
                {formatAutoValue(question.key, auditSession, language, auditorCode, t)}
            </Text>
        </FieldCard>
    );
}

interface SummaryRowProps {
    readonly label: string;
    readonly value: string;
}

/**
 * Compact sidebar summary row.
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
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.bodyMd.fontSize}>
                {value}
            </Text>
        </YStack>
    );
}

interface FieldCardProps {
    readonly title: string;
    readonly description: string | null;
    readonly children: React.ReactNode;
}

/**
 * Shared framed field shell used by the setup flow.
 */
function FieldCard({ title, description, children }: Readonly<FieldCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack
            rounded={ds.radii.md}
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
                    fontSize={layout.isTablet ? ds.typography.titleLg.fontSize : ds.typography.titleMd.fontSize}
                >
                    {title}
                </Text>
                {description === null ? null : (
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={layout.isTablet ? ds.typography.bodyMd.fontSize : ds.typography.bodySm.fontSize}
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
 * Centered loading or error state for the audit-info step.
 */
function CenteredMessageCard({ title, message, actionLabel, onAction }: Readonly<CenteredMessageCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack flex={1} justify="center" px={layout.screenPaddingHorizontal} bg={ds.colors.background}>
            <YStack
                width="100%"
                style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}
                rounded={ds.radii.md}
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
                        rounded={ds.radii.sm}
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
 * Resolve the next section the user should open after the setup flow.
 */
function getNextSectionTarget(
    sections: ReturnType<typeof getVisibleSections>,
    auditSession: AuditSession,
): ReturnType<typeof getVisibleSections>[number] | undefined {
    const firstIncomplete = sections.find((section) => {
        const progress = getInstrumentSectionLocalProgress(auditSession, section);
        return !progress.isComplete;
    });

    return firstIncomplete ?? sections[0];
}

/**
 * Convert the selected execution mode into readable UI copy.
 */
function resolveExecutionModeLabel(mode: AuditSession["selected_execution_mode"], t: TFunction): string {
    return mode === null ? t("overview.roleNotSelected", { ns: "audit" }) : getModeLabel(mode, t);
}

/**
 * Read one route parameter as a single string.
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
 * Format one auto-populated audit-info value.
 */
function formatAutoValue(
    questionKey: string,
    auditSession: AuditSession,
    language: string,
    auditorCode: string | null,
    t: TFunction<"audit">,
): string {
    if (questionKey === "auditor_code") {
        return auditorCode ?? t("auditInfo.auditorCodePending");
    }
    if (questionKey === "audit_date") {
        return formatLocalizedDate(auditSession.started_at, language);
    }
    if (questionKey === "started_at") {
        return formatLocalizedDateTime(auditSession.started_at, language);
    }
    if (questionKey === "submitted_at") {
        return auditSession.submitted_at === null
            ? t("autoValues.generatedOnSubmit")
            : formatLocalizedDateTime(auditSession.submitted_at, language);
    }
    if (questionKey === "total_minutes") {
        return auditSession.total_minutes === null
            ? t("autoValues.calculatedOnSubmit")
            : formatLocalizedDurationFromMinutes(auditSession.total_minutes, language);
    }
    return "";
}

/**
 * Compact execution-mode label for audit-info summaries.
 */
function getModeLabel(mode: NonNullable<AuditSession["selected_execution_mode"]>, t: TFunction): string {
    switch (mode) {
        case "survey":
            return t("modeShort.survey", { ns: "audit" });
        case "both":
            return t("modeShort.both", { ns: "audit" });
        case "audit":
        default:
            return t("modeShort.audit", { ns: "audit" });
    }
}
