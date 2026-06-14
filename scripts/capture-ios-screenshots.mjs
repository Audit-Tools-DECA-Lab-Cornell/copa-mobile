#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULT_SCHEME = "audit-tools-playspace-mobile";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_WAIT_MS = 25000;
const DEFAULT_LOGIN_WAIT_MS = 25000;
const DEFAULT_SCROLL_DELAY_MS = 800;
const DEFAULT_SIMULATOR = "booted";
const FIRST_SECTION_FALLBACK = "section_1_playspace_character_community";

const STATIC_TARGETS = [
	{ file: "01-login.png", route: "/(auth)/login", skipLogin: true },
	{ file: "02-signup.png", route: "/(auth)/signup", skipLogin: true },
	{ file: "03-home.png", route: "/", requiresAuth: true },
	{ file: "04-home-queue.png", route: "/?__screenshotScrollY=780", requiresAuth: true },
	{ file: "05-places.png", route: "/places", requiresAuth: true },
	{ file: "07-execute.png", route: "/execute", requiresAuth: true },
	{ file: "17-reports.png", route: "/reports", requiresAuth: true },
	{ file: "18-reports-list.png", route: "/reports?__screenshotScrollY=700", requiresAuth: true },
	{ file: "19-reports-preview.png", route: "/reports?__screenshotScrollY=1180", requiresAuth: true },
	{ file: "21-settings.png", route: "/settings", requiresAuth: true },
	{ file: "22-settings-preferences.png", route: "/settings?__screenshotScrollY=700", requiresAuth: true },
	{ file: "23-settings-about.png", route: "/settings?__screenshotScrollY=1250", requiresAuth: true }
];

function parseArgs(argv) {
	const options = {
		apiBaseUrl: DEFAULT_API_BASE_URL,
		appearance: null,       // null = auto (both light and dark)
		device: null,           // null = auto-detect from booted simulator
		email: null,
		password: null,
		reset: true,
		scheme: DEFAULT_SCHEME,
		simulator: DEFAULT_SIMULATOR,
		waitMs: DEFAULT_WAIT_MS,
		loginWaitMs: DEFAULT_LOGIN_WAIT_MS,
		list: false,
		outputDir: null,
		target: "all"
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		}
		if (arg === "--list") {
			options.list = true;
			continue;
		}
		if (arg === "--no-reset") {
			options.reset = false;
			continue;
		}

		const next = argv[index + 1];
		if (next === undefined || next.startsWith("--")) {
			throw new Error(`Missing value for ${arg}`);
		}

		if (arg === "--api-base-url") options.apiBaseUrl = stripTrailingSlash(next);
		else if (arg === "--appearance") options.appearance = next;
		else if (arg === "--device") options.device = next;
		else if (arg === "--email") options.email = next;
		else if (arg === "--password") options.password = next;
		else if (arg === "--scheme") options.scheme = next;
		else if (arg === "--simulator") options.simulator = next;
		else if (arg === "--wait-ms") options.waitMs = parsePositiveInteger(next, "--wait-ms");
		else if (arg === "--login-wait-ms") options.loginWaitMs = parsePositiveInteger(next, "--login-wait-ms");
		else if (arg === "--output-dir") options.outputDir = next;
		else if (arg === "--target") options.target = next;
		else throw new Error(`Unknown argument: ${arg}`);
		index += 1;
	}

	// Fall back to env vars when flags were not supplied. Unlike Expo, a plain
	// node script does not auto-load .env files, so load them here first.
	if (options.email === null || options.password === null) {
		loadEnvFiles();
	}
	if (options.email === null && typeof process.env.SCREENSHOT_EMAIL === "string") {
		options.email = process.env.SCREENSHOT_EMAIL.trim() || null;
	}
	if (options.password === null && typeof process.env.SCREENSHOT_PASSWORD === "string") {
		options.password = process.env.SCREENSHOT_PASSWORD || null;
	}

	if (options.device !== null && !["iphone", "ipad"].includes(options.device)) {
		throw new Error('--device must be "iphone" or "ipad".');
	}
	if (options.appearance !== null && !["light", "dark"].includes(options.appearance)) {
		throw new Error('--appearance must be "light" or "dark".');
	}

	return options;
}

function printHelp() {
	console.log(`Capture COPA mobile screenshots from a booted iOS simulator.

Usage:
  bun run screenshots:ios -- --email USER --password PASS
  bun run screenshots:ios -- --device iphone --appearance light --email USER --password PASS
  bun run screenshots:ios -- --device ipad --appearance dark --email USER --password PASS
  bun run screenshots:ios -- --list

Options:
  --api-base-url URL   Backend used only to resolve place/report IDs. Default: ${DEFAULT_API_BASE_URL}
  --appearance VALUE   light or dark. Omit to capture both appearances in sequence. Default: both
  --device VALUE       iphone or ipad. Omit to capture every booted simulator. Default: all booted
  --email VALUE        Screenshot auditor email (or set SCREENSHOT_EMAIL env var)
  --password VALUE     Screenshot auditor password (or set SCREENSHOT_PASSWORD env var)
  --login-wait-ms N    Extra wait after the first login target. Default: ${DEFAULT_LOGIN_WAIT_MS}
  --output-dir PATH    Output directory. Default: screenshots/<device>/<appearance>
  --scheme VALUE       App URL scheme. Default: ${DEFAULT_SCHEME}
  --simulator VALUE    simctl device target. Default: booted
  --target VALUE       all, public, protected, or a comma-separated list of PNG names
  --wait-ms VALUE      Delay after each deep link before capture. Default: ${DEFAULT_WAIT_MS}
  --no-reset           Keep the existing app auth session between targets
`);
}

/**
 * Load credentials from local .env files into process.env.
 *
 * Values already present in the environment (shell-exported, or set by an
 * earlier file) win, so .env.local takes precedence over .env, and an
 * exported shell variable takes precedence over both.
 */
function loadEnvFiles() {
	if (typeof process.loadEnvFile !== "function") {
		return;
	}
	for (const file of [".env.local", ".env"]) {
		const existingEmail = process.env.SCREENSHOT_EMAIL;
		const existingPassword = process.env.SCREENSHOT_PASSWORD;
		try {
			process.loadEnvFile(path.resolve(file));
		} catch {
			continue;
		}
		// Restore any credential already resolved by a higher-priority source.
		if (typeof existingEmail === "string") {
			process.env.SCREENSHOT_EMAIL = existingEmail;
		}
		if (typeof existingPassword === "string") {
			process.env.SCREENSHOT_PASSWORD = existingPassword;
		}
	}
}

function parsePositiveInteger(value, label) {
	if (!/^\d+$/.test(value)) throw new Error(`${label} must be a positive integer.`);
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`);
	return parsed;
}

function stripTrailingSlash(value) {
	return value.replace(/\/$/, "");
}

/**
 * Classify a simulator name as "iphone" or "ipad", or null when it is neither
 * (e.g. Apple TV / Watch simulators).
 */
function classifyDeviceType(name) {
	const normalized = name.toLowerCase();
	if (normalized.includes("ipad")) return "ipad";
	if (normalized.includes("iphone")) return "iphone";
	return null;
}

/**
 * List all iPhone / iPad simulators known to simctl with their concrete UDIDs
 * and current boot state.
 */
function listSimulators() {
	const result = spawnSync("xcrun", ["simctl", "list", "devices", "-j"], { encoding: "utf8" });
	if (result.error || result.status !== 0) {
		return [];
	}
	try {
		const data = JSON.parse(result.stdout);
		const simulators = [];
		for (const runtimeDevices of Object.values(data.devices ?? {})) {
			for (const device of runtimeDevices) {
				const deviceType = classifyDeviceType(device.name ?? "");
				if (deviceType === null) {
					continue;
				}
				simulators.push({
					udid: device.udid,
					name: device.name,
					state: device.state,
					isBooted: device.state === "Booted",
					deviceType
				});
			}
		}
		return simulators;
	} catch {
		return [];
	}
}

/**
 * Resolve the concrete simulators to capture, as { udid, name, deviceType }.
 *
 * Resolving real UDIDs up front (instead of relying on simctl's ambiguous
 * "booted" alias) keeps every capture pinned to one device, so the output
 * folder always matches the pixels and a simulator booted mid-run is ignored.
 *
 * - `--simulator <udid|name>`: that exact device.
 * - `--device iphone|ipad`: the first booted simulator of that type.
 * - neither: every booted simulator (one per type), so booting an iPhone and an
 *   iPad and running once captures both.
 */
function resolveTargetSimulators(options) {
	const simulators = listSimulators();

	if (options.simulator !== "booted") {
		const match = simulators.find(
			(simulator) => simulator.udid === options.simulator || simulator.name === options.simulator
		);
		if (match === undefined) {
			throw new Error(`No simulator matches --simulator "${options.simulator}".`);
		}
		if (!match.isBooted) {
			throw new Error(`Simulator "${match.name}" is not booted. Boot it first.`);
		}
		return [match];
	}

	const booted = simulators.filter((simulator) => simulator.isBooted);
	if (booted.length === 0) {
		throw new Error("No booted iOS simulator found. Boot an iPhone or iPad simulator first.");
	}

	if (options.device !== null) {
		const match = booted.find((simulator) => simulator.deviceType === options.device);
		if (match === undefined) {
			throw new Error(`No booted ${options.device} simulator found. Boot one or pass --simulator <udid>.`);
		}
		return [match];
	}

	// No device filter: one capture per booted device type (iPhone and/or iPad).
	const byType = new Map();
	for (const simulator of booted) {
		if (!byType.has(simulator.deviceType)) {
			byType.set(simulator.deviceType, simulator);
		}
	}
	return [...byType.values()];
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const sectionKey = await readFirstSectionKey();
	const discovery = await discoverBackendData(options);
	const targets = selectTargets(buildTargets(discovery, sectionKey), options.target);

	if (options.list) {
		for (const target of targets) {
			console.log(`${target.file}\t${target.route}${target.skipLogin ? "\tpublic" : "\tprotected"}`);
		}
		return;
	}

	ensureXcrunAvailable();

	// Resolve which appearances to capture. When omitted, capture both.
	const appearances = options.appearance !== null ? [options.appearance] : ["light", "dark"];

	// Resolve concrete simulators up front so every capture is pinned to one
	// device UDID for the whole run.
	const simulators = resolveTargetSimulators(options);

	if (options.outputDir !== null && simulators.length * appearances.length > 1) {
		throw new Error(
			"--output-dir cannot be combined with multiple devices or appearances. Narrow with --device and --appearance."
		);
	}

	console.log(
		`Capturing on: ${simulators.map((simulator) => `${simulator.deviceType} (${simulator.name})`).join(", ")}`
	);

	let anyFailures = false;

	for (const simulator of simulators) {
		for (const appearance of appearances) {
			const failed = await captureSimulatorRun({ options, simulator, appearance, targets });
			if (failed) {
				anyFailures = true;
			}
		}
	}

	if (anyFailures) {
		process.exitCode = 1;
	}
}

/**
 * Capture every target for one concrete simulator + appearance, writing the
 * PNGs and a manifest. Returns true when any target failed.
 */
async function captureSimulatorRun({ options, simulator, appearance, targets }) {
	const outputDir = path.resolve(
		options.outputDir ?? path.join("screenshots", simulator.deviceType, appearance)
	);
	await mkdir(outputDir, { recursive: true });

	console.log(`\n=== ${simulator.deviceType} / ${appearance} (${simulator.name}) ===`);
	run("xcrun", ["simctl", "ui", simulator.udid, "appearance", appearance]);

	const manifest = {
		generated_at: new Date().toISOString(),
		device: simulator.deviceType,
		simulator_name: simulator.name,
		simulator_udid: simulator.udid,
		appearance,
		api_base_url: options.apiBaseUrl,
		output_directory: outputDir,
		total_targets: targets.length,
		success_count: 0,
		failure_count: 0,
		successes: [],
		failures: []
	};

	// Reset and login happens at most once per run — on the first protected
	// target — so all subsequent screens reuse the cached session and do not
	// each pay a full logout→login round-trip.
	let hasResetThisRun = false;

	for (const target of targets) {
		try {
			if (target.requiresAuth && (options.email === null || options.password === null)) {
				throw new Error("Protected target requires --email and --password.");
			}
			if (target.skipReason) {
				throw new Error(target.skipReason);
			}

			const shouldReset = options.reset && !hasResetThisRun && !target.skipLogin;
			if (shouldReset) {
				hasResetThisRun = true;
			}

			const outputPath = path.join(outputDir, target.file);
			const url = buildBootstrapUrl(target, options, shouldReset);
			const waitMs = shouldReset ? options.loginWaitMs : options.waitMs;

			console.log(`Opening ${target.route}${shouldReset ? " (reset + login)" : ""}`);
			run("xcrun", ["simctl", "openurl", simulator.udid, url]);
			await sleep(waitMs);
			run("xcrun", ["simctl", "io", simulator.udid, "screenshot", outputPath]);

			manifest.successes.push({
				file: target.file,
				route: target.route,
				output_file: path.relative(process.cwd(), outputPath)
			});
			manifest.success_count += 1;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`Failed ${target.file}: ${message}`);
			manifest.failures.push({ file: target.file, route: target.route, message });
			manifest.failure_count += 1;
		}
	}

	await writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, "\t")}\n`);

	return manifest.failure_count > 0;
}

async function readFirstSectionKey() {
	try {
		const raw = await readFile(path.join("assets", "bundled-instrument.json"), "utf8");
		const parsed = JSON.parse(raw);
		const sections = parsed?.en?.sections;
		const firstSectionKey = Array.isArray(sections) ? sections[0]?.section_key : null;
		return typeof firstSectionKey === "string" && firstSectionKey.length > 0 ? firstSectionKey : FIRST_SECTION_FALLBACK;
	} catch {
		return FIRST_SECTION_FALLBACK;
	}
}

async function discoverBackendData(options) {
	if (options.email === null || options.password === null) {
		return { firstPlace: null, reportPlace: null };
	}

	try {
		const loginResponse = await fetch(`${options.apiBaseUrl}/playspace/auth/login`, {
			method: "POST",
			headers: { Accept: "application/json", "Content-Type": "application/json" },
			body: JSON.stringify({ email: options.email, password: options.password })
		});
		if (!loginResponse.ok) throw new Error(`login failed (${loginResponse.status})`);
		const loginPayload = await loginResponse.json();
		const token = loginPayload.access_token;
		if (typeof token !== "string" || token.length === 0) throw new Error("login response did not include access_token");

		const placesResponse = await fetch(`${options.apiBaseUrl}/playspace/auditor/me/places?page=1&page_size=100`, {
			headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
		});
		if (!placesResponse.ok) throw new Error(`places lookup failed (${placesResponse.status})`);
		const placesPayload = await placesResponse.json();
		const places = Array.isArray(placesPayload.items) ? placesPayload.items : [];
		return {
			firstPlace: places[0] ?? null,
			reportPlace: places.find((place) => typeof place.audit_id === "string" && place.audit_id.length > 0) ?? null
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`Backend data discovery unavailable: ${message}`);
		return { firstPlace: null, reportPlace: null };
	}
}

function buildTargets(discovery, sectionKey) {
	const dynamicTargets = [];
	const place = discovery.firstPlace;
	if (isResolvedPlace(place)) {
		const placeRoute = `/place/${encodeURIComponent(place.place_id)}?projectId=${encodeURIComponent(place.project_id)}`;
		const executeRoute = `/execute/${encodeURIComponent(place.place_id)}?projectId=${encodeURIComponent(place.project_id)}`;
		const preAuditRoute = `/execute/${encodeURIComponent(place.place_id)}/pre-audit?projectId=${encodeURIComponent(place.project_id)}`;
		const sectionRoute = `/execute/${encodeURIComponent(place.place_id)}/section/${encodeURIComponent(sectionKey)}?projectId=${encodeURIComponent(place.project_id)}`;
		dynamicTargets.push(
			{ file: "06-place-detail.png", route: placeRoute, requiresAuth: true },
			{ file: "08-execute-place.png", route: executeRoute, requiresAuth: true },
			{ file: "09-execute-place-sections.png", route: `${executeRoute}&__screenshotScrollY=680`, requiresAuth: true },
			{ file: "10-execute-place-footer.png", route: `${executeRoute}&__screenshotScrollY=1200`, requiresAuth: true },
			{ file: "11-execute-pre-audit.png", route: preAuditRoute, requiresAuth: true },
			{ file: "12-execute-pre-audit-questions.png", route: `${preAuditRoute}&__screenshotScrollY=700`, requiresAuth: true },
			{ file: "13-execute-pre-audit-footer.png", route: `${preAuditRoute}&__screenshotScrollY=1300`, requiresAuth: true },
			{ file: "14-execute-section.png", route: sectionRoute, requiresAuth: true },
			{ file: "15-execute-section-questions.png", route: `${sectionRoute}&__screenshotScrollY=780`, requiresAuth: true },
			{ file: "16-execute-section-notes.png", route: `${sectionRoute}&__screenshotScrollY=4000`, requiresAuth: true }
		);
	} else {
		dynamicTargets.push(unresolved("06-place-detail.png"), unresolved("08-execute-place.png"), unresolved("09-execute-place-sections.png"), unresolved("10-execute-place-footer.png"), unresolved("11-execute-pre-audit.png"), unresolved("12-execute-pre-audit-questions.png"), unresolved("13-execute-pre-audit-footer.png"), unresolved("14-execute-section.png"), unresolved("15-execute-section-questions.png"), unresolved("16-execute-section-notes.png"));
	}

	const reportPlace = discovery.reportPlace;
	if (isResolvedReportPlace(reportPlace)) {
		dynamicTargets.push({ file: "20-report-detail.png", route: `/report/${encodeURIComponent(reportPlace.audit_id)}`, requiresAuth: true });
		dynamicTargets.push({ file: "20-report-detail.png", route: `/report/${encodeURIComponent(reportPlace.audit_id)}?__screenshotScrollY=700`, requiresAuth: true });
		dynamicTargets.push({ file: "20-report-detail.png", route: `/report/${encodeURIComponent(reportPlace.audit_id)}?__screenshotScrollY=1200`, requiresAuth: true });
	} else {
		dynamicTargets.push(unresolved("20-report-detail.png", "No submitted audit with audit_id was returned by the assigned places API."));
	}

	return [...STATIC_TARGETS, ...dynamicTargets];
}

function unresolved(file, reason = "No assigned place was returned by the assigned places API.") {
	return { file, route: "", requiresAuth: true, skipReason: reason };
}

function isResolvedPlace(value) {
	return value !== null && typeof value.place_id === "string" && typeof value.project_id === "string";
}

function isResolvedReportPlace(value) {
	return isResolvedPlace(value) && typeof value.audit_id === "string" && value.audit_id.length > 0;
}

function selectTargets(targets, targetFilter) {
	if (targetFilter === "all") return targets;
	if (targetFilter === "public") return targets.filter((target) => target.skipLogin);
	if (targetFilter === "protected") return targets.filter((target) => !target.skipLogin);

	const requested = new Set(targetFilter.split(",").map((value) => value.trim()).filter(Boolean));
	return targets.filter((target) => requested.has(target.file));
}

function buildBootstrapUrl(target, options, shouldReset) {
	const url = new URL(`${options.scheme}://__screenshot-bootstrap`);
	const normalizedTarget = extractScreenshotAutomationParams(target.route);

	url.searchParams.set("target", normalizedTarget.route);
	url.searchParams.set("reset", shouldReset ? "1" : "0");
	if (normalizedTarget.scrollY !== null) {
		url.searchParams.set("__screenshotScrollY", normalizedTarget.scrollY);
	}
	url.searchParams.set(
		"__screenshotScrollDelayMs",
		normalizedTarget.scrollDelayMs ?? String(DEFAULT_SCROLL_DELAY_MS)
	);
	if (target.skipLogin) {
		url.searchParams.set("skipLogin", "1");
	} else {
		url.searchParams.set("email", options.email ?? "");
		url.searchParams.set("password", options.password ?? "");
	}
	return url.toString();
}

function extractScreenshotAutomationParams(route) {
	const queryStartIndex = route.indexOf("?");
	if (queryStartIndex === -1) {
		return { route, scrollY: null, scrollDelayMs: null };
	}

	const pathname = route.slice(0, queryStartIndex);
	const queryString = route.slice(queryStartIndex + 1);
	const params = new URLSearchParams(queryString);
	const scrollY = params.get("__screenshotScrollY");
	const scrollDelayMs = params.get("__screenshotScrollDelayMs");

	params.delete("__screenshotScrollY");
	params.delete("__screenshotScrollDelayMs");

	const remainingQuery = params.toString();
	return {
		route: remainingQuery.length > 0 ? `${pathname}?${remainingQuery}` : pathname,
		scrollY,
		scrollDelayMs
	};
}

function ensureXcrunAvailable() {
	const result = spawnSync("xcrun", ["simctl", "help"], { stdio: "ignore" });
	if (result.error || result.status !== 0) {
		throw new Error("xcrun simctl is unavailable. Install Xcode command-line tools and boot an iOS simulator.");
	}
}

function run(command, args) {
	execFileSync(command, args, { stdio: "inherit" });
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
