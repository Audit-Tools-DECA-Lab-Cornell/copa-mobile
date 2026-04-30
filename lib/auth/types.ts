/**
 * Account roles supported by the playspace backend.
 */
export type AccountType = "ADMIN" | "MANAGER" | "AUDITOR";

/**
 * Authenticated user shape consumed by the mobile app.
 */
export interface AuthUser {
    readonly id: string;
    readonly email: string;
    readonly name: string | null;
    readonly accountType: AccountType;
    readonly approved: boolean;
    readonly profileCompleted: boolean;
    /** Routing signal returned by the backend: WAITING_APPROVAL | COMPLETE_PROFILE | DASHBOARD */
    readonly nextStep: string;
    /** The manager organisation name this auditor belongs to. Null when not set. */
    readonly organization: string | null;
}

/**
 * Auth session persisted locally for route guarding.
 */
export interface AuthSession {
    readonly accessToken: string;
    readonly tokenType: "bearer";
    readonly expiresAt: string;
    readonly user: AuthUser;
}

/**
 * Login payload for password-based authentication.
 */
export interface LoginPayload {
    readonly email: string;
    readonly password: string;
}

/**
 * Signup payload for account creation.
 */
export interface SignupPayload {
    readonly email: string;
    readonly password: string;
    readonly name: string;
    readonly accountType: AccountType;
}

/**
 * Self-signup access request payload (Scenario A).
 */
export interface AccessRequestPayload {
    readonly name: string;
    readonly email: string;
    readonly password: string;
    readonly managerEmail: string;
}
