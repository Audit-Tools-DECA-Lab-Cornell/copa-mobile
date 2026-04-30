import { calculateQuestionScores, formatScoreValue } from "lib/audit/score-helpers";
import type {
    AuditScoreTotals,
    AuditSession,
    InstrumentQuestion,
    PlayspaceInstrument,
    QuestionResponsePayload,
} from "lib/audit/types";

/**
 * One domain bucket with data for short and extended report views.
 */
export interface DomainReportRow {
    readonly domainKey: string;
    readonly domainTitle: string;
    readonly scoreTotals: AuditScoreTotals | null;
    readonly itemCount: number;
    readonly sectionNotes: string[];
    readonly questions: DomainQuestionRow[];
}

/**
 * One instrument question row for the extended report items table.
 */
export interface DomainQuestionRow {
    readonly questionKey: string;
    readonly questionText: string;
    readonly provisionLabel: string | null;
    readonly diversityLabel: string | null;
    /** When `false`, the challenge column must show N/A (scale not present on question). */
    readonly challengeApplicable: boolean;
    readonly challengeLabel: string | null;
    readonly sociabilityLabel: string | null;
    readonly playValueScore: number | null;
    readonly playValueMax: number | null;
    readonly usabilityScore: number | null;
    readonly usabilityMax: number | null;
}

/**
 * Best/worst domain ranking for one scoring construct.
 */
export interface ConstructRanking {
    readonly constructKey: "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";
    readonly bestDomain: {
        domainTitle: string;
        score: number;
        max: number;
    } | null;
    readonly worstDomain: {
        domainTitle: string;
        score: number;
        max: number;
    } | null;
}

type ConstructAccessor = {
    readonly key: ConstructRanking["constructKey"];
    readonly value: (totals: AuditScoreTotals) => number;
    readonly max: (totals: AuditScoreTotals) => number;
};

const CONSTRUCT_ACCESSORS: readonly ConstructAccessor[] = [
    { key: "provision", value: (t) => t.provision_total, max: (t) => t.provision_total_max },
    { key: "diversity", value: (t) => t.diversity_total, max: (t) => t.diversity_total_max },
    { key: "challenge", value: (t) => t.challenge_total, max: (t) => t.challenge_total_max },
    { key: "sociability", value: (t) => t.sociability_total, max: (t) => t.sociability_total_max },
    { key: "play_value", value: (t) => t.play_value_total, max: (t) => t.play_value_total_max },
    { key: "usability", value: (t) => t.usability_total, max: (t) => t.usability_total_max },
];

/**
 * Convert a snake_case domain key to a human title.
 *
 * @param domainKey Backend domain identifier.
 * @returns Title-cased label.
 */
export function toDomainTitle(domainKey: string): string {
    return domainKey
        .split("_")
        .map((word) => (word.length === 0 ? "" : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
        .join(" ");
}

function normalizeDomainKey(domainKey: string): string {
    return domainKey.trim().toLowerCase().replace(/\s+/g, "_");
}

function toTokenSet(value: string): Set<string> {
    return new Set(
        value
            .toLowerCase()
            .replace(/[^a-z0-9\s_]/g, " ")
            .split(/[\s_]+/)
            .map((part) => part.trim())
            .filter((part) => part.length > 0),
    );
}

function countTokenOverlap(a: Set<string>, b: Set<string>): number {
    let count = 0;
    a.forEach((token) => {
        if (b.has(token)) {
            count += 1;
        }
    });
    return count;
}

/**
 * Resolve the human label for a selected scale option.
 *
 * @param question Instrument question.
 * @param scaleKey Scale key (provision, diversity, etc.).
 * @param answerKey Selected option key from responses.
 * @returns Option label or null when not applicable.
 */
export function resolveScaleOptionLabel(
    question: InstrumentQuestion,
    scaleKey: string,
    answerKey: string | undefined,
): string | null {
    if (answerKey === undefined || answerKey.length === 0) {
        return null;
    }
    const scale = question.scales.find((candidate) => candidate.key === scaleKey);
    if (scale === undefined) {
        return null;
    }
    const option = scale.options.find((candidate) => candidate.key === answerKey);
    return option?.label ?? null;
}

function readStringAnswer(answers: QuestionResponsePayload, key: string): string | undefined {
    const raw = answers[key];
    return typeof raw === "string" ? raw : undefined;
}

/**
 * Return distinct non-empty domain keys for a question, preserving instrument order.
 * Questions may list multiple domains; each is included once.
 */
export function getQuestionDomainKeys(question: InstrumentQuestion): string[] {
    const ordered: string[] = [];
    const seen = new Set<string>();
    question.domains.forEach((domainKey) => {
        const normalized = normalizeDomainKey(domainKey);
        if (normalized.length === 0) {
            return;
        }
        if (seen.has(normalized)) {
            return;
        }
        seen.add(normalized);
        ordered.push(normalized);
    });
    return ordered;
}

/**
 * Count distinct scaled questions that carry at least one domain (for the overall score table row).
 * Avoids double-counting questions that appear under multiple domain sections.
 */
export function countUniqueScaledQuestionsWithDomains(instrument: PlayspaceInstrument): number {
    const questionKeys = new Set<string>();
    instrument.sections.forEach((section) => {
        section.questions.forEach((question) => {
            if (question.question_type !== "scaled") {
                return;
            }
            if (getQuestionDomainKeys(question).length === 0) {
                return;
            }
            questionKeys.add(question.question_key);
        });
    });
    return questionKeys.size;
}

function buildDomainQuestionRow(question: InstrumentQuestion, answers: QuestionResponsePayload): DomainQuestionRow {
    const scores = calculateQuestionScores(question, answers);
    const provisionLabel = resolveScaleOptionLabel(question, "provision", readStringAnswer(answers, "provision"));
    const diversityLabel = resolveScaleOptionLabel(question, "diversity", readStringAnswer(answers, "diversity"));
    const challengeScale = question.scales.find((scale) => scale.key === "challenge");
    const challengeApplicable = challengeScale !== undefined;
    const challengeLabel = challengeApplicable
        ? resolveScaleOptionLabel(question, "challenge", readStringAnswer(answers, "challenge"))
        : null;
    const sociabilityLabel = resolveScaleOptionLabel(question, "sociability", readStringAnswer(answers, "sociability"));

    const playValueMax = scores.play_value_total_max;
    const usabilityMax = scores.usability_total_max;

    return {
        questionKey: question.question_key,
        questionText: question.prompt,
        provisionLabel,
        diversityLabel,
        challengeApplicable,
        challengeLabel,
        sociabilityLabel,
        playValueScore: playValueMax <= 0 ? null : scores.play_value_total,
        playValueMax: playValueMax <= 0 ? null : playValueMax,
        usabilityScore: usabilityMax <= 0 ? null : scores.usability_total,
        usabilityMax: usabilityMax <= 0 ? null : usabilityMax,
    };
}

function collectSectionNote(
    auditSession: AuditSession,
    sectionKey: string,
    sectionIndex: number,
    sectionTitle: string,
): string | null {
    const sectionState = auditSession.aggregate.sections[sectionKey];
    const raw = sectionState?.note;
    if (raw === null || raw === undefined) {
        return null;
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return null;
    }
    return `${sectionIndex}. ${sectionTitle}: ${trimmed}`;
}

function parseQuestionKeyParts(questionKey: string): number[] {
    const matches = questionKey.match(/\d+/g);
    if (matches === null) {
        return [];
    }
    return matches.map((part) => Number.parseInt(part, 10)).filter((value) => Number.isFinite(value));
}

function compareQuestionRowsByIdentifier(a: DomainQuestionRow, b: DomainQuestionRow): number {
    const aParts = parseQuestionKeyParts(a.questionKey);
    const bParts = parseQuestionKeyParts(b.questionKey);
    const maxLength = Math.max(aParts.length, bParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const aValue = aParts[index];
        const bValue = bParts[index];
        if (aValue === undefined && bValue === undefined) {
            break;
        }
        if (aValue === undefined) {
            return -1;
        }
        if (bValue === undefined) {
            return 1;
        }
        if (aValue !== bValue) {
            return aValue - bValue;
        }
    }

    return a.questionKey.localeCompare(b.questionKey);
}

/**
 * Build ordered domain rows from session scores and the instrument definition.
 *
 * @param auditSession Loaded audit with scores and aggregate responses.
 * @param instrument Localized instrument definition.
 * @returns One row per domain in first-seen instrument order, plus orphan `by_domain` keys.
 * Questions may belong to multiple domains; each domain row lists every question that includes that domain.
 */
export function buildDomainReportRows(auditSession: AuditSession, instrument: PlayspaceInstrument): DomainReportRow[] {
    const byDomain = auditSession.scores.by_domain;
    const normalizedScoreByDomain = new Map<string, AuditScoreTotals | null>();
    Object.entries(byDomain).forEach(([rawDomainKey, totals]) => {
        const normalizedKey = normalizeDomainKey(rawDomainKey);
        if (normalizedKey.length === 0) {
            return;
        }
        const existing = normalizedScoreByDomain.get(normalizedKey) ?? null;
        if (existing === null && totals !== null) {
            normalizedScoreByDomain.set(normalizedKey, totals);
            return;
        }
        if (!normalizedScoreByDomain.has(normalizedKey)) {
            normalizedScoreByDomain.set(normalizedKey, totals);
        }
    });

    const firstSeenDomainOrder: string[] = [];
    const firstSeenSet = new Set<string>();
    const dominantDomainOrder: string[] = [];
    const dominantSet = new Set<string>();

    instrument.sections.forEach((section) => {
        const sectionDomainCounts = new Map<string, number>();
        const sectionFirstSeenIndex = new Map<string, number>();
        let sectionOrderCounter = 0;

        section.questions.forEach((question) => {
            getQuestionDomainKeys(question).forEach((domainKey) => {
                sectionDomainCounts.set(domainKey, (sectionDomainCounts.get(domainKey) ?? 0) + 1);
                if (!sectionFirstSeenIndex.has(domainKey)) {
                    sectionFirstSeenIndex.set(domainKey, sectionOrderCounter);
                    sectionOrderCounter += 1;
                }
                if (!firstSeenSet.has(domainKey)) {
                    firstSeenSet.add(domainKey);
                    firstSeenDomainOrder.push(domainKey);
                }
            });
        });

        let dominantDomain: string | null = null;
        let dominantCount = -1;
        let dominantIndex = Number.POSITIVE_INFINITY;
        const sectionTitleTokens = toTokenSet(section.title);
        let dominantTitleOverlap = -1;
        sectionDomainCounts.forEach((count, domainKey) => {
            const candidateIndex = sectionFirstSeenIndex.get(domainKey) ?? Number.POSITIVE_INFINITY;
            const domainTitleTokens = toTokenSet(toDomainTitle(domainKey));
            const titleOverlap = countTokenOverlap(sectionTitleTokens, domainTitleTokens);

            if (count > dominantCount) {
                dominantDomain = domainKey;
                dominantCount = count;
                dominantIndex = candidateIndex;
                dominantTitleOverlap = titleOverlap;
                return;
            }

            if (count === dominantCount) {
                // No clear majority in this section: use section title overlap as tie-break.
                if (titleOverlap > dominantTitleOverlap) {
                    dominantDomain = domainKey;
                    dominantCount = count;
                    dominantIndex = candidateIndex;
                    dominantTitleOverlap = titleOverlap;
                    return;
                }
                if (titleOverlap === dominantTitleOverlap && candidateIndex < dominantIndex) {
                    dominantDomain = domainKey;
                    dominantCount = count;
                    dominantIndex = candidateIndex;
                    dominantTitleOverlap = titleOverlap;
                }
            }
        });

        if (dominantDomain !== null && !dominantSet.has(dominantDomain)) {
            dominantSet.add(dominantDomain);
            dominantDomainOrder.push(dominantDomain);
        }
    });

    const domainOrder: string[] = [...dominantDomainOrder];
    firstSeenDomainOrder.forEach((domainKey) => {
        if (!dominantSet.has(domainKey)) {
            domainOrder.push(domainKey);
            dominantSet.add(domainKey);
        }
    });
    normalizedScoreByDomain.forEach((_totals, domainKey) => {
        if (!dominantSet.has(domainKey)) {
            domainOrder.push(domainKey);
            dominantSet.add(domainKey);
        }
    });

    return domainOrder.map((domainKey) => {
        const scoreTotals = normalizedScoreByDomain.get(domainKey) ?? null;
        let itemCount = 0;
        const questions: DomainQuestionRow[] = [];
        const sectionNotes: string[] = [];

        instrument.sections.forEach((section, sectionIndex) => {
            let sectionTouchesDomain = false;
            section.questions.forEach((question) => {
                const domainKeysForQuestion = getQuestionDomainKeys(question);
                if (!domainKeysForQuestion.includes(domainKey)) {
                    return;
                }
                sectionTouchesDomain = true;
                itemCount += 1;
                const responses =
                    auditSession.aggregate.sections[section.section_key]?.responses[question.question_key] ?? {};
                if (question.question_type === "scaled") {
                    questions.push(buildDomainQuestionRow(question, responses));
                }
            });
            if (sectionTouchesDomain) {
                const note = collectSectionNote(auditSession, section.section_key, sectionIndex + 1, section.title);
                if (note !== null) {
                    sectionNotes.push(note);
                }
            }
        });

        questions.sort(compareQuestionRowsByIdentifier);

        return {
            domainKey,
            domainTitle: toDomainTitle(domainKey),
            scoreTotals,
            itemCount,
            sectionNotes,
            questions,
        };
    });
}

/**
 * Build best- and worst-domain rankings for each construct.
 *
 * @param domainRows Domain rows with titles and score totals.
 * @returns Six construct rankings in a stable order.
 */
export function buildConstructRankings(domainRows: DomainReportRow[]): ConstructRanking[] {
    return CONSTRUCT_ACCESSORS.map((accessor) => {
        const candidates: { title: string; score: number; max: number; ratio: number }[] = [];
        domainRows.forEach((row) => {
            if (row.scoreTotals === null) {
                return;
            }
            const maximum = accessor.max(row.scoreTotals);
            if (maximum <= 0) {
                return;
            }
            const value = accessor.value(row.scoreTotals);
            const ratio = value / maximum;
            candidates.push({
                title: row.domainTitle,
                score: value,
                max: maximum,
                ratio,
            });
        });

        if (candidates.length === 0) {
            return { constructKey: accessor.key, bestDomain: null, worstDomain: null };
        }

        const firstCandidate = candidates[0];
        if (firstCandidate === undefined) {
            return { constructKey: accessor.key, bestDomain: null, worstDomain: null };
        }

        let best = firstCandidate;
        let worst = firstCandidate;
        for (let index = 1; index < candidates.length; index += 1) {
            const current = candidates[index];
            if (current === undefined) {
                continue;
            }
            if (current.ratio > best.ratio) {
                best = current;
            }
            if (current.ratio < worst.ratio) {
                worst = current;
            }
        }

        return {
            constructKey: accessor.key,
            bestDomain: {
                domainTitle: best.title,
                score: best.score,
                max: best.max,
            },
            worstDomain: {
                domainTitle: worst.title,
                score: worst.score,
                max: worst.max,
            },
        };
    });
}

/**
 * Format a construct score line for best/worst cells.
 *
 * @param score Raw score total.
 * @param max Maximum score.
 * @returns Compact text for tables.
 */
export function formatConstructDomainLine(score: number, max: number): string {
    return `${formatScoreValue(score)} / ${formatScoreValue(max)}`;
}

/**
 * Returns a human-readable label for the audit execution mode.
 * "audit" → Place Audit, "survey" → Place Survey, "both" → Full Assessment.
 *
 * @param mode Execution mode from the audit scores object.
 * @param t Active translate function from the reports namespace.
 * @returns Localised label string.
 */
export function formatExecutionModeLabel(
    mode: AuditSession["scores"]["execution_mode"],
    t: (key: string, options: Record<string, string>) => string,
): string {
    if (mode === "audit") {
        return t("detail.auditTypePlaceAudit", { ns: "reports" });
    }
    if (mode === "survey") {
        return t("detail.auditTypePlaceSurvey", { ns: "reports" });
    }
    if (mode === "both") {
        return t("detail.auditTypeFullAssessment", { ns: "reports" });
    }
    return "—";
}
