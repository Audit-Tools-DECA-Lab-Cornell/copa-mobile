import { create } from "zustand";
import type { AuthSession } from "lib/auth/types";
import { fetchAssignedPlaces } from "lib/audit/places-api";
import type { AuditorPlace } from "lib/audit/places-api";

/**
 * State shape for the auditor places store.
 */
interface PlacesStoreState {
    /** Flat list of places assigned to the current auditor. */
    readonly places: AuditorPlace[];
    /** Whether a network request is in flight. */
    readonly isLoading: boolean;
    /** Human-readable error from the last failed request, if any. */
    readonly errorMessage: string | null;
    /**
     * Fetch all assigned places from the backend and store the result.
     *
     * @param session Authenticated mobile session.
     */
    loadPlaces: (session: AuthSession) => Promise<void>;
    /** Clear the current error message. */
    clearError: () => void;
}

/**
 * Zustand store for the auditor's assigned places list.
 */
export const usePlacesStore = create<PlacesStoreState>((set) => ({
    places: [],
    isLoading: false,
    errorMessage: null,

    loadPlaces: async (session: AuthSession) => {
        set(() => ({
            isLoading: true,
            errorMessage: null,
        }));

        try {
            const places = await fetchAssignedPlaces(session);
            set(() => ({
                places,
                isLoading: false,
                errorMessage: null,
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to load places.";
            set(() => ({
                isLoading: false,
                errorMessage: message,
            }));
        }
    },

    clearError: () => {
        set(() => ({
            errorMessage: null,
        }));
    },
}));
