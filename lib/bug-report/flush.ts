import type { AuthSession } from "lib/auth/types";

import { createBugReport } from "lib/bug-report/api";
import { readPendingBugReports, removePendingBugReport } from "lib/bug-report/queue";
import { uploadCapturedScreenshot, type UploadedScreenshot } from "lib/bug-report/screenshot";

export interface FlushResult {
    /** Reports that reached the backend and were removed from the queue. */
    submitted: number;
    /** Reports that failed to send and remain queued for a later attempt. */
    failed: number;
}

/**
 * Send queued bug reports to the backend. Screenshots upload first, but upload
 * failures do not block submission. Reports that fail to send stay queued for
 * retry. Call only when online.
 */
export async function flushPendingBugReports(session: AuthSession): Promise<FlushResult> {
    const pending = readPendingBugReports();
    let submitted = 0;
    let failed = 0;

    for (const report of pending) {
        try {
            let screenshot: UploadedScreenshot | null = null;
            if (report.screenshotLocalUri) {
                try {
                    screenshot = await uploadCapturedScreenshot(session, report.screenshotLocalUri);
                } catch {
                    // Attachment is optional: send the report without the image.
                    screenshot = null;
                }
            }

            await createBugReport(session, {
                surface: "mobile",
                title: report.title,
                description: report.description,
                severity: report.severity,
                ...(report.projectId ? { project_id: report.projectId } : {}),
                ...(report.placeId ? { place_id: report.placeId } : {}),
                ...(report.submissionId ? { playspace_submission_id: report.submissionId } : {}),
                ...(screenshot ? { screenshot_url: screenshot.url, screenshot_public_id: screenshot.publicId } : {}),
                context: report.context,
            });

            removePendingBugReport(report.id);
            submitted += 1;
        } catch {
            failed += 1;
        }
    }

    return { submitted, failed };
}
