import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, ScrollView, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useRouter } from "expo-router";
import { Check, Shield } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { OnboardingShell } from "components/onboarding/onboarding-shell";
import { useAuthStore } from "stores/auth-store";
import { completeOnboarding } from "lib/audit/profile-api";
import { createModuleLogger } from "lib/logger";
import { type LegalDocument } from "lib/audit/types";
import { syncInstrument, getCachedInstrument } from "lib/services/instrument-sync";

const logger = createModuleLogger("onboarding.accept-terms");
const SCROLL_BOTTOM_THRESHOLD = 36;
const CONTENT_FITS_BUFFER = 8;

interface DocumentMetrics {
    readonly contentHeight: number;
    readonly viewportHeight: number;
}

function createInitialReviewState(documents: readonly LegalDocument[]): Record<string, boolean> {
    return documents.reduce((state, document) => ({ ...state, [document.key]: false }), {} as Record<string, boolean>);
}

function createInitialMetrics(documents: readonly LegalDocument[]): Record<string, DocumentMetrics> {
    return documents.reduce(
        (state, document) => ({ ...state, [document.key]: { contentHeight: 0, viewportHeight: 0 } }),
        {} as Record<string, DocumentMetrics>,
    );
}

/**
 * Step 3 of onboarding: the auditor reviews Terms + Privacy before continuing.
 * Legal documents are loaded from the active instrument so admins can update
 * them from the web app without a mobile release.
 */
export default function AcceptTermsScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["onboarding", "common"]);
    const session = useAuthStore((state) => state.session);

    const [legalDocuments, setLegalDocuments] = useState<readonly LegalDocument[]>(() => {
        const cached = getCachedInstrument();
        return cached?.legal_documents ?? [];
    });
    const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(legalDocuments.length === 0);
    const [documentsError, setDocumentsError] = useState<string | null>(null);

    const [activeDocumentKey, setActiveDocumentKey] = useState<string>(() => {
        const cached = getCachedInstrument();
        return cached?.legal_documents[0]?.key ?? "terms";
    });
    const [reviewedDocuments, setReviewedDocuments] = useState<Record<string, boolean>>(() =>
        createInitialReviewState(legalDocuments),
    );
    const documentMetricsRef = useRef<Record<string, DocumentMetrics>>(createInitialMetrics(legalDocuments));
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadDocuments(): Promise<void> {
            try {
                const instrument = await syncInstrument();
                if (cancelled) return;

                const docs = instrument?.legal_documents ?? [];
                if (docs.length === 0) {
                    setDocumentsError(
                        t(
                            "acceptTerms.validation.noDocuments",
                            "Legal documents are unavailable. Please try again later.",
                        ),
                    );
                    return;
                }

                setLegalDocuments(docs);
                setActiveDocumentKey(docs[0]?.key ?? "terms");
                setReviewedDocuments(createInitialReviewState(docs));
                documentMetricsRef.current = createInitialMetrics(docs);
            } catch (error) {
                if (cancelled) return;
                logger.error("Failed to load legal documents", error instanceof Error ? error.message : String(error));
                setDocumentsError(
                    t("acceptTerms.validation.loadFailed", "Failed to load legal documents. Please try again."),
                );
            } finally {
                if (!cancelled) {
                    setIsLoadingDocuments(false);
                }
            }
        }

        void loadDocuments();
        return () => {
            cancelled = true;
        };
    }, [t]);

    const activeDocument = useMemo(
        () => legalDocuments.find((document) => document.key === activeDocumentKey) ?? legalDocuments[0] ?? null,
        [activeDocumentKey, legalDocuments],
    );

    const reviewedCount = legalDocuments.filter((document) => reviewedDocuments[document.key]).length;
    const reviewPercent = legalDocuments.length > 0 ? Math.round((reviewedCount / legalDocuments.length) * 100) : 0;
    const hasReviewedAllDocuments = legalDocuments.length > 0 && reviewedCount === legalDocuments.length;
    const canAccept = hasReviewedAllDocuments && !isLoading;

    const markReviewed = useCallback((documentKey: string): void => {
        setReviewedDocuments((current) => {
            if (current[documentKey]) {
                return current;
            }
            return { ...current, [documentKey]: true };
        });
    }, []);

    const updateDocumentMetrics = useCallback(
        (documentKey: string, nextMetrics: Partial<DocumentMetrics>): void => {
            const existing = documentMetricsRef.current[documentKey] ?? { contentHeight: 0, viewportHeight: 0 };
            const merged = { ...existing, ...nextMetrics };
            documentMetricsRef.current = { ...documentMetricsRef.current, [documentKey]: merged };

            if (
                merged.contentHeight > 0 &&
                merged.viewportHeight > 0 &&
                merged.contentHeight <= merged.viewportHeight + CONTENT_FITS_BUFFER
            ) {
                markReviewed(documentKey);
            }
        },
        [markReviewed],
    );

    const handleDocumentScroll = (documentKey: string, event: NativeSyntheticEvent<NativeScrollEvent>): void => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_BOTTOM_THRESHOLD;

        if (isNearBottom) {
            markReviewed(documentKey);
        }
    };

    const handleAccept = async (): Promise<void> => {
        if (isLoading || !hasReviewedAllDocuments) {
            return;
        }

        setErrorMessage(null);

        if (session === null) {
            setErrorMessage(t("sessionExpired", { ns: "common" }));
            return;
        }

        setIsLoading(true);
        try {
            await completeOnboarding(session);
            router.replace("/(onboarding)/auditor-code");
        } catch (error) {
            logger.error("Failed to complete onboarding", error instanceof Error ? error.message : String(error));
            setErrorMessage(t("acceptTerms.validation.failed", "Failed to accept terms. Please try again."));
        } finally {
            setIsLoading(false);
        }
    };

    const sharedShellProps = {
        step: 3,
        totalSteps: 4,
        icon: Shield,
        eyebrow: t("acceptTerms.stepLabel", "Step 3 of 4"),
        title: t("acceptTerms.title", "Terms & Privacy"),
        subtitle: t("acceptTerms.headerSubtitle", "A quick read to confirm how COPA handles audits and your data."),
    } as const;

    if (isLoadingDocuments) {
        return (
            <OnboardingShell {...sharedShellProps}>
                <YStack
                    flex={1}
                    items="center"
                    justify="center"
                    py="$6"
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surface}
                >
                    <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                        {t("acceptTerms.loadingDocuments", "Loading legal documents...")}
                    </Paragraph>
                </YStack>
            </OnboardingShell>
        );
    }

    if (documentsError !== null || activeDocument === null) {
        return (
            <OnboardingShell {...sharedShellProps}>
                <YStack
                    borderWidth={1}
                    borderColor={ds.colors.danger}
                    bg={ds.colors.dangerSoft}
                    rounded={ds.radii.md}
                    p="$4"
                >
                    <Paragraph
                        color={ds.colors.danger}
                        fontFamily={ds.fonts.bodyMedium}
                        style={{ textAlign: "center" }}
                    >
                        {documentsError ?? t("acceptTerms.validation.noDocuments", "Legal documents are unavailable.")}
                    </Paragraph>
                </YStack>
            </OnboardingShell>
        );
    }

    const helperText = !hasReviewedAllDocuments
        ? t("acceptTerms.helperPending", "Review every document to unlock acceptance.")
        : undefined;

    return (
        <OnboardingShell
            {...sharedShellProps}
            ctaLabel={t("acceptTerms.submit", "Accept and continue")}
            ctaLoadingLabel={t("acceptTerms.submitting", "Saving...")}
            canSubmit={canAccept}
            isLoading={isLoading}
            onCtaPress={() => {
                void handleAccept();
            }}
            errorMessage={errorMessage}
            {...(helperText !== undefined ? { helperText } : {})}
        >
            <ReviewProgressCard
                ds={ds}
                reviewedCount={reviewedCount}
                reviewPercent={reviewPercent}
                totalCount={legalDocuments.length}
                titleLabel={t("acceptTerms.reviewProgressTitle", "Review progress")}
                descriptionLabel={t(
                    "acceptTerms.reviewProgressDescription",
                    "{{reviewed}} of {{total}} documents reviewed",
                    {
                        reviewed: reviewedCount,
                        total: legalDocuments.length,
                    },
                )}
            />

            <DocumentSwitcher
                activeDocumentKey={activeDocumentKey}
                documents={legalDocuments}
                ds={ds}
                reviewedDocuments={reviewedDocuments}
                onSelect={setActiveDocumentKey}
                reviewedLabel={t("acceptTerms.documentReviewed", "Reviewed")}
                pendingLabel={t("acceptTerms.documentNeedsReview", "Needs review")}
                sectionLabel={t("acceptTerms.documentSectionTitle", "Documents")}
            />

            <LegalReaderCard
                document={activeDocument}
                ds={ds}
                isReviewed={reviewedDocuments[activeDocument.key] ?? false}
                isTablet={layout.isTablet}
                lastUpdatedLabel={t("acceptTerms.documentLastUpdated", "Last updated {{date}}", {
                    date: activeDocument.last_updated,
                })}
                reviewedLabel={t("acceptTerms.documentReviewed", "Reviewed")}
                scrollLabel={t("acceptTerms.documentScrollPrompt", "Scroll")}
                onContentSizeChange={(height) => {
                    updateDocumentMetrics(activeDocument.key, { contentHeight: height });
                }}
                onLayout={(height) => {
                    updateDocumentMetrics(activeDocument.key, { viewportHeight: height });
                }}
                onScroll={(event) => {
                    handleDocumentScroll(activeDocument.key, event);
                }}
            />
        </OnboardingShell>
    );
}

interface ReviewProgressCardProps {
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly reviewedCount: number;
    readonly reviewPercent: number;
    readonly totalCount: number;
    readonly titleLabel: string;
    readonly descriptionLabel: string;
}

function ReviewProgressCard({
    ds,
    reviewedCount,
    reviewPercent,
    totalCount,
    titleLabel,
    descriptionLabel,
}: ReviewProgressCardProps) {
    const isComplete = reviewedCount === totalCount && totalCount > 0;
    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={isComplete ? ds.colors.success : ds.colors.border}
            bg={ds.colors.surface}
            p="$4"
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            <XStack items="center" justify="space-between" gap="$3">
                <YStack flex={1} gap="$1">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleSm.fontSize}
                    >
                        {titleLabel}
                    </Text>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {descriptionLabel}
                    </Paragraph>
                </YStack>
                <YStack
                    minW={64}
                    px="$3"
                    py="$2"
                    rounded={ds.radii.md}
                    bg={isComplete ? ds.colors.successSoft : ds.colors.primarySoft}
                    items="center"
                    borderWidth={1}
                    borderColor={isComplete ? ds.colors.success : ds.colors.primary}
                >
                    <Text
                        color={isComplete ? ds.colors.success : ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelLg.fontSize}
                    >
                        {`${reviewPercent}%`}
                    </Text>
                </YStack>
            </XStack>

            <YStack height={8} rounded={ds.radii.full} bg={ds.colors.border} overflow="hidden">
                <YStack
                    width={`${reviewPercent}%`}
                    height="100%"
                    rounded={ds.radii.full}
                    bg={isComplete ? ds.colors.success : ds.colors.primary}
                />
            </YStack>
        </YStack>
    );
}

interface DocumentSwitcherProps {
    readonly activeDocumentKey: string;
    readonly documents: readonly LegalDocument[];
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly reviewedDocuments: Record<string, boolean>;
    readonly onSelect: (documentKey: string) => void;
    readonly reviewedLabel: string;
    readonly pendingLabel: string;
    readonly sectionLabel: string;
}

function DocumentSwitcher({
    activeDocumentKey,
    documents,
    ds,
    reviewedDocuments,
    onSelect,
    reviewedLabel,
    pendingLabel,
    sectionLabel,
}: DocumentSwitcherProps) {
    return (
        <YStack gap="$2">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelMd.fontSize}
                textTransform="uppercase"
                letterSpacing={1.5}
                px="$1"
            >
                {sectionLabel}
            </Paragraph>
            <XStack gap="$2">
                {documents.map((document) => {
                    const isActive = activeDocumentKey === document.key;
                    const isReviewed = reviewedDocuments[document.key] ?? false;

                    return (
                        <Button
                            key={document.key}
                            flex={1}
                            height={60}
                            rounded={ds.radii.sm}
                            borderWidth={1}
                            borderColor={isActive ? ds.colors.primary : ds.colors.border}
                            bg={isActive ? ds.colors.primarySoft : ds.colors.surface}
                            pressStyle={{ opacity: 0.88 }}
                            onPress={() => onSelect(document.key)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                        >
                            <XStack flex={1} items="center" justify="space-between" gap="$3" py="$1">
                                <YStack
                                    width={16}
                                    height={16}
                                    rounded={ds.radii.full}
                                    items="center"
                                    justify="center"
                                    bg={isReviewed ? ds.colors.success : ds.colors.mutedSurface}
                                    borderWidth={1}
                                    borderColor={isReviewed ? ds.colors.success : ds.colors.border}
                                >
                                    {isReviewed ? <Check size={10} color={ds.colors.primaryForeground} /> : null}
                                </YStack>
                                <YStack flex={1} items="flex-start" gap="$1.5">
                                    <Text
                                        color={isActive ? ds.colors.primary : ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelMd.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.1}
                                    >
                                        {document.short_title}
                                    </Text>
                                    <Text
                                        color={isReviewed ? ds.colors.success : ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodySm.fontSize}
                                    >
                                        {isReviewed ? reviewedLabel : pendingLabel}
                                    </Text>
                                </YStack>
                            </XStack>
                        </Button>
                    );
                })}
            </XStack>
        </YStack>
    );
}

interface LegalReaderCardProps {
    readonly document: LegalDocument;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly isReviewed: boolean;
    readonly isTablet: boolean;
    readonly lastUpdatedLabel: string;
    readonly reviewedLabel: string;
    readonly scrollLabel: string;
    readonly onContentSizeChange: (height: number) => void;
    readonly onLayout: (height: number) => void;
    readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function LegalReaderCard({
    document,
    ds,
    isReviewed,
    isTablet,
    lastUpdatedLabel,
    reviewedLabel,
    scrollLabel,
    onContentSizeChange,
    onLayout,
    onScroll,
}: LegalReaderCardProps) {
    const readerHeight = isTablet ? 520 : 420;

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={isReviewed ? ds.colors.success : ds.colors.border}
            bg={ds.colors.surface}
            overflow="hidden"
            style={{ boxShadow: ds.shadows.card }}
        >
            <YStack p="$4" gap="$2" borderBottomWidth={1} borderBottomColor={ds.colors.border}>
                <XStack items="center" justify="space-between" gap="$3">
                    <YStack flex={1} gap="$1">
                        <Paragraph
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.3}
                        >
                            {document.eyebrow}
                        </Paragraph>
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.titleMd.fontSize}
                        >
                            {document.title}
                        </Text>
                    </YStack>
                    <ReviewBadge
                        ds={ds}
                        isReviewed={isReviewed}
                        reviewedLabel={reviewedLabel}
                        scrollLabel={scrollLabel}
                    />
                </XStack>

                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {lastUpdatedLabel}
                </Paragraph>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {document.summary}
                </Paragraph>
            </YStack>

            <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator
                onScroll={onScroll}
                onLayout={(event: LayoutChangeEvent) => {
                    onLayout(event.nativeEvent.layout.height);
                }}
                onContentSizeChange={(_: number, height: number) => {
                    onContentSizeChange(height);
                }}
                scrollEventThrottle={64}
                style={{ maxHeight: readerHeight }}
                contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
            >
                <YStack gap="$5">
                    {document.sections.map((section) => (
                        <LegalSectionView key={section.key} ds={ds} section={section} />
                    ))}
                </YStack>
            </ScrollView>
        </YStack>
    );
}

interface ReviewBadgeProps {
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly isReviewed: boolean;
    readonly reviewedLabel: string;
    readonly scrollLabel: string;
}

function ReviewBadge({ ds, isReviewed, reviewedLabel, scrollLabel }: ReviewBadgeProps) {
    return (
        <YStack
            px="$3"
            py="$2"
            rounded={ds.radii.md}
            bg={isReviewed ? ds.colors.successSoft : ds.colors.primarySoft}
            borderWidth={1}
            borderColor={isReviewed ? ds.colors.success : ds.colors.primary}
        >
            <Text
                color={isReviewed ? ds.colors.success : ds.colors.primary}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodySm.fontSize}
                textTransform="uppercase"
                letterSpacing={1}
            >
                {isReviewed ? reviewedLabel : scrollLabel}
            </Text>
        </YStack>
    );
}

interface LegalSectionViewProps {
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly section: LegalDocument["sections"][number];
}

function LegalSectionView({ ds, section }: LegalSectionViewProps) {
    return (
        <YStack gap="$2">
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.titleSm.fontSize}>
                {section.title}
            </Text>
            {section.body.map((paragraph) => (
                <Paragraph
                    key={paragraph}
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                    lineHeight={ds.typography.bodyMd.lineHeight}
                >
                    {paragraph}
                </Paragraph>
            ))}
            {section.bullets.length > 0 ? (
                <YStack gap="$1.5" mt="$1">
                    {section.bullets.map((bullet) => (
                        <XStack key={bullet} gap="$2" items="flex-start">
                            <Text
                                color={ds.colors.primary}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodyMd.fontSize}
                            >
                                •
                            </Text>
                            <Paragraph
                                flex={1}
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                                lineHeight={ds.typography.bodyMd.lineHeight}
                            >
                                {bullet}
                            </Paragraph>
                        </XStack>
                    ))}
                </YStack>
            ) : null}
        </YStack>
    );
}
