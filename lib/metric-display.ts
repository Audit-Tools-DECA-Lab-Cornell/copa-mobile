interface CreateMetricDisplayStateOptions {
    readonly pendingText: string;
    readonly value: number | null;
    readonly formatValue: (value: number) => string;
}

interface MetricDisplayState {
    readonly value: string;
    readonly helperText?: string;
}

/**
 * Build a consistent value/helper pair for score cards that may still be pending.
 *
 * @param options Pending copy, raw numeric value, and formatter.
 * @returns Display-ready card state for metric components.
 */
export function createMetricDisplayState(options: Readonly<CreateMetricDisplayStateOptions>): MetricDisplayState {
    if (options.value === null) {
        return {
            value: "--",
            helperText: options.pendingText,
        };
    }

    return {
        value: options.formatValue(options.value),
    };
}
