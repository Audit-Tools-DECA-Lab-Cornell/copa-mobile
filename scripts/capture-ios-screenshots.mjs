#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFileSync, rmSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULT_SCHEME = "copa-mobile";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_WAIT_MS = 20000;
const DEFAULT_LOGIN_WAIT_MS = 20000;
const DEFAULT_SCROLL_DELAY_MS = 450;
const DEFAULT_SIMULATOR = "booted";
const FIRST_SECTION_FALLBACK = "section_1_playspace_character_community";

const TARGET_DEVICE_TYPES = ["iphone", "ipad"];

// Device-specific scroll positions. These are intentionally not shared because
// iPhone and iPad layouts expose different amounts of content at rest.
const IPHONE_EXECUTE_PLACE_SCROLL_Y = 170;
const IPHONE_SETTINGS_SCROLL_Y = 950;
const IPAD_PRE_AUDIT_SCROLL_Y = 250;

// Report detail is long on both devices. The early frame is slightly above the
// old 700px shot to avoid repeated content; tail frames are first-pass values
// and should be tuned after a fresh capture run if the report content changes.
const REPORT_DETAIL_SCROLLS = {
	iphone: { early: 950, nearEnd: 20500, end: 22000 },
	ipad: { early: 850, end: 19000 }
};

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

	if (options.list) {
		const deviceTypes = options.device !== null ? [options.device] : TARGET_DEVICE_TYPES;
		for (const deviceType of deviceTypes) {
			const targets = selectTargets(buildTargets(discovery, sectionKey, deviceType), options.target);
			printTargetList(deviceType, targets);
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
			const targets = selectTargets(buildTargets(discovery, sectionKey, simulator.deviceType), options.target);
			if (targets.length === 0) {
				console.warn(`No targets matched --target "${options.target}" for ${simulator.deviceType}; skipping.`);
				continue;
			}
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

function printTargetList(deviceType, targets) {
	console.log(`\n# ${deviceType}`);
	if (targets.length === 0) {
		console.log("No targets matched.");
		return;
	}
	for (const target of targets) {
		const access = target.skipLogin ? "public" : "protected";
		const route = target.route.length > 0 ? target.route : "(unresolved dynamic route)";
		console.log(`${target.file}	${route}	${access}`);
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

	// Reset and login happens at most once per run - on the first protected
	// target - so all subsequent screens reuse the cached session and do not
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
			captureIOSScreenshot(simulator.udid, outputPath);

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

function buildTargets(discovery, sectionKey, deviceType) {
	if (deviceType === "iphone") {
		return buildIphoneTargets(discovery, sectionKey);
	}
	if (deviceType === "ipad") {
		return buildIpadTargets(discovery, sectionKey);
	}
	throw new Error(`Unknown device type: ${deviceType}`);
}

function buildIphoneTargets(discovery, sectionKey) {
	const routes = buildDynamicRoutes(discovery, sectionKey);
	const targets = [
		// publicTarget("01-login.png", "/(auth)/login", "Login screen"),
		// publicTarget("02-signup.png", "/(auth)/signup", "Signup screen"),
		protectedTarget("03-home.png", "/", "Home top"),
		protectedTarget("04-home-queue.png", withScreenshotScroll("/", 780), "Home queue scroll"),
		protectedTarget("05-places.png", "/places", "Places list top"),
		dynamicPlaceTarget("06-place-detail.png", routes.placeDetail, "Place detail"),
		protectedTarget("07-execute.png", "/execute", "Execute list top"),
		dynamicPlaceTarget(
			"08-execute-place.png",
			withScreenshotScroll(routes.executePlace, IPHONE_EXECUTE_PLACE_SCROLL_Y),
			"Execute place merged frame; replaces old 08/09/10 using roughly one-quarter of old 09 scroll"
		),
		dynamicPlaceTarget("09-execute-pre-audit.png", routes.preAudit, "Pre-audit top only; old scrolled variants removed"),
		dynamicPlaceTarget("10-execute-section.png", routes.section, "Execute section top"),
		dynamicPlaceTarget(
			"11-execute-section-questions.png",
			withScreenshotScroll(routes.section, 780),
			"Execute section questions"
		),
		dynamicPlaceTarget(
			"12-execute-section-notes.png",
			withScreenshotScroll(routes.section, 4000),
			"Execute section notes"
		),
		protectedTarget("13-reports.png", "/reports", "Reports list top; old list/preview scrolls removed"),
		protectedTarget("14-reports-list.png", withScreenshotScroll("/reports", 700), "Reports list"),
		...buildReportDetailTargets("iphone", "15", routes.reportDetail),
		protectedTarget("19-settings.png", "/settings", "Settings top"),
		protectedTarget(
			"20-settings-scrolled.png",
			withScreenshotScroll("/settings", IPHONE_SETTINGS_SCROLL_Y),
			"Settings scrolled frame"
		)
	];
	return assertUniqueTargetFiles("iphone", targets);
}

function buildIpadTargets(discovery, sectionKey) {
	const routes = buildDynamicRoutes(discovery, sectionKey);
	const targets = [
		// publicTarget("01-login.png", "/(auth)/login", "Login screen"),
		// publicTarget("02-signup.png", "/(auth)/signup", "Signup screen"),
		protectedTarget("03-home.png", "/", "Home top; old home queue removed because iPad top frame fits it"),
		protectedTarget("04-places.png", "/places", "Places list top"),
		dynamicPlaceTarget("05-place-detail.png", routes.placeDetail, "Place detail"),
		protectedTarget("06-execute.png", "/execute", "Execute list top"),
		dynamicPlaceTarget("07-execute-place.png", routes.executePlace, "Execute place top; old section/footer scrolls removed"),
		dynamicPlaceTarget(
			"08-execute-pre-audit.png",
			withScreenshotScroll(routes.preAudit, IPAD_PRE_AUDIT_SCROLL_Y),
			"Single pre-audit frame with slight scroll to merge old top/questions coverage"
		),
		dynamicPlaceTarget("09-execute-section.png", routes.section, "Execute section top"),
		dynamicPlaceTarget(
			"10-execute-section-notes.png",
			withScreenshotScroll(routes.section, 4000),
			"Execute section notes only"
		),
		protectedTarget("11-reports.png", "/reports", "Reports list top; old list/preview scrolls removed"),
		...buildReportDetailTargets("ipad", "12", routes.reportDetail),
		protectedTarget("15-settings.png", "/settings", "Settings top"),
		protectedTarget("16-settings-about.png", withScreenshotScroll("/settings", 1250), "Settings about; old preferences shot removed")
	];
	return assertUniqueTargetFiles("ipad", targets);
}

function buildDynamicRoutes(discovery, sectionKey) {
	const place = discovery.firstPlace;
	const reportPlace = discovery.reportPlace;
	const routes = {
		placeDetail: null,
		executePlace: null,
		preAudit: null,
		section: null,
		reportDetail: null
	};

	if (isResolvedPlace(place)) {
		routes.placeDetail = `/place/${encodeURIComponent(place.place_id)}?projectId=${encodeURIComponent(place.project_id)}`;
		routes.executePlace = `/execute/${encodeURIComponent(place.place_id)}?projectId=${encodeURIComponent(place.project_id)}`;
		routes.preAudit = `/execute/${encodeURIComponent(place.place_id)}/pre-audit?projectId=${encodeURIComponent(place.project_id)}`;
		routes.section = `/execute/${encodeURIComponent(place.place_id)}/section/${encodeURIComponent(sectionKey)}?projectId=${encodeURIComponent(place.project_id)}`;
	}

	if (isResolvedReportPlace(reportPlace)) {
		routes.reportDetail = `/report/${encodeURIComponent(reportPlace.audit_id)}`;
	}

	return routes;
}

function buildReportDetailTargets(deviceType, startNumber, reportRoute) {
	const base = Number(startNumber);
	const scrolls = REPORT_DETAIL_SCROLLS[deviceType];
	let targets = [
		dynamicReportTarget(`${pad2(base)}-report-detail-top.png`, reportRoute, "Report detail top"),
		dynamicReportTarget(
			`${pad2(base + 1)}-report-detail-early.png`,
			withScreenshotScroll(reportRoute, scrolls.early),
			"Report detail early scroll; slightly less than old 700px shot"
		),

	];
	if (deviceType === "iphone") {
		targets.push(dynamicReportTarget(
			`${pad2(base + 2)}-report-detail-near-end.png`,
			withScreenshotScroll(reportRoute, scrolls.nearEnd),
			"Report detail near-end frame; tune after capture if needed"
		));
		targets.push(dynamicReportTarget(
			`${pad2(base + 3)}-report-detail-end.png`,
			withScreenshotScroll(reportRoute, scrolls.end),
			"Report detail end frame; tune after capture if needed"
		));
	}
	else {
		targets.push(dynamicReportTarget(
			`${pad2(base + 2)}-report-detail-end.png`,
			withScreenshotScroll(reportRoute, scrolls.end),
			"Report detail end frame; tune after capture if needed"
		));
	}
	return targets;
}

function publicTarget(file, route, note) {
	return { file, route, skipLogin: true, note };
}

function protectedTarget(file, route, note) {
	return { file, route, requiresAuth: true, note };
}

function dynamicPlaceTarget(file, route, note) {
	return route === null
		? unresolved(file, "No assigned place was returned by the assigned places API.", note)
		: protectedTarget(file, route, note);
}

function dynamicReportTarget(file, route, note) {
	return route === null
		? unresolved(file, "No submitted audit with audit_id was returned by the assigned places API.", note)
		: protectedTarget(file, route, note);
}

function unresolved(file, reason = "No assigned place was returned by the assigned places API.", note = "") {
	return { file, route: "", requiresAuth: true, skipReason: reason, note };
}

function withScreenshotScroll(route, scrollY, scrollDelayMs = null) {
	if (route === null) {
		return null;
	}
	const delimiter = route.includes("?") ? "&" : "?";
	let nextRoute = `${route}${delimiter}__screenshotScrollY=${encodeURIComponent(String(scrollY))}`;
	if (scrollDelayMs !== null) {
		nextRoute += `&__screenshotScrollDelayMs=${encodeURIComponent(String(scrollDelayMs))}`;
	}
	return nextRoute;
}

function pad2(value) {
	return String(value).padStart(2, "0");
}

function assertUniqueTargetFiles(deviceType, targets) {
	const seen = new Set();
	for (const target of targets) {
		if (seen.has(target.file)) {
			throw new Error(`Duplicate screenshot target filename for ${deviceType}: ${target.file}`);
		}
		seen.add(target.file);
	}
	return targets;
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

/**
 * Capture an iOS simulator screenshot to the target path.
 * CoreSimulator cannot write to TCC-protected folders like ~/Desktop,
 * ~/Documents, or ~/Downloads, so we capture to temp first and then copy
 * the file into place with Node.
 * @param {string} udid Simulator UDID.
 * @param {string} outputPath Final PNG path.
 */
function captureIOSScreenshot(udid, outputPath) {
	const tempPath = path.join(os.tmpdir(), `copa-screenshot-${randomUUID()}.png`);
	try {
		run("xcrun", ["simctl", "io", udid, "screenshot", tempPath]);
		copyFileSync(tempPath, outputPath);
	} finally {
		rmSync(tempPath, { force: true });
	}
}

function run(command, args) {
	execFileSync(command, args, { stdio: "inherit" });
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
