import { useToastController } from "@tamagui/toast";
import * as Network from "expo-network";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppState, type AppStateStatus } from "react-native";

import type { AuthSession } from "lib/auth/types";

import { isDeviceOnline } from "lib/bug-report/context";
import { isBugReportingEnabled } from "lib/bug-report/feature";
import { flushPendingBugReports } from "lib/bug-report/flush";
import { countPendingBugReports } from "lib/bug-report/queue";

/**
 * Confirm request injected by the caller. Declared structurally so this hook
 * stays free of UI-layer imports; the caller owns rendering the dialog.
 */
type RequestConfirm = (
    options: Readonly<{
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
    }>,
) => Promise<boolean>;

/**
 * Ask the auditor whether to submit queued bug reports when the app returns
 * online in the foreground. This replaces background sync: reports stay on the
 * device until the auditor confirms.
 *
 * Runs on the same triggers as queue flushing - first authenticated render,
 * connectivity restored, and foregrounding - but only prompts.
 *
 * @param session The active auth session, or null if signed out.
 * @param isReady Whether auth and local storage are ready for submission.
 * @param requestConfirm Opens the in-window confirm dialog and resolves the choice.
 */
export function useBugReportFlushPrompt(
    session: AuthSession | null,
    isReady: boolean,
    requestConfirm: RequestConfirm,
): void {
    const { t } = useTranslation("bugReport");
    const toast = useToastController();
    // Guards against stacking prompts: at most one prompt is live at a time.
    const isPromptingRef = useRef(false);

    useEffect(() => {
        if (!isBugReportingEnabled() || !isReady || session === null) {
            return;
        }

        const maybePrompt = () => {
            if (isPromptingRef.current || countPendingBugReports() === 0) {
                return;
            }
            void (async () => {
                if (!(await isDeviceOnline())) {
                    return;
                }
                const count = countPendingBugReports();
                if (isPromptingRef.current || count === 0) {
                    return;
                }
                isPromptingRef.current = true;
                try {
                    const shouldSubmit = await requestConfirm({
                        title: t("queue.promptTitle"),
                        message: t("queue.promptMessage", { count }),
                        confirmLabel: t("queue.promptSubmit"),
                        cancelLabel: t("queue.promptLater"),
                    });
                    if (!shouldSubmit) {
                        return;
                    }

                    const result = await flushPendingBugReports(session);
                    if (result.submitted > 0) {
                        toast.show(t("queue.flushed", { count: result.submitted }));
                    }
                    if (result.failed > 0) {
                        toast.show(t("queue.flushPartial"));
                    }
                } finally {
                    isPromptingRef.current = false;
                }
            })();
        };

        maybePrompt();

        const networkSubscription = Network.addNetworkStateListener((state) => {
            if (state.isConnected && state.isInternetReachable !== false) {
                maybePrompt();
            }
        });

        const appStateSubscription = AppState.addEventListener("change", (next: AppStateStatus) => {
            if (next === "active") {
                maybePrompt();
            }
        });

        return () => {
            networkSubscription.remove();
            appStateSubscription.remove();
        };
    }, [session, isReady, requestConfirm, t, toast]);
}
