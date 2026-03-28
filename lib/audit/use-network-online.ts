import * as Network from "expo-network";
import { useEffect, useState } from "react";

/**
 * Interpret Expo network state as online when neither flag explicitly says offline.
 *
 * @param state Latest network snapshot from Expo.
 * @returns Whether the app should treat the device as online for sync UX.
 */
function evaluateOnline(state: Network.NetworkState): boolean {
    return state.isConnected !== false && state.isInternetReachable !== false;
}

/**
 * Subscribe to connectivity changes for UI that should differ online vs offline
 * (e.g. show upload progress only when a network path exists).
 *
 * @returns True when the device appears online; defaults to true if state is unknown.
 */
export function useNetworkOnline(): boolean {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        let cancelled = false;

        void Network.getNetworkStateAsync()
            .then((state) => {
                if (!cancelled) {
                    setOnline(evaluateOnline(state));
                }
            })
            .catch(() => {
                /* keep optimistic default */
            });

        const subscription = Network.addNetworkStateListener((state) => {
            setOnline(evaluateOnline(state));
        });

        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, []);

    return online;
}
