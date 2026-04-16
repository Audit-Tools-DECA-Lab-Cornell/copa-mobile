import { t } from "i18next";
import { fetchAllAssignedPlaces, fetchAssignedPlacesPage } from "lib/audit/places-api";
import { create } from "zustand";

import type { AuthSession } from "lib/auth/types";
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
    loadPlaces: (session: AuthSession, options?: Readonly<LoadPlacesOptions>) => Promise<void>;
    /** Clear the current error message. */
    clearError: () => void;
}

interface LoadPlacesOptions {
    /** Fetch all pages instead of a single page. Defaults to true. */
    readonly fetchAll?: boolean;
    /** 1-based page number used when `fetchAll` is false. Defaults to 1. */
    readonly page?: number;
    /** Page size used when `fetchAll` is false. Defaults to 8. */
    readonly pageSize?: number;
}

/**
 * Zustand store for the auditor's assigned places list.
 */
export const usePlacesStore = create<PlacesStoreState>((set) => ({
    places: [],
    isLoading: false,
    errorMessage: null,

    loadPlaces: async (session: AuthSession, options: Readonly<LoadPlacesOptions> = {}) => {
        set(() => ({
            isLoading: true,
            errorMessage: null,
        }));

        try {
            const shouldFetchAll = options.fetchAll ?? true;
            const allPlaces = shouldFetchAll
                ? await fetchAllAssignedPlaces(session)
                : (await fetchAssignedPlacesPage(session, options.page ?? 1, options.pageSize ?? 8)).items;
            set(() => ({
                places: allPlaces,
                isLoading: false,
                errorMessage: null,
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : t("unableToLoadPlaces", "Unable to load places.");
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
