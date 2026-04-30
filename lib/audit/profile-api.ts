import type { AuthSession } from "lib/auth/types";
import { t } from "i18next";
import { parsePayload, requestJson } from "lib/audit/api";
import { z } from "zod";

const myAccountSchema = z.object({
    account_id: z.string(),
    name: z.string(),
    email: z.string(),
    account_type: z.string(),
    organization: z.string().nullable().optional(),
});

const myAuditorProfileSchema = z.object({
    profile_id: z.string(),
    auditor_code: z.string(),
    full_name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    age_range: z.string().nullable(),
    gender: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    country: z.string().nullable(),
    role: z.string().nullable(),
});

export type MyAccount = z.infer<typeof myAccountSchema>;
export type MyAuditorProfile = z.infer<typeof myAuditorProfileSchema>;

/**
 * Fields that can be updated by the auditor via the self-service profile endpoint.
 */
export interface AuditorProfileUpdatePayload {
    readonly full_name?: string | undefined;
    readonly email?: string | undefined;
    readonly phone?: string | undefined;
    readonly gender?: string | undefined;
    readonly age_range?: string | undefined;
    readonly city?: string | undefined;
    readonly province?: string | undefined;
    readonly country?: string | undefined;
    readonly role?: string | undefined;
}

/**
 * Fetch the current user's account details.
 *
 * @param session Authenticated mobile session.
 * @returns Account details.
 */
export async function fetchMyAccount(session: AuthSession): Promise<MyAccount> {
    const payload = await requestJson(session, "/playspace/me", { method: "GET" });
    return parsePayload(payload, myAccountSchema, "Account response shape is invalid.");
}

/**
 * Fetch the current user's auditor profile.
 *
 * @param session Authenticated mobile session.
 * @returns Auditor profile details.
 */
export async function fetchMyAuditorProfile(session: AuthSession): Promise<MyAuditorProfile> {
    const payload = await requestJson(session, "/playspace/me/auditor-profile", {
        method: "GET",
    });
    return parsePayload(
        payload,
        myAuditorProfileSchema,
        t("auditorProfileResponseShapeIsInvalid", "Auditor profile response shape is invalid."),
    );
}

/**
 * Update mutable fields on the current auditor's profile.
 *
 * @param session Authenticated mobile session.
 * @param updatePayload Fields to update (omit a field to leave it unchanged).
 * @returns Updated auditor profile.
 */
export async function updateMyAuditorProfile(
    session: AuthSession,
    updatePayload: AuditorProfileUpdatePayload,
): Promise<MyAuditorProfile> {
    const payload = await requestJson(session, "/playspace/me/auditor-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
    });
    return parsePayload(
        payload,
        myAuditorProfileSchema,
        t("auditorProfileResponseShapeIsInvalid", "Auditor profile response shape is invalid."),
    );
}

/**
 * Accept terms and mark the auditor's onboarding as complete.
 *
 * @param session Authenticated mobile session.
 */
export async function completeOnboarding(session: AuthSession): Promise<MyAuditorProfile> {
    const payload = await requestJson(session, "/playspace/me/complete-onboarding", { method: "POST" });
    return parsePayload(payload, myAuditorProfileSchema, "Auditor profile response shape is invalid.");
}
