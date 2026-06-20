import { Bug, Camera, Check, X } from "@tamagui/lucide-icons-2";
import { useToastController } from "@tamagui/toast";
import { useGlobalSearchParams, useSegments } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureScreen, releaseCapture } from "react-native-view-shot";
import {
    Button,
    Input,
    Paragraph,
    ScrollView,
    Separator,
    Sheet,
    Spinner,
    Text,
    TextArea,
    XStack,
    YStack,
} from "tamagui";

import type { AuditSession } from "lib/audit/types";
import { createBugReport, matchKnownIssues } from "lib/bug-report/api";
import { type BugReportRouteContext, buildMobileBugReportContext, isDeviceOnline } from "lib/bug-report/context";
import { clearBugReportDraft, readBugReportDraft, saveBugReportDraft } from "lib/bug-report/draft-storage";
import { isBugReportingEnabled } from "lib/bug-report/feature";
import {
    isScreenshotUploadConfigured,
    uploadCapturedScreenshot,
    type UploadedScreenshot,
} from "lib/bug-report/screenshot";
import type { BugReportSeverity, KnownIssueMatch } from "lib/bug-report/types";
import { useDesignSystem } from "lib/design-system";
import { logger } from "lib/logger";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Resolve the audit the reporter is currently in from the global route params
 * and the audit store, so project/place/submission references auto-populate with
 * no questions asked. The route's ``auditId`` (a PlayspaceSubmission id) wins;
 * otherwise the in-progress session for the route's ``placeId`` is used.
 */
function resolveAuditContext(
    sessionsByAuditId: Record<string, AuditSession>,
    routeParam: { placeId?: string | undefined; auditId?: string | undefined; projectId?: string | undefined },
): { projectId: string | undefined; placeId: string | undefined; submissionId: string | undefined } {
    const sessions = Object.values(sessionsByAuditId);
    const byAuditId = routeParam.auditId ? sessionsByAuditId[routeParam.auditId] : undefined;
    const byPlace = routeParam.placeId
        ? (sessions.find((s) => s.place_id === routeParam.placeId && s.status !== "SUBMITTED") ??
          sessions.find((s) => s.place_id === routeParam.placeId))
        : undefined;
    const matched = byAuditId ?? byPlace;

    return {
        projectId: matched?.project_id ?? routeParam.projectId,
        placeId: matched?.place_id ?? routeParam.placeId,
        submissionId: matched?.audit_id ?? routeParam.auditId,
    };
}

const SEVERITIES: readonly BugReportSeverity[] = ["blocking", "major", "minor"];

/** Dot color per severity, drawn from the active design-system palette. */
function severityColor(ds: ReturnType<typeof useDesignSystem>, severity: BugReportSeverity) {
    if (severity === "blocking") return ds.colors.danger;
    if (severity === "major") return ds.colors.warning;
    return ds.colors.info;
}

// Authenticated route groups where the report button is allowed to appear.
// Auth and onboarding screens are intentionally excluded.
const AUTHENTICATED_GROUPS = new Set(["(tabs)", "execute", "place", "report", "settings"]);

/**
 * Floating "Report an issue" button mounted once in the root layout. It appears
 * on every authenticated screen (never on auth/onboarding) when developer mode
 * is enabled, and stays clear of the bottom tab bar and audit footer controls.
 *
 * Submission is online-only: an offline tap keeps the typed draft locally and
 * tells the reporter to try again once they are back online. There is no
 * background sync for bug reports by design.
 */
export function BugReportFab() {
    const ds = useDesignSystem();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation(["bugReport", "common"]);
    const toast = useToastController();
    const segments = useSegments();
    const params = useGlobalSearchParams<{ placeId?: string; auditId?: string; projectId?: string }>();
    const session = useAuthStore((state) => state.session);
    const sessionsByAuditId = usePlayspaceAuditStore((state) => state.sessionsByAuditId);

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [severity, setSeverity] = useState<BugReportSeverity>("major");
    const [screenshot, setScreenshot] = useState<UploadedScreenshot | null>(null);
    const [isAttaching, setIsAttaching] = useState(false);
    const [matches, setMatches] = useState<KnownIssueMatch[]>([]);
    const [hasCheckedMatches, setHasCheckedMatches] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const captureAndAttachScreenshot = useCallback(async () => {
        if (!isScreenshotUploadConfigured() || session === null) {
            setOpen(true);
            return;
        }

        setIsAttaching(true);
        let capturedUri: string | null = null;
        try {
            // Capture the underlying screen BEFORE the report sheet opens, so the
            // screenshot shows what the reporter was looking at, not the form.
            capturedUri = await captureScreen({
                format: "png",
                quality: 1,
                result: "tmpfile",
            });
            setOpen(true);
            const uploaded = await uploadCapturedScreenshot(session, capturedUri);
            if (uploaded) {
                setScreenshot(uploaded);
            }
        } catch (error) {
            // A screenshot is optional; never block the report on an upload failure.
            logger.error(
                "Failed to capture bug-report screenshot",
                error instanceof Error ? error.message : String(error),
            );
            setOpen(true);
            toast.show(t("screenshot.failed"));
        } finally {
            if (capturedUri) {
                releaseCapture(capturedUri);
            }
            setIsAttaching(false);
        }
    }, [session, t, toast]);

    const handleOpenReport = useCallback(() => {
        setMatches([]);
        setHasCheckedMatches(false);
        setScreenshot(null);
        void captureAndAttachScreenshot();
    }, [captureAndAttachScreenshot]);

    // Restore any locally-saved draft when the sheet opens.
    useEffect(() => {
        if (!open) return;
        const draft = readBugReportDraft();
        if (draft) {
            setTitle(draft.title);
            setDescription(draft.description);
            setSeverity(draft.severity);
        }
    }, [open]);

    // Persist the draft as the reporter types so it survives going offline.
    useEffect(() => {
        if (!open) return;
        if (title.length === 0 && description.length === 0) return;
        saveBugReportDraft({ title, description, severity });
    }, [open, title, description, severity]);

    const segment0 = String(segments[0] ?? "");
    const isVisible = isBugReportingEnabled() && session !== null && AUTHENTICATED_GROUPS.has(segment0);

    const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !isSubmitting && !isAttaching;

    const resetForm = useCallback(() => {
        setMatches([]);
        setHasCheckedMatches(false);
        setIsSubmitting(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!canSubmit || session === null) return;

        if (!(await isDeviceOnline())) {
            // Keep the draft; tell the reporter to retry when online.
            saveBugReportDraft({ title, description, severity });
            toast.show(t("errors.offline"));
            return;
        }

        // Deflection: show known-issue matches once before the first real submit.
        if (!hasCheckedMatches) {
            setIsSubmitting(true);
            try {
                const found = await matchKnownIssues(session, `${title} ${description}`);
                setHasCheckedMatches(true);
                if (found.length > 0) {
                    setMatches(found);
                    setIsSubmitting(false);
                    return;
                }
            } catch {
                setHasCheckedMatches(true);
            }
            setIsSubmitting(false);
        }

        setIsSubmitting(true);
        try {
            // Auto-populate the audit context from navigation + the audit store.
            const resolved = resolveAuditContext(sessionsByAuditId, {
                placeId: typeof params.placeId === "string" ? params.placeId : undefined,
                auditId: typeof params.auditId === "string" ? params.auditId : undefined,
                projectId: typeof params.projectId === "string" ? params.projectId : undefined,
            });
            const routeContext: BugReportRouteContext = { route: segments.join("/") };
            if (resolved.projectId) routeContext.projectId = resolved.projectId;
            if (resolved.placeId) routeContext.placeId = resolved.placeId;
            if (resolved.submissionId) routeContext.submissionId = resolved.submissionId;

            const context = await buildMobileBugReportContext(routeContext);
            await createBugReport(session, {
                surface: "mobile",
                title: title.trim(),
                description: description.trim(),
                severity,
                ...(context.project_id ? { project_id: context.project_id } : {}),
                ...(context.place_id ? { place_id: context.place_id } : {}),
                ...(context.playspace_submission_id
                    ? { playspace_submission_id: context.playspace_submission_id }
                    : {}),
                ...(screenshot ? { screenshot_url: screenshot.url, screenshot_public_id: screenshot.publicId } : {}),
                context,
            });
            clearBugReportDraft();
            toast.show(t("success"));
            setTitle("");
            setDescription("");
            setSeverity("major");
            setScreenshot(null);
            resetForm();
            setOpen(false);
        } catch {
            toast.show(t("errors.generic"));
            setIsSubmitting(false);
        }
    }, [
        canSubmit,
        description,
        hasCheckedMatches,
        params.auditId,
        params.placeId,
        params.projectId,
        resetForm,
        screenshot,
        segments,
        session,
        sessionsByAuditId,
        severity,
        t,
        title,
        toast,
    ]);

    const submitLabel = useMemo(
        () => (hasCheckedMatches && matches.length > 0 ? t("submitAnyway") : t("submit")),
        [hasCheckedMatches, matches.length, t],
    );

    if (!isVisible) {
        return null;
    }

    return (
        <>
            <YStack position="absolute" r="$4" b={insets.bottom + 88} z={50}>
                <Button
                    size="$4"
                    circular
                    bg={ds.colors.primary}
                    icon={<Bug size={20} color={ds.colors.background} />}
                    onPress={handleOpenReport}
                    accessibilityLabel={t("launch")}
                />
            </YStack>
            <Sheet
                modal
                open={open}
                onOpenChange={setOpen}
                snapPoints={[90]}
                snapPointsMode="percent"
                dismissOnSnapToBottom
                zIndex={100_000}
            >
                <Sheet.Overlay opacity={0.5} />
                <Sheet.Frame bg={ds.colors.surface} p="$4" gap="$3">
                    <Sheet.Handle bg={ds.colors.border} />
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <YStack gap="$4" pb={insets.bottom + 16}>
                            <XStack gap="$3" items="center">
                                <YStack
                                    width={40}
                                    height={40}
                                    rounded="$10"
                                    bg={ds.colors.primarySoft}
                                    items="center"
                                    justify="center"
                                >
                                    <Bug size={20} color={ds.colors.primary} />
                                </YStack>
                                <YStack flex={1} gap="$1">
                                    <Text fontSize="$7" fontWeight="700" color={ds.colors.foreground}>
                                        {t("title")}
                                    </Text>
                                    <Paragraph size="$2" color={ds.colors.mutedForeground}>
                                        {t("subtitle")}
                                    </Paragraph>
                                </YStack>
                            </XStack>

                            <Separator borderColor={ds.colors.border} />

                            <YStack gap="$1.5">
                                <Text color={ds.colors.foreground}>{t("fields.title")}</Text>
                                <Input
                                    value={title}
                                    maxLength={200}
                                    placeholder={t("placeholders.title")}
                                    onChangeText={setTitle}
                                />
                            </YStack>

                            <YStack gap="$1.5">
                                <Text color={ds.colors.foreground}>{t("fields.description")}</Text>
                                <TextArea
                                    value={description}
                                    maxLength={5000}
                                    numberOfLines={5}
                                    placeholder={t("placeholders.description")}
                                    onChangeText={setDescription}
                                />
                            </YStack>

                            <YStack gap="$1.5">
                                <Text color={ds.colors.foreground}>{t("fields.severity")}</Text>
                                <XStack gap="$2">
                                    {SEVERITIES.map((value) => {
                                        const selected = severity === value;
                                        return (
                                            <Button
                                                key={value}
                                                flex={1}
                                                height={48}
                                                rounded="$4"
                                                borderWidth={1}
                                                borderColor={selected ? ds.colors.primary : ds.colors.border}
                                                bg={selected ? ds.colors.primarySoft : ds.colors.surface}
                                                onPress={() => setSeverity(value)}
                                                pressStyle={{ opacity: 0.7 }}
                                                accessibilityLabel={t(`severity.${value}`)}
                                            >
                                                <XStack gap="$2" items="center">
                                                    <YStack
                                                        width={8}
                                                        height={8}
                                                        rounded="$10"
                                                        bg={severityColor(ds, value)}
                                                    />
                                                    <Text
                                                        fontSize="$3"
                                                        fontWeight={selected ? "700" : "500"}
                                                        color={selected ? ds.colors.primary : ds.colors.foreground}
                                                    >
                                                        {t(`severity.${value}`)}
                                                    </Text>
                                                </XStack>
                                            </Button>
                                        );
                                    })}
                                </XStack>
                            </YStack>

                            {isScreenshotUploadConfigured() ? (
                                <YStack gap="$2">
                                    <XStack justify="space-between" items="center">
                                        <Text color={ds.colors.foreground}>{t("fields.screenshot")}</Text>
                                        {screenshot ? (
                                            <XStack gap="$1.5" items="center">
                                                <Check size={14} color={ds.colors.success} />
                                                <Text fontSize="$2" color={ds.colors.success}>
                                                    {t("screenshot.attached")}
                                                </Text>
                                            </XStack>
                                        ) : null}
                                    </XStack>

                                    {isAttaching ? (
                                        <XStack
                                            height={64}
                                            rounded="$4"
                                            borderWidth={1}
                                            borderColor={ds.colors.border}
                                            bg={ds.colors.surfaceMuted}
                                            items="center"
                                            justify="center"
                                            gap="$2"
                                        >
                                            <Spinner size="small" color={ds.colors.primary} />
                                            <Text fontSize="$2" color={ds.colors.mutedForeground}>
                                                {t("screenshot.attaching")}
                                            </Text>
                                        </XStack>
                                    ) : screenshot ? (
                                        <YStack
                                            rounded="$4"
                                            overflow="hidden"
                                            borderWidth={1}
                                            borderColor={ds.colors.border}
                                        >
                                            <Image
                                                source={{ uri: screenshot.url }}
                                                style={{ width: "100%", height: 180 }}
                                                resizeMode="cover"
                                            />
                                            <Button
                                                position="absolute"
                                                t="$2"
                                                r="$2"
                                                size="$2"
                                                circular
                                                bg={ds.colors.overlay}
                                                icon={<X size={16} color="#fff" />}
                                                onPress={() => setScreenshot(null)}
                                                accessibilityLabel={t("screenshot.remove")}
                                            />
                                        </YStack>
                                    ) : (
                                        <XStack
                                            height={64}
                                            rounded="$4"
                                            borderWidth={1}
                                            borderColor={ds.colors.border}
                                            bg={ds.colors.surfaceMuted}
                                            items="center"
                                            justify="center"
                                            gap="$2"
                                        >
                                            <Camera size={16} color={ds.colors.mutedForeground} />
                                            <Text fontSize="$2" color={ds.colors.mutedForeground}>
                                                {t("screenshot.unavailable")}
                                            </Text>
                                        </XStack>
                                    )}
                                    <Paragraph fontSize="$1" color={ds.colors.mutedForeground}>
                                        {t("screenshot.privacyNote")}
                                    </Paragraph>
                                </YStack>
                            ) : null}

                            {matches.length > 0 ? (
                                <YStack gap="$2" borderColor={ds.colors.border} borderWidth={1} rounded="$4" p="$3">
                                    <Text fontWeight="600" color={ds.colors.foreground}>
                                        {t("matches.heading")}
                                    </Text>
                                    {matches.map((match) => (
                                        <YStack key={match.id} gap="$1">
                                            <Text fontWeight="600" color={ds.colors.foreground}>
                                                {match.title}
                                            </Text>
                                            <Paragraph color={ds.colors.mutedForeground}>{match.symptoms}</Paragraph>
                                            {match.workaround ? (
                                                <Paragraph color={ds.colors.foreground}>
                                                    {t("matches.workaroundLabel")}: {match.workaround}
                                                </Paragraph>
                                            ) : null}
                                            <Separator borderColor={ds.colors.border} mb="$1" />
                                        </YStack>
                                    ))}
                                </YStack>
                            ) : null}

                            <YStack gap="$2" mt="$2">
                                <Button
                                    height={50}
                                    rounded="$4"
                                    disabled={!canSubmit}
                                    opacity={canSubmit ? 1 : 0.5}
                                    bg={ds.colors.primary}
                                    onPress={handleSubmit}
                                    pressStyle={{ opacity: 0.85 }}
                                >
                                    {isSubmitting ? (
                                        <XStack gap="$2" items="center">
                                            <Spinner size="small" color={ds.colors.background} />
                                            <Text color={ds.colors.background} fontWeight="700">
                                                {t("sending")}
                                            </Text>
                                        </XStack>
                                    ) : (
                                        <Text color={ds.colors.background} fontWeight="700">
                                            {submitLabel}
                                        </Text>
                                    )}
                                </Button>
                                <Button height={44} chromeless onPress={() => setOpen(false)}>
                                    <Text color={ds.colors.mutedForeground}>{t("cancel")}</Text>
                                </Button>
                            </YStack>
                        </YStack>
                    </ScrollView>
                </Sheet.Frame>
            </Sheet>
        </>
    );
}
