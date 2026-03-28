import { defineConfig } from "@playwright/test";

export default defineConfig({
    // wherever your own tests live
    testDir: "./tests",

    // ignore all tests under node_modules
    testIgnore: ["**/node_modules/**"],
});
