import { memo } from "react";
import { Text } from "tamagui";
import { parsePromptSegments } from "lib/audit/prompt-segments";
import { useDesignSystem } from "lib/design-system";

export interface PromptRichTextProps {
    readonly raw: string;
    readonly fontSize: number;
    readonly lineHeight: number;
}

/**
 * Renders instrument prompt text with `**bold**` spans (matches playspace-audit question card).
 */
export const PromptRichText = memo(function PromptRichText({ raw, fontSize, lineHeight }: PromptRichTextProps) {
    const ds = useDesignSystem();
    const segments = parsePromptSegments(raw);

    return (
        <Text fontSize={fontSize} lineHeight={lineHeight}>
            {segments.map((segment, index) => (
                <Text
                    key={index}
                    fontFamily={segment.bold ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                    color={segment.bold ? ds.colors.primary : ds.colors.foreground}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                >
                    {segment.text}
                </Text>
            ))}
        </Text>
    );
});
