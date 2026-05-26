import type { AuditSession, PlayspaceInstrument } from "lib/audit/types";

interface ActiveInstrumentSourceParams {
    readonly fetchedInstrument: PlayspaceInstrument | null;
    readonly cachedInstrument: PlayspaceInstrument | null;
    readonly bundledInstrument: PlayspaceInstrument | null;
}

interface AuditScopedInstrumentParams {
    readonly activeInstrument: PlayspaceInstrument | null;
    readonly auditSession: Pick<AuditSession, "instrument"> | null | undefined;
}

/**
 * Compare two dotted instrument-version strings numerically when possible.
 *
 * Returns a positive number when `leftVersion` is newer, a negative number
 * when `rightVersion` is newer, and `0` when they are equivalent.
 */
export function compareInstrumentVersions(leftVersion: string, rightVersion: string): number {
    const leftParts = leftVersion.split(".");
    const rightParts = rightVersion.split(".");
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const leftPart = leftParts[index] ?? "0";
        const rightPart = rightParts[index] ?? "0";
        const leftNumeric = parseNumericVersionPart(leftPart);
        const rightNumeric = parseNumericVersionPart(rightPart);

        if (leftNumeric !== null && rightNumeric !== null) {
            if (leftNumeric !== rightNumeric) {
                return leftNumeric - rightNumeric;
            }
            continue;
        }

        const lexicalComparison = leftPart.localeCompare(rightPart, undefined, {
            numeric: true,
            sensitivity: "base",
        });
        if (lexicalComparison !== 0) {
            return lexicalComparison;
        }
    }

    return 0;
}

/**
 * Resolve the best app-wide active instrument source.
 *
 * Network data stays authoritative when available. If the fetch fails, prefer
 * the newest local copy so an upgraded app bundle can replace a stale MMKV
 * cache even while offline.
 */
export function resolveActiveInstrumentSource({
    fetchedInstrument,
    cachedInstrument,
    bundledInstrument,
}: Readonly<ActiveInstrumentSourceParams>): PlayspaceInstrument | null {
    if (fetchedInstrument !== null) {
        return fetchedInstrument;
    }

    return pickNewerInstrument(cachedInstrument, bundledInstrument);
}

/**
 * Resolve the instrument that should drive one audit-specific screen.
 *
 * Audit flows must prefer the session's own instrument when present so
 * historical or legacy-version submissions render against the version they
 * were created with instead of the latest active instrument.
 */
export function resolveAuditScopedInstrument({
    activeInstrument,
    auditSession,
}: Readonly<AuditScopedInstrumentParams>): PlayspaceInstrument | null {
    return auditSession?.instrument ?? activeInstrument;
}

/**
 * Choose the newer of two local instrument candidates.
 */
export function pickNewerInstrument(
    leftInstrument: PlayspaceInstrument | null,
    rightInstrument: PlayspaceInstrument | null,
): PlayspaceInstrument | null {
    if (leftInstrument === null) {
        return rightInstrument;
    }
    if (rightInstrument === null) {
        return leftInstrument;
    }

    return compareInstrumentVersions(leftInstrument.instrument_version, rightInstrument.instrument_version) >= 0
        ? leftInstrument
        : rightInstrument;
}

/**
 * Parse one version segment as an integer when it is fully numeric.
 */
function parseNumericVersionPart(value: string): number | null {
    if (!/^\d+$/u.test(value)) {
        return null;
    }

    return Number.parseInt(value, 10);
}
