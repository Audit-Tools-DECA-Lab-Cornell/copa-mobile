import { LogLayer, StructuredTransport } from "loglayer";
import { serializeError } from "serialize-error";

/**
 * Determines the minimum log level based on the runtime environment.
 *
 * - Development: "debug" for verbose local debugging
 * - Production: "info" to reduce noise in production builds
 */
function getLogLevel(): "debug" | "info" {
    const devFlag = typeof __DEV__ === "boolean" ? __DEV__ : process.env.NODE_ENV === "development";

    return devFlag ? "debug" : "info";
}

/**
 * Root LogLayer instance configured for the Playspace mobile app.
 *
 * Uses the StructuredTransport for consistent JSON-like output across
 * all environments. Errors are serialized via serialize-error to
 * preserve stack traces and message data in logs.
 *
 * Usage:
 *   import { logger } from "lib/logger";
 *
 *   logger.info("User logged in");
 *   logger.withMetadata({ userId: "123" }).info("Session created");
 *   logger.withError(err).error("Failed to sync audit");
 *   const childLogger = logger.withContext({ module: "auth" });
 *   childLogger.debug("Token refreshed");
 */
export const logger = new LogLayer({
    transport: new StructuredTransport({
        logger: console,
        level: getLogLevel(),
    }),
    errorSerializer: serializeError,
});

/**
 * Creates a child logger that inherits the parent configuration but
 * carries persistent context (e.g., a module name or feature flag).
 *
 * Every log emitted by the child logger includes the provided context
 * fields merged into the log output.
 *
 * @param module - Logical module or feature name for tagging log output
 * @returns A LogLayer instance pre-seeded with the given module context
 */
export function createModuleLogger(module: string): LogLayer {
    return logger.withContext({ module });
}
