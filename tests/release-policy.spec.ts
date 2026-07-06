import { describe, expect, it } from "vitest";

import { compareAppVersions, evaluateReleasePolicy, type MobileReleasePolicyResponse } from "lib/release-policy-core";

const policy: MobileReleasePolicyResponse = {
    product: "playspace",
    message: "Install the latest COPA app.",
    android: {
        latest_version: "0.5.8",
        minimum_supported_version: "0.5.8",
        latest_build: 12,
        minimum_supported_build: 10,
        update_url: "https://play.google.com/store/apps/details?id=test",
    },
    ios: {
        latest_version: "0.5.8",
        minimum_supported_version: "0.5.8",
        latest_build: null,
        minimum_supported_build: null,
        update_url: "https://apps.apple.com/app/test/id1",
    },
};

describe("release policy", () => {
    it("blocks Android builds below the minimum supported build", () => {
        const decision = evaluateReleasePolicy(policy, {
            platform: "android",
            version: "0.5.8",
            buildNumber: "9",
        });

        expect(decision.shouldBlock).toBe(true);
        expect(decision.reason).toBe("build");
    });

    it("blocks versions below the minimum supported version", () => {
        const decision = evaluateReleasePolicy(policy, {
            platform: "ios",
            version: "0.5.7",
            buildNumber: null,
        });

        expect(decision.shouldBlock).toBe(true);
        expect(decision.reason).toBe("version");
    });

    it("allows the current minimum version and build", () => {
        const decision = evaluateReleasePolicy(policy, {
            platform: "android",
            version: "0.5.8",
            buildNumber: "10",
        });

        expect(decision.shouldBlock).toBe(false);
    });

    it("compares dotted app versions numerically", () => {
        expect(compareAppVersions("0.5.10", "0.5.8")).toBe(1);
        expect(compareAppVersions("0.5.7", "0.5.8")).toBe(-1);
        expect(compareAppVersions("0.5.8", "0.5.8")).toBe(0);
    });
});
