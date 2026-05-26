import { describe, expect, it } from "vitest";

import { playspaceInstrumentSchema, type AuditSession, type PlayspaceInstrument } from "lib/audit/types";
import {
    compareInstrumentVersions,
    resolveActiveInstrumentSource,
    resolveAuditScopedInstrument,
} from "lib/audit/instrument-resolution";

/**
 * Build a minimal valid instrument payload for version-selection tests.
 */
function buildInstrument(instrumentVersion: string, titleSuffix: string): PlayspaceInstrument {
    return playspaceInstrumentSchema.parse({
        instrument_key: "pvua_v5_2",
        instrument_name: `COPA ${titleSuffix}`,
        instrument_version: instrumentVersion,
        current_sheet: `COPA ${instrumentVersion}`,
        source_files: [],
        preamble: [],
        execution_modes: [
            {
                key: "audit",
                label: "Place Audit",
                description: null,
            },
        ],
        pre_audit_questions: [],
        scale_guidance: [],
        sections: [],
        legal_documents: [],
    });
}

/**
 * Build the smallest audit-session shape needed for instrument-resolution helpers.
 */
function buildAuditSession(instrument: PlayspaceInstrument | undefined): Pick<AuditSession, "instrument"> {
    return {
        instrument,
    };
}

describe("compareInstrumentVersions", () => {
    it("orders dotted numeric versions correctly", () => {
        expect(compareInstrumentVersions("5.13", "5.2")).toBeGreaterThan(0);
        expect(compareInstrumentVersions("5.2", "5.13")).toBeLessThan(0);
        expect(compareInstrumentVersions("5.13.1", "5.13")).toBeGreaterThan(0);
        expect(compareInstrumentVersions("5.13", "5.13")).toBe(0);
    });
});

describe("resolveActiveInstrumentSource", () => {
    it("prefers the newest available instrument when bundle is newer than cache", () => {
        const cachedInstrument = buildInstrument("5.2", "Cached");
        const bundledInstrument = buildInstrument("5.13", "Bundled");

        const resolvedInstrument = resolveActiveInstrumentSource({
            fetchedInstrument: null,
            cachedInstrument,
            bundledInstrument,
        });

        expect(resolvedInstrument?.instrument_version).toBe("5.13");
        expect(resolvedInstrument?.instrument_name).toBe("COPA Bundled");
    });

    it("prefers the freshly fetched instrument over stale local copies", () => {
        const fetchedInstrument = buildInstrument("5.14", "Fetched");
        const cachedInstrument = buildInstrument("5.13", "Cached");
        const bundledInstrument = buildInstrument("5.2", "Bundled");

        const resolvedInstrument = resolveActiveInstrumentSource({
            fetchedInstrument,
            cachedInstrument,
            bundledInstrument,
        });

        expect(resolvedInstrument?.instrument_version).toBe("5.14");
        expect(resolvedInstrument?.instrument_name).toBe("COPA Fetched");
    });
});

describe("resolveAuditScopedInstrument", () => {
    it("prefers the audit session instrument over the active store instrument", () => {
        const activeInstrument = buildInstrument("5.14", "Active");
        const sessionInstrument = buildInstrument("5.13", "Session");

        const resolvedInstrument = resolveAuditScopedInstrument({
            activeInstrument,
            auditSession: buildAuditSession(sessionInstrument),
        });

        expect(resolvedInstrument?.instrument_version).toBe("5.13");
        expect(resolvedInstrument?.instrument_name).toBe("COPA Session");
    });

    it("falls back to the active instrument when the audit session has none", () => {
        const activeInstrument = buildInstrument("5.14", "Active");

        const resolvedInstrument = resolveAuditScopedInstrument({
            activeInstrument,
            auditSession: buildAuditSession(undefined),
        });

        expect(resolvedInstrument?.instrument_version).toBe("5.14");
        expect(resolvedInstrument?.instrument_name).toBe("COPA Active");
    });
});
