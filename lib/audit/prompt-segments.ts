/**
 * Shared parsing for instrument prompts that use `**bold**` markers (same as execution UI).
 */

export interface PromptSegment {
    readonly text: string;
    readonly bold: boolean;
}

/**
 * Parse `**bold**` markers into segments for rich text rendering.
 */
export function parsePromptSegments(raw: string): PromptSegment[] {
    const segments: PromptSegment[] = [];
    const parts = raw.split("**");
    for (let index = 0; index < parts.length; index++) {
        const part = parts[index] ?? "";
        if (part.length === 0) {
            continue;
        }
        segments.push({ text: part, bold: index % 2 === 1 });
    }
    return segments;
}

/**
 * Format a backend question key (e.g. `q_8_1`) like the execution question card (`Q 8.1`).
 */
export function formatQuestionKeyForDisplay(questionKey: string): string {
    if (!questionKey.startsWith("q_")) {
        return questionKey;
    }
    const sections = questionKey.slice(2).split("_");
    return `Q ${sections.map((section) => section.toUpperCase()).join(".")}`;
}
