import { type MockInstance, afterEach, beforeEach, vi } from "vitest";

// ✅ Mock the entire Tamagui runtime before any module resolves it
vi.mock("@tamagui/core", () => ({ default: {}, createTamagui: vi.fn(() => ({})) }));
vi.mock("@tamagui/web", () => ({ default: {} }));
vi.mock("tamagui", () => ({
    createTamagui: vi.fn(() => ({})),
    createFont: vi.fn(() => ({})),
    Text: vi.fn(),
    TamaguiProvider: vi.fn(),
}));
vi.mock("../tamagui.config", () => ({ config: {} }));

let consoleErrorSpy: MockInstance;
let consoleLogSpy: MockInstance;

beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
});
