const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const PODFILE_PATCH_MARKER = "# Fix Expo pod PROJECT_ROOT capture from external shells/workspaces.";
const POST_INSTALL_CLOSING_MARKER = "\n  end\nend";

/**
 * Returns the Ruby snippet that removes baked-in PROJECT_ROOT values from Expo's
 * generated podspec JSON files and the Pods Xcode project.
 *
 * Those generated files should let Expo resolve the project root from the Pods
 * directory. If a parent workspace path gets injected during `pod install`,
 * Xcode later looks for `package.json` in the wrong folder and the build fails.
 *
 * @returns {string}
 */
function buildRubyPatch() {
    return [
        `    ${PODFILE_PATCH_MARKER}`,
        "    generated_podspec_files = [",
        '      File.join(__dir__, "Pods", "Local Podspecs", "EXConstants.podspec.json"),',
        '      File.join(__dir__, "Pods", "Local Podspecs", "EXUpdates.podspec.json")',
        "    ]",
        "    generated_podspec_files.each do |generated_podspec_file|",
        "      next unless File.exist?(generated_podspec_file)",
        "",
        "      original_content = File.read(generated_podspec_file)",
        "      patched_content = original_content",
        '        .gsub(/PROJECT_ROOT=.*? \\$PODS_TARGET_SRCROOT/, "$PODS_TARGET_SRCROOT")',
        '        .gsub(/export PROJECT_ROOT=.*?\\\\n/, "")',
        '        .gsub(/export PROJECT_ROOT=.*?\\n/, "")',
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
        "        phase.shell_script = phase.shell_script",
        '          .gsub(/PROJECT_ROOT=.*? \\$PODS_TARGET_SRCROOT/, "$PODS_TARGET_SRCROOT")',
        '          .gsub(/export PROJECT_ROOT=.*?\\\\n/, "")',
        '          .gsub(/export PROJECT_ROOT=.*?\\n/, "")',
        "    end",
        "      end",
        "    end",
    ].join("\n");
}

/**
 * Injects the Ruby patch into the iOS Podfile exactly once.
 *
 * @param {string} podfileContents
 * @returns {string}
 */
function patchPodfileContents(podfileContents) {
    if (podfileContents.includes(PODFILE_PATCH_MARKER)) {
        return podfileContents;
    }

    const rubyPatch = buildRubyPatch();
    const closingMarkerIndex = podfileContents.lastIndexOf(POST_INSTALL_CLOSING_MARKER);

    if (closingMarkerIndex === -1) {
        throw new Error("Unable to insert the Expo PROJECT_ROOT fix into ios/Podfile.");
    }

    return [
        podfileContents.slice(0, closingMarkerIndex),
        rubyPatch,
        podfileContents.slice(closingMarkerIndex),
    ].join("\n");
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
