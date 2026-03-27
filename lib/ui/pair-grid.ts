export interface PairGridRow<T> {
    readonly id: string;
    readonly left: T;
    readonly right: T | null;
}

/**
 * Build stable two-item rows for tablet queue layouts while preserving the
 * original item order.
 *
 * @param items Ordered list items.
 * @param getItemId Stable id builder for each item.
 * @returns Pair-grid rows with optional trailing empty slot.
 */
export function buildPairGridRows<T>(
    items: readonly T[],
    getItemId: (item: T, index: number) => string,
): PairGridRow<T>[] {
    const rows: PairGridRow<T>[] = [];

    for (let index = 0; index < items.length; index += 2) {
        const left = items[index];
        const right = items[index + 1] ?? null;

        if (left === undefined) {
            continue;
        }

        const leftId = getItemId(left, index);
        const rightId = right === null ? "empty" : getItemId(right, index + 1);

        rows.push({
            id: `${leftId}__${rightId}`,
            left,
            right,
        });
    }

    return rows;
}
