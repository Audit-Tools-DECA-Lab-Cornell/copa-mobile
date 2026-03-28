const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const PODFILE_PATCH_MARKER = "# Fix Expo pod PROJECT_ROOT capture from external shells/workspaces.";
const POST_INTEGRATE_PATCH_MARKER =
    "# Patch generated Pods Xcode project after CocoaPods integration.";
const POST_INSTALL_CLOSING_MARKER = "\n  end\nend";

/**
 * Returns the Ruby snippet that removes baked-in PROJECT_ROOT values from Expo's
 * generated podspec JSON files and the generated Pods Xcode project.
 *
 * Expo SDK 55 forwards PROJECT_ROOT into EXConstants and EXUpdates build phases.
 * In nested workspaces that can capture the parent folder instead of the app
 * folder, which later breaks iOS builds when Expo cannot find package.json.
 *
 * @returns {string}
 */
function buildRubyPatch() {
    return [
        `    ${PODFILE_PATCH_MARKER}`,
        "    sanitize_project_root_capture = lambda do |content|",
        "      next content if content.nil?",
        "",
        "      content",
        String.raw`        .gsub(/PROJECT_ROOT=.*? \$PODS_TARGET_SRCROOT/, "$PODS_TARGET_SRCROOT")`,
        String.raw`        .gsub(/export PROJECT_ROOT=.*?\\n/, "")`,
        String.raw`        .gsub(/export PROJECT_ROOT=.*?\n/, "")`,
        String.raw`        .gsub('bash -l -c \"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\"', 'bash -l -c \"unset PROJECT_ROOT && $PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\"')`,
        String.raw`        .gsub('bash -l -c \"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\"', 'bash -l -c \"unset PROJECT_ROOT && $PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\"')`,
        String.raw`        .gsub('bash -l -c "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"', 'bash -l -c "unset PROJECT_ROOT && $PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"')`,
        String.raw`        .gsub('bash -l -c "$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh"', 'bash -l -c "unset PROJECT_ROOT && $PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh"')`,
        "    end",
        "",
        "    generated_podspec_files = [",
        '      File.join(__dir__, "Pods", "Local Podspecs", "EXConstants.podspec.json"),',
        '      File.join(__dir__, "Pods", "Local Podspecs", "EXUpdates.podspec.json")',
        "    ]",
        "    generated_podspec_files.each do |generated_podspec_file|",
        "      next unless File.exist?(generated_podspec_file)",
        "",
        "      original_content = File.read(generated_podspec_file)",
        "      patched_content = sanitize_project_root_capture.call(original_content)",
        "",
        "      next if patched_content == original_content",
        "",
        "      File.chmod(0644, generated_podspec_file)",
        "      File.write(generated_podspec_file, patched_content)",
        "    end",
        "",
        "    installer.pods_project.targets.each do |target|",
        '      next unless ["EXConstants", "EXUpdates"].include?(target.name)',
        "",
        "      target.shell_script_build_phases.each do |phase|",
        "        next unless [",
        '          "Generate app.config for prebuilt Constants.manifest",',
        '          "Generate updates resources for expo-updates"',
        "        ].include?(phase.name)",
        "",
        "        phase.shell_script = sanitize_project_root_capture.call(phase.shell_script)",
        "      end",
        "    end",
        "",
        "    installer.pods_project.save",
        "",
        "    # CocoaPods can still serialize stale PROJECT_ROOT values into the",
        "    # generated project.pbxproj, so patch the on-disk file as a fallback.",
        '    generated_pods_project_file = File.join(__dir__, "Pods", "Pods.xcodeproj", "project.pbxproj")',
        "    if File.exist?(generated_pods_project_file)",
        "      original_content = File.read(generated_pods_project_file)",
        "      patched_content = sanitize_project_root_capture.call(original_content)",
        "",
        "      if patched_content != original_content",
        "        File.chmod(0644, generated_pods_project_file)",
        "        File.write(generated_pods_project_file, patched_content)",
        "      end",
        "    end",
    ].join("\n");
}

/**
 * Returns a CocoaPods hook that patches the generated Pods Xcode project after
 * integration has finished writing it to disk.
 *
 * @returns {string}
 */
function buildPostIntegrateHook() {
    return [
        POST_INTEGRATE_PATCH_MARKER,
        "post_integrate do |_installer|",
        '  generated_pods_project_file = File.join(__dir__, "Pods", "Pods.xcodeproj", "project.pbxproj")',
        "  next unless File.exist?(generated_pods_project_file)",
        "",
        "  original_content = File.read(generated_pods_project_file)",
        "  patched_content = original_content",
        String.raw`    .gsub(/PROJECT_ROOT=.*? \$PODS_TARGET_SRCROOT/, "$PODS_TARGET_SRCROOT")`,
        String.raw`    .gsub(/export PROJECT_ROOT=.*?\\n/, "")`,
        String.raw`    .gsub(/export PROJECT_ROOT=.*?\n/, "")`,
        String.raw`    .gsub('bash -l -c \"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\"', 'bash -l -c \"unset PROJECT_ROOT && $PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\"')`,
        String.raw`    .gsub('bash -l -c \"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\"', 'bash -l -c \"unset PROJECT_ROOT && $PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\"')`,
        String.raw`    .gsub('bash -l -c "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"', 'bash -l -c "unset PROJECT_ROOT && $PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"')`,
        String.raw`    .gsub('bash -l -c "$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh"', 'bash -l -c "unset PROJECT_ROOT && $PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh"')`,
        "",
        "  next if patched_content == original_content",
        "",
        "  File.chmod(0644, generated_pods_project_file)",
        "  File.write(generated_pods_project_file, patched_content)",
        "end",
    ].join("\n");
}

/**
 * Injects the Ruby patch into the iOS Podfile exactly once.
 *
 * @param {string} podfileContents
 * @returns {string}
 */
function patchPodfileContents(podfileContents) {
    let patchedPodfileContents = podfileContents;

    if (!patchedPodfileContents.includes(PODFILE_PATCH_MARKER)) {
        const rubyPatch = buildRubyPatch();
        const closingMarkerIndex = patchedPodfileContents.lastIndexOf(POST_INSTALL_CLOSING_MARKER);

        if (closingMarkerIndex === -1) {
            throw new Error("Unable to insert the Expo PROJECT_ROOT fix into ios/Podfile.");
        }

        patchedPodfileContents = [
            patchedPodfileContents.slice(0, closingMarkerIndex),
            rubyPatch,
            patchedPodfileContents.slice(closingMarkerIndex),
        ].join("\n");
    }

    if (!patchedPodfileContents.includes(POST_INTEGRATE_PATCH_MARKER)) {
        patchedPodfileContents = `${patchedPodfileContents.trimEnd()}\n\n${buildPostIntegrateHook()}\n`;
    }

    return patchedPodfileContents;
}

/**
 * Expo config plugin that keeps generated iOS pod scripts rooted to the app
 * directory instead of an external parent workspace.
 *
 * @param {import("@expo/config-types").ExpoConfig} config
 * @returns {import("@expo/config-types").ExpoConfig}
 */
function withExpoProjectRootFix(config) {
    return withDangerousMod(config, [
        "ios",
        async (modConfig) => {
            const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");

            if (!fs.existsSync(podfilePath)) {
                return modConfig;
            }

            const originalPodfileContents = fs.readFileSync(podfilePath, "utf8");
            const patchedPodfileContents = patchPodfileContents(originalPodfileContents);

            if (patchedPodfileContents !== originalPodfileContents) {
                fs.writeFileSync(podfilePath, patchedPodfileContents);
            }

            return modConfig;
        },
    ]);
}

module.exports = withExpoProjectRootFix;
