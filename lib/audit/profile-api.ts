import type { AuthSession } from "lib/auth/types";
import { t } from "i18next";
import { parsePayload, requestJson } from "lib/audit/api";
import { z } from "zod";

const myAccountSchema = z.object({
    account_id: z.string(),
    name: z.string(),
    email: z.string(),
    account_type: z.string(),
});

const myAuditorProfileSchema = z.object({
    profile_id: z.string(),
    auditor_code: z.string(),
    full_name: z.string(),
    email: z.string().nullable(),
    age_range: z.string().nullable(),
    gender: z.string().nullable(),
    country: z.string().nullable(),
    role: z.string().nullable(),
});

export type MyAccount = z.infer<typeof myAccountSchema>;
export type MyAuditorProfile = z.infer<typeof myAuditorProfileSchema>;

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
