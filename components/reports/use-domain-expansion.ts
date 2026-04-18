import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Expand/collapse state for domain sections in short/extended reports.
 * Keys include each `domainKey` plus `__overall__` when the overall card is listed.
 */
export function useDomainExpansion(domainKeys: readonly string[]): {
    readonly expandedByKey: Readonly<Record<string, boolean>>;
    readonly expandAll: () => void;
    readonly collapseAll: () => void;
    readonly toggle: (key: string) => void;
    readonly isExpanded: (key: string) => boolean;
    readonly allExpanded: boolean;
} {
    const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>({});

    const stableKeys = useMemo(() => [...domainKeys], [domainKeys]);

    useEffect(() => {
        setExpandedByKey((previous) => {
            const next = { ...previous };
            for (const key of stableKeys) {
                if (next[key] === undefined) {
                    next[key] = true;
                }
            }

            for (const key of Object.keys(next)) {
                if (!stableKeys.includes(key)) {
                    delete next[key];
                }
            }

            return next;
        });
    }, [stableKeys]);

    const expandAll = useCallback(() => {
        setExpandedByKey(Object.fromEntries(stableKeys.map((key) => [key, true])));
    }, [stableKeys]);

    const collapseAll = useCallback(() => {
        setExpandedByKey(Object.fromEntries(stableKeys.map((key) => [key, false])));
    }, [stableKeys]);

    const toggle = useCallback((key: string) => {
        setExpandedByKey((previous) => ({
            ...previous,
            [key]: previous[key] === false,
        }));
    }, []);

    const isExpanded = useCallback(
        (key: string) => {
            return expandedByKey[key] !== false;
        },
        [expandedByKey],
    );

    const allExpanded = useMemo(() => {
        if (stableKeys.length === 0) {
            return false;
        }

        return Object.values(expandedByKey).every(Boolean);
    }, [expandedByKey, stableKeys]);

    return { expandedByKey, expandAll, collapseAll, toggle, isExpanded, allExpanded };
}
