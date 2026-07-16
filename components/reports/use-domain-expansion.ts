import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    /** Default applied per key at the last seeding, so default changes re-seed. */
    const seededDefaultsRef = useRef(new Map<string, boolean>());

    useEffect(() => {
        setExpandedByKey((previous) => {
            const next = { ...previous };
            for (const key of stableKeys) {
                // Presentation-only default: domains flagged by the caller
                // (e.g. fully N/A) start collapsed but stay expandable. When a
                // key's underlying data flips scored <-> all-N/A, its default
                // changes and is re-applied rather than keeping stale state.
                const defaultExpanded = !stableDefaultCollapsedKeys.includes(key);
                if (next[key] === undefined || seededDefaultsRef.current.get(key) !== defaultExpanded) {
                    next[key] = defaultExpanded;
                }
            }

            for (const key of Object.keys(next)) {
                if (!stableKeys.includes(key)) {
                    delete next[key];
                }
            }

            return next;
        });
        seededDefaultsRef.current = new Map(stableKeys.map((key) => [key, !stableDefaultCollapsedKeys.includes(key)]));
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
