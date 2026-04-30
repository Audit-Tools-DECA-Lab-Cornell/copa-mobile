import { useCallback, useEffect, useMemo, useState } from "react";
import { type LayoutChangeEvent, ScrollView, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Check, Shield } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { useAuthStore } from "stores/auth-store";
import { completeOnboarding } from "lib/audit/profile-api";
import { createModuleLogger } from "lib/logger";
import { type TFunction } from "i18next";
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
 * Legal documents are loaded from the active instrument so admins can update them
 * from the web app without a mobile release.
 */
export default function AcceptTermsScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation("onboarding");
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
    const [, setDocumentMetrics] = useState<Record<string, DocumentMetrics>>(() =>
        createInitialMetrics(legalDocuments),
    );
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
                setDocumentMetrics(createInitialMetrics(docs));
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
            setDocumentMetrics((current) => {
                const existing = current[documentKey] ?? { contentHeight: 0, viewportHeight: 0 };
                const merged = { ...existing, ...nextMetrics };

                if (
                    merged.contentHeight > 0 &&
                    merged.viewportHeight > 0 &&
                    merged.contentHeight <= merged.viewportHeight + CONTENT_FITS_BUFFER
                ) {
                    markReviewed(documentKey);
                }

                return { ...current, [documentKey]: merged };
            });
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
            setErrorMessage(t("common.sessionExpired", "Session expired. Please sign in again."));
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

    if (isLoadingDocuments) {
        return (
            <YStack flex={1} items="center" justify="center" bg={ds.colors.background} gap="$3" p="$6">
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    style={{ textAlign: "center" }}
                >
                    {t("acceptTerms.loadingDocuments", "Loading legal documents...")}
                </Paragraph>
            </YStack>
        );
    }

    if (documentsError !== null || activeDocument === null) {
        return (
            <YStack flex={1} items="center" justify="center" bg={ds.colors.background} gap="$3" p="$6">
                <YStack
                    borderWidth={1}
                    borderColor={ds.colors.danger}
                    bg={ds.colors.dangerSoft}
                    rounded={ds.radii.md}
                    p="$4"
                    style={{ maxWidth: layout.formMaxWidth, width: "100%" }}
                >
                    <Paragraph
                        color={ds.colors.danger}
                        fontFamily={ds.fonts.bodyMedium}
                        style={{ textAlign: "center" }}
                    >
                        {documentsError ?? t("acceptTerms.validation.noDocuments", "Legal documents are unavailable.")}
                    </Paragraph>
                </YStack>
            </YStack>
        );
    }

    return (
        <YStack flex={1} bg={ds.colors.background}>
            <Header ds={ds} layout={layout} t={t} />

            <ScrollView
                style={{ flex: 1 }}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: layout.screenPaddingHorizontal,
                    paddingTop: layout.isTablet ? 28 : 20,
                    paddingBottom: 28,
                }}
            >
                <YStack
                    width="100%"
                    gap={layout.isTablet ? "$5" : "$4"}
                    style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}
                >
                    <ReviewProgressCard
                        ds={ds}
                        reviewedCount={reviewedCount}
                        reviewPercent={reviewPercent}
                        totalCount={legalDocuments.length}
                    />

                    <DocumentSwitcher
                        activeDocumentKey={activeDocumentKey}
                        documents={legalDocuments}
                        ds={ds}
                        reviewedDocuments={reviewedDocuments}
                        onSelect={setActiveDocumentKey}
                    />

                    <LegalReaderCard
                        document={activeDocument}
                        ds={ds}
                        isReviewed={reviewedDocuments[activeDocument.key] ?? false}
                        layout={layout}
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

                    <YStack gap="$2">
                        {errorMessage !== null ? <StatusMessage message={errorMessage} ds={ds} /> : null}
                        {!hasReviewedAllDocuments ? (
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                style={{ textAlign: "center" }}
                            >
                                Review both documents to unlock the acceptance button.
                            </Paragraph>
                        ) : null}
                    </YStack>
                </YStack>
            </ScrollView>

            <Footer
                canAccept={canAccept}
                ds={ds}
                isLoading={isLoading}
                layout={layout}
                t={t}
                onAccept={() => {
                    void handleAccept();
                }}
            />
        </YStack>
    );
}

interface HeaderProps {
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly layout: ReturnType<typeof useResponsiveLayout>;
    readonly t: TFunction<"onboarding">;
}

function Header({ ds, layout, t }: HeaderProps) {
    return (
        <YStack
            px={layout.screenPaddingHorizontal}
            pt={layout.isTablet ? 56 : 44}
            pb="$4"
            borderBottomWidth={1}
            borderBottomColor={ds.colors.border}
            bg={ds.colors.background}
        >
            <YStack width="100%" gap="$2" style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}>
                <Paragraph
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.4}
                >
                    {t("acceptTerms.stepLabel", "Step 3 of 4")}
                </Paragraph>
                <XStack items="center" gap="$3">
                    <YStack
                        width={layout.isTablet ? 44 : 40}
                        height={layout.isTablet ? 44 : 40}
                        rounded={ds.radii.md}
                        items="center"
                        justify="center"
                        bg={ds.colors.primarySoft}
                        borderWidth={1}
                        borderColor={ds.colors.primary}
                    >
                        <Shield size={20} color={ds.colors.primary} />
                    </YStack>
                    <YStack flex={1} gap="$1">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={
                                layout.isTablet ? ds.typography.displayMd.fontSize : ds.typography.displaySm.fontSize
                            }
                            lineHeight={
                                layout.isTablet
                                    ? ds.typography.displayMd.lineHeight
                                    : ds.typography.displaySm.lineHeight
                            }
                            textTransform="uppercase"
                            fontStyle="italic"
                            letterSpacing={-0.5}
                        >
                            {t("acceptTerms.title", "Terms & Privacy")}
                        </Text>
                        <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                            Review the service terms and privacy notice before entering the app.
                        </Paragraph>
                    </YStack>
                </XStack>
            </YStack>
        </YStack>
    );
}

interface ReviewProgressCardProps {
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly reviewedCount: number;
    readonly reviewPercent: number;
    readonly totalCount: number;
}

function ReviewProgressCard({ ds, reviewedCount, reviewPercent, totalCount }: ReviewProgressCardProps) {
    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
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
                        Review progress
                    </Text>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {reviewedCount} of {totalCount} documents reviewed
                    </Paragraph>
                </YStack>
                <YStack
                    minW={64}
                    px="$3"
                    py="$2"
                    rounded={ds.radii.md}
                    bg={ds.colors.primarySoft}
                    items="center"
                    borderWidth={1}
                    borderColor={ds.colors.primary}
                >
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelLg.fontSize}
                    >
                        {reviewPercent}%
                    </Text>
                </YStack>
            </XStack>

            <YStack height={8} rounded={999} bg={ds.colors.border} overflow="hidden">
                <YStack width={`${reviewPercent}%`} height="100%" rounded={999} bg={ds.colors.primary} />
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
}

function DocumentSwitcher({ activeDocumentKey, documents, ds, reviewedDocuments, onSelect }: DocumentSwitcherProps) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {documents.map((document) => {
                const isActive = activeDocumentKey === document.key;
                const isReviewed = reviewedDocuments[document.key] ?? false;

                return (
                    <Button
                        key={document.key}
                        minW={160}
                        height={52}
                        rounded={ds.radii.md}
                        borderWidth={1}
                        borderColor={isActive ? ds.colors.primary : ds.colors.border}
                        bg={isActive ? ds.colors.primarySoft : ds.colors.surface}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            onSelect(document.key);
                        }}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                    >
                        <XStack items="center" gap="$2">
                            {isReviewed ? <Check size={15} color={ds.colors.success} /> : null}
                            <YStack flex={1}>
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
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodySm.fontSize}
                                    numberOfLines={1}
                                >
                                    {isReviewed ? "Reviewed" : "Needs review"}
                                </Text>
                            </YStack>
                        </XStack>
                    </Button>
                );
            })}
        </ScrollView>
    );
}

interface LegalReaderCardProps {
    readonly document: LegalDocument;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly isReviewed: boolean;
    readonly layout: ReturnType<typeof useResponsiveLayout>;
    readonly onContentSizeChange: (height: number) => void;
    readonly onLayout: (height: number) => void;
    readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function LegalReaderCard({
    document,
    ds,
    isReviewed,
    layout,
    onContentSizeChange,
    onLayout,
    onScroll,
}: LegalReaderCardProps) {
    const readerHeight = layout.isTablet ? 560 : 430;

    return (
        <YStack
            rounded={ds.radii.xl}
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
                    <ReviewBadge ds={ds} isReviewed={isReviewed} />
                </XStack>

                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    Last updated: {document.last_updated}
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
}

function ReviewBadge({ ds, isReviewed }: ReviewBadgeProps) {
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
                {isReviewed ? "Reviewed" : "Scroll"}
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

interface StatusMessageProps {
    readonly message: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
}

function StatusMessage({ message, ds }: StatusMessageProps) {
    return (
        <YStack borderWidth={1} borderColor={ds.colors.danger} bg={ds.colors.dangerSoft} rounded={ds.radii.md} p="$3">
            <Paragraph color={ds.colors.danger} fontFamily={ds.fonts.bodyMedium}>
                {message}
            </Paragraph>
        </YStack>
    );
}

interface FooterProps {
    readonly canAccept: boolean;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly isLoading: boolean;
    readonly layout: ReturnType<typeof useResponsiveLayout>;
    readonly t: TFunction<"onboarding">;
    readonly onAccept: () => void;
}

function Footer({ canAccept, ds, isLoading, layout, t, onAccept }: FooterProps) {
    return (
        <YStack
            px={layout.screenPaddingHorizontal}
            pb={layout.isTablet ? 40 : 28}
            pt="$4"
            borderTopWidth={1}
            borderTopColor={ds.colors.border}
            bg={ds.colors.background}
        >
            <YStack width="100%" gap="$3" style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}>
                <Button
                    height={56}
                    rounded={ds.radii.md}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    disabled={!canAccept}
                    opacity={canAccept ? 1 : 0.5}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={onAccept}
                    style={{ boxShadow: canAccept ? ds.shadows.accent : "none" }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canAccept, busy: isLoading }}
                >
                    <XStack items="center" gap="$2">
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelLg.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.4}
                        >
                            {isLoading
                                ? t("acceptTerms.submitting", "Saving...")
                                : t("acceptTerms.submit", "Accept and continue")}
                        </Text>
                        <ArrowRight size={16} color={ds.colors.primaryForeground} />
                    </XStack>
                </Button>
            </YStack>
        </YStack>
    );
}
