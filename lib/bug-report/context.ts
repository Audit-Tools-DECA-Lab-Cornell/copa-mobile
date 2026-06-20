import Constants from "expo-constants";
import * as Network from "expo-network";
import { Platform } from "react-native";

import type { BugReportContext } from "lib/bug-report/types";

/**
 * Route/audit breadcrumbs the caller already knows from navigation state and the
 * audit store. Only identifiers are accepted - never answer content.
 */
export interface BugReportRouteContext {
    route?: string;
    screen?: string;
    projectId?: string;
    placeId?: string;
    /** The PlayspaceSubmission id of the audit the reporter is in, if any. */
    submissionId?: string;
    sectionId?: string;
    questionId?: string;
    syncPhase?: string;
}

/**
 * Assemble a privacy-filtered diagnostic context for a mobile bug report.
 *
 * This is an allow-list by construction: device, app, locale, network, and the
 * passed-in route/audit identifiers only. It never reads audit answers, notes,
 * tokens, or persisted storage dumps.
 */
export async function buildMobileBugReportContext(route: BugReportRouteContext): Promise<BugReportContext> {
    const context: BugReportContext = {
        platform: Platform.OS,
        os_version: String(Platform.Version),
        app_version: Constants.expoConfig?.version ?? undefined,
        client_timestamp: new Date().toISOString(),
    };

    if (route.route) context.route = route.route;
    if (route.screen) context.screen = route.screen;
    if (route.projectId) context.project_id = route.projectId;
    if (route.placeId) context.place_id = route.placeId;
    if (route.submissionId) context.playspace_submission_id = route.submissionId;
    if (route.sectionId) context.section_id = route.sectionId;
    if (route.questionId) context.question_id = route.questionId;
    if (route.syncPhase) context.sync_phase = route.syncPhase;

    try {
        const networkState = await Network.getNetworkStateAsync();
        context.network_online = networkState.isConnected !== false && networkState.isInternetReachable !== false;
        if (networkState.type) {
            context.network_type = String(networkState.type);
        }
    } catch {
        /* network probing is best-effort; omit on failure */
    }

    return context;
}

/**
 * Whether the device currently appears online enough to submit. Bug-report
 * submission is online-only, so callers gate on this before sending.
 */
export async function isDeviceOnline(): Promise<boolean> {
    try {
        const networkState = await Network.getNetworkStateAsync();
        return networkState.isConnected !== false && networkState.isInternetReachable !== false;
    } catch {
        return false;
    }
}
