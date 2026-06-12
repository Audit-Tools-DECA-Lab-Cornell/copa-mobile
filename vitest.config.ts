import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        conditions: ["node", "require", "default"], // ← exclude "react-native" condition
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"], // ← no .native.js
        alias: {
            app: path.resolve(__dirname, "app"),
            assets: path.resolve(__dirname, "assets"),
            components: path.resolve(__dirname, "components"),
            lib: path.resolve(__dirname, "lib"),
            stores: path.resolve(__dirname, "stores"),
        },
    },
    test: {
        environment: "node",
        include: ["tests/**/*.spec.ts"],
        setupFiles: ["tests/setup.ts"],
        exclude: ["**/tamagui.config*", "**/tamagui.build*"],
        // ✅ Tell Vitest not to transform these - mock them instead
        server: {
            deps: {
                inline: ["tamagui", "@tamagui/core", "@tamagui/config", "@tamagui/web", "@tamagui/themes"],
            },
        },
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: [
                "stores/notifications-store.ts",
                "lib/notifications/polling.ts",
                "lib/storage/notification-cache.ts",
            ],
        },
    },
});
