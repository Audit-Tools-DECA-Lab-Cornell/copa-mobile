import type { QuestionResponsePayload } from "lib/audit/types";

export function toggleChecklistOption(
    selectedOptionKeys: readonly string[],
    optionKey: string,
    otherText: string,
    currentAnswers: QuestionResponsePayload,
): QuestionResponsePayload {
    const nextSelectedOptionKeys = selectedOptionKeys.includes(optionKey)
        ? selectedOptionKeys.filter((currentKey) => currentKey !== optionKey)
        : [...selectedOptionKeys, optionKey];

    const nextAnswers: QuestionResponsePayload = {
        selected_option_keys: nextSelectedOptionKeys,
    };

    if (nextSelectedOptionKeys.includes("other") && otherText.trim().length > 0) {
        nextAnswers.other_details = { text: otherText };
    }

    const questionNote = typeof currentAnswers.question_note === "string" ? currentAnswers.question_note : null;
    if (questionNote !== null) {
        nextAnswers.question_note = questionNote;
    }

    return nextAnswers;
}

export function setChecklistOtherText(
    selectedOptionKeys: readonly string[],
    nextText: string,
    currentAnswers: QuestionResponsePayload,
): QuestionResponsePayload {
    const nextAnswers: QuestionResponsePayload = {
        selected_option_keys: [...selectedOptionKeys],
    };

    if (nextText.trim().length > 0) {
        nextAnswers.other_details = { text: nextText };
    }

    const questionNote = typeof currentAnswers.question_note === "string" ? currentAnswers.question_note : null;
    if (questionNote !== null) {
        nextAnswers.question_note = questionNote;
    }

    return nextAnswers;
}
