import { useEffect, useMemo } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, CircleCheckBig, ClipboardList, Shapes } from "@tamagui/lucide-icons";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { designSystem } from "lib/design-system";
import { getVisibleSections } from "lib/audit/selectors";
import type { AssignmentRoles, ExecutionMode } from "lib/audit/types";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Place-scoped execute overview with preamble, mode selection, and section routing.
 */
export default function ExecutePlaceScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ placeId?: string | string[] }>();
    const authSession = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const ensurePlaceAudit = usePlayspaceAuditStore((state) => state.ensurePlaceAudit);
    const submitAuditSession = usePlayspaceAuditStore((state) => state.submitAuditSession);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const isLoadingAudit = usePlayspaceAuditStore((state) => state.isLoadingAudit);
    const isSavingDraft = usePlayspaceAuditStore((state) => state.isSavingDraft);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);
    const instrument = usePlayspaceAuditStore((state) => state.instrument);
    const sessionsByPlaceId = usePlayspaceAuditStore((state) => state.sessionsByPlaceId);

    const placeId = readSingleParam(params.placeId);
    const auditSession = placeId === null ? undefined : sessionsByPlaceId[placeId];

    useEffect(() => {
        hydrate().catch(() => undefined);
    }, [hydrate]);

    useEffect(() => {
        if (!isHydrated || authSession === null || placeId === null) {
            return;
        }

        ensurePlaceAudit(authSession, placeId).catch(() => undefined);
    }, [authSession, ensurePlaceAudit, isHydrated, placeId]);

    const placeLocality = useMemo(() => {
        if (auditSession === undefined) {
            return "";
        }
        return auditSession.place_type ?? "Assigned place";
    }, [auditSession]);

    const visibleSections = useMemo(() => {
        if (instrument === null || auditSession === undefined) {
            return [];
        }
        return getVisibleSections(instrument, auditSession.selected_execution_mode);
    }, [auditSession, instrument]);

    if (placeId === null) {
        return (
            <CenteredMessageCard
                title="Place Not Found"
                message="The selected place route is invalid. Return to the Execute tab and choose a place again."
            />
        );
    }

    if (errorMessage !== null && auditSession === undefined) {
        return (
            <CenteredMessageCard
                title={errorMessage.includes("403") ? "Access Denied" : "Audit Unavailable"}
                message={errorMessage}
                actionLabel="Retry"
                onAction={() => {
                    if (authSession === null) {
                        return;
                    }
                    ensurePlaceAudit(authSession, placeId).catch(() => undefined);
                }}
            />
        );
    }

    if (!isHydrated || authSession === null || auditSession === undefined) {
        return (
            <CenteredMessageCard
                title="Preparing Audit"
                message={
                    isLoadingAudit
                        ? "Loading your current draft..."
                        : "Preparing the playspace audit flow..."
                }
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
                    {auditSession.place_name}
                </Text>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyLg.fontSize}
                    textTransform="capitalize"
                >
                    {placeLocality}
                </Paragraph>
            </YStack>

            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.border}
                bg={designSystem.colors.surface}
                p="$4"
                gap="$3"
                style={{
                    boxShadow: designSystem.shadows.card,
                }}
            >
                <XStack items="center" gap="$2">
                    <Shapes size={16} color={designSystem.colors.primary} />
                    <Text
                        color={designSystem.colors.primary}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        Preamble
                    </Text>
                </XStack>
                {instrument.preamble.map((paragraph) => {
                    return (
                        <Paragraph
                            key={paragraph}
                            color={designSystem.colors.secondaryForeground}
                            fontFamily={designSystem.fonts.bodyMedium}
                            fontSize={designSystem.typography.bodyMd.fontSize}
                        >
                            {paragraph}
                        </Paragraph>
                    );
                })}
            </YStack>

            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.border}
                bg={designSystem.colors.surface}
                p="$4"
                gap="$3"
                style={{
                    boxShadow: designSystem.shadows.card,
                }}
            >
                <XStack items="center" gap="$2">
                    <ClipboardList size={16} color={designSystem.colors.primary} />
                    <Text
                        color={designSystem.colors.primary}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        Audit Role
                    </Text>
                </XStack>
                <Paragraph
                    color={designSystem.colors.secondaryForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyMd.fontSize}
                    lineHeight={designSystem.typography.bodyMd.lineHeight}
                >
                    This place assignment currently allows:{" "}
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.bodyMd.fontSize}
                    >
                        {formatAssignmentRoles(auditSession.assignment_roles)}
                    </Text>
                </Paragraph>

                {auditSession.allowed_execution_modes.length > 1 ? (
                    <YStack gap="$2.5">
                        <Paragraph
                            color={designSystem.colors.mutedForeground}
                            fontFamily={designSystem.fonts.bodyMedium}
                            fontSize={designSystem.typography.bodyMd.fontSize}
                            lineHeight={designSystem.typography.bodyMd.lineHeight}
                        >
                            Choose what part of the tool you will complete for this place.
                        </Paragraph>
                        {instrument.execution_modes
                            .filter((option) => {
                                return auditSession.allowed_execution_modes.includes(
                                    option.key as ExecutionMode,
                                );
                            })
                            .map((option) => {
                                const isSelected =
                                    auditSession.selected_execution_mode === option.key;

                                return (
                                    <Button
                                        key={option.key}
                                        height={56}
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
                                            if (authSession === null) {
                                                return;
                                            }
                                            ensurePlaceAudit(
                                                authSession,
                                                placeId,
                                                option.key as ExecutionMode,
                                            ).catch(() => {});
                                        }}
                                    >
                                        <YStack gap="$1" items="flex-start">
                                            <Text
                                                color={
                                                    isSelected
                                                        ? designSystem.colors.primary
                                                        : designSystem.colors.foreground
                                                }
                                                fontFamily={designSystem.fonts.bodyBold}
                                                fontSize={designSystem.typography.bodyMd.fontSize}
                                            >
                                                {option.label}
                                            </Text>
                                            {option.description ? (
                                                <Paragraph
                                                    color={designSystem.colors.mutedForeground}
                                                    fontFamily={designSystem.fonts.bodyMedium}
                                                    fontSize={
                                                        designSystem.typography.bodySm.fontSize
                                                    }
                                                >
                                                    {option.description}
                                                </Paragraph>
                                            ) : null}
                                        </YStack>
                                    </Button>
                                );
                            })}
                    </YStack>
                ) : (
                    <Paragraph
                        color={designSystem.colors.secondaryForeground}
                        fontFamily={designSystem.fonts.bodyMedium}
                        fontSize={designSystem.typography.bodyMd.fontSize}
                        lineHeight={designSystem.typography.bodyMd.lineHeight}
                    >
                        Your role already fixes the visible subset of questions for this place.
                    </Paragraph>
                )}
            </YStack>

            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.border}
                bg={designSystem.colors.surface}
                p="$4"
                gap="$3"
                style={{
                    boxShadow: designSystem.shadows.card,
                }}
            >
                <XStack items="center" justify="space-between">
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.titleMd.fontSize}
                    >
                        Pre-Audit Setup
                    </Text>
                    <Text
                        color={
                            auditSession.progress.required_pre_audit_complete
                                ? designSystem.colors.success
                                : designSystem.colors.warning
                        }
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.1}
                    >
                        {auditSession.progress.required_pre_audit_complete ? "Complete" : "Needed"}
                    </Text>
                </XStack>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyMd.fontSize}
                    lineHeight={designSystem.typography.bodyMd.lineHeight}
                >
                    Capture season, weather, users present, user count, age groups, and place size
                    before section scoring.
                </Paragraph>
                <Button
                    height={48}
                    rounded={designSystem.radii.md}
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    bg={designSystem.colors.input}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push(`/(tabs)/execute/${placeId}/pre-audit`);
                    }}
                >
                    <XStack items="center" gap="$2">
                        <Text
                            color={designSystem.colors.foreground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={designSystem.typography.labelLg.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Open pre-audit page
                        </Text>
                        <ArrowRight size={16} color={designSystem.colors.foreground} />
                    </XStack>
                </Button>
            </YStack>

            <YStack gap="$3">
                {visibleSections.map((section) => {
                    const progress = auditSession.progress.sections.find((entry) => {
                        return entry.section_key === section.section_key;
                    });
                    const isComplete = progress?.is_complete === true;

                    return (
                        <YStack
                            key={section.section_key}
                            rounded={designSystem.radii.lg}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surface}
                            p="$4"
                            gap="$3"
                            style={{
                                boxShadow: designSystem.shadows.card,
                            }}
                        >
                            <XStack justify="space-between" items="flex-start" gap="$3">
                                <YStack flex={1} gap="$1.5">
                                    <Text
                                        color={designSystem.colors.foreground}
                                        fontFamily={designSystem.fonts.bodyBold}
                                        fontSize={designSystem.typography.titleMd.fontSize}
                                    >
                                        {section.title}
                                    </Text>
                                    <Paragraph
                                        color={designSystem.colors.mutedForeground}
                                        fontFamily={designSystem.fonts.bodyMedium}
                                        fontSize={designSystem.typography.bodySm.fontSize}
                                    >
                                        {progress?.answered_question_count ?? 0} /{" "}
                                        {progress?.visible_question_count ??
                                            section.questions.length}{" "}
                                        answered
                                    </Paragraph>
                                </YStack>
                                {isComplete ? (
                                    <CircleCheckBig size={18} color={designSystem.colors.success} />
                                ) : null}
                            </XStack>
                            <Button
                                height={46}
                                rounded={designSystem.radii.md}
                                borderWidth={1}
                                borderColor={
                                    isComplete
                                        ? designSystem.colors.success
                                        : designSystem.colors.border
                                }
                                bg={
                                    isComplete
                                        ? designSystem.colors.successSoft
                                        : designSystem.colors.input
                                }
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    router.push(
                                        `/(tabs)/execute/${placeId}/section/${section.section_key}`,
                                    );
                                }}
                            >
                                <Text
                                    color={
                                        isComplete
                                            ? designSystem.colors.success
                                            : designSystem.colors.foreground
                                    }
                                    fontFamily={designSystem.fonts.bodyBold}
                                    fontSize={designSystem.typography.labelLg.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.2}
                                >
                                    {isComplete ? "Review section" : "Open section"}
                                </Text>
                            </Button>
                        </YStack>
                    );
                })}
            </YStack>

            {auditSession.progress.ready_to_submit ? (
                <Button
                    height={52}
                    rounded={designSystem.radii.md}
                    borderWidth={0}
                    bg={designSystem.colors.primary}
                    disabled={isSavingDraft}
                    opacity={isSavingDraft ? 0.7 : 1}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        if (authSession === null) {
                            return;
                        }
                        submitAuditSession(authSession, auditSession.audit_id).catch(
                            () => undefined,
                        );
                    }}
                >
                    <Text
                        color={designSystem.colors.primaryForeground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelLg.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        Submit audit
                    </Text>
                </Button>
            ) : null}

            {errorMessage === null ? null : (
                <Paragraph
                    color={designSystem.colors.warning}
                    fontFamily={designSystem.fonts.bodyMedium}
                >
                    {errorMessage}
                </Paragraph>
            )}
        </ScrollView>
    );
}

interface CenteredMessageCardProps {
    readonly title: string;
    readonly message: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
}

/**
 * Compact centered placeholder for loading and invalid-route states.
 *
 * @param props Message card props.
 * @returns Full-screen centered message card.
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
 * Read one string route parameter from `useLocalSearchParams`.
 *
 * @param value Raw route parameter.
 * @returns The first string value or null.
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
 * Format a backend assignment role into user-facing copy.
 *
 * @param roles Assignment capabilities from the audit session.
 * @returns Human-readable role label.
 */
function formatAssignmentRoles(roles: AssignmentRoles): string {
    const hasAuditor = roles.includes("auditor");
    const hasPlaceAdmin = roles.includes("place_admin");

    if (hasAuditor && hasPlaceAdmin) {
        return "Auditor and Place Admin";
    }
    if (hasPlaceAdmin) {
        return "Place Admin";
    }
    return "Auditor";
}
