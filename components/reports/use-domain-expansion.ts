import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Expand/collapse state for domain sections in submitted audit reports.
 * Keys include each `domainKey` plus `__overall__` when the overall card is listed.
 */
export function useDomainExpansion(
    domainKeys: readonly string[],
    defaultCollapsedKeys: readonly string[] = [],
): {
    readonly expandedByKey: Readonly<Record<string, boolean>>;
    readonly expandAll: () => void;
    readonly collapseAll: () => void;
    readonly toggle: (key: string) => void;
    readonly isExpanded: (key: string) => boolean;
    readonly allExpanded: boolean;
} {
    const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>({});

    const stableKeys = useMemo(() => [...domainKeys], [domainKeys]);
    const stableDefaultCollapsedKeys = useMemo(() => [...defaultCollapsedKeys], [defaultCollapsedKeys]);

    useEffect(() => {
        setExpandedByKey((previous) => {
            const next = { ...previous };
            for (const key of stableKeys) {
                if (next[key] === undefined) {
                    // Presentation-only default: domains flagged by the caller
                    // (e.g. fully N/A) start collapsed but stay expandable.
                    next[key] = !stableDefaultCollapsedKeys.includes(key);
                }
            }

            for (const key of Object.keys(next)) {
                if (!stableKeys.includes(key)) {
                    delete next[key];
                }
            }

            return next;
        });
    }, [stableKeys, stableDefaultCollapsedKeys]);

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
            const value = expandedByKey[key];
            if (value === undefined) {
                // Not yet seeded by the effect: mirror the seeded default so
                // default-collapsed domains never flash open on first render.
                return !stableDefaultCollapsedKeys.includes(key);
            }
            return value;
        },
        [expandedByKey, stableDefaultCollapsedKeys],
    );

    const allExpanded = useMemo(() => {
        if (stableKeys.length === 0) {
            return false;
        }

        return Object.values(expandedByKey).every(Boolean);
    }, [expandedByKey, stableKeys]);

    return { expandedByKey, expandAll, collapseAll, toggle, isExpanded, allExpanded };
}
