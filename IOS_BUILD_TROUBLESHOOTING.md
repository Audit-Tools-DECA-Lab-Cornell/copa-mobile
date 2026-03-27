# iOS Build Troubleshooting

This note captures the native iOS build fixes that were required to get local simulator builds passing for this app on macOS Sequoia with Xcode 26.4, Expo SDK 55, and React Native 0.83.2.

## Failure Signatures

- `Error: Unable to locate project (no package.json found) at path: /Users/praty/Desktop/StudentJob/playspace`
- `fatal error: module map file '.../Pods/Headers/Public/EXDevLauncher/expo-dev-launcher.modulemap' not found`
- `fmt/format-inl.h ... call to consteval function ... is not a constant expression`

## Root Causes

- Expo CocoaPods script phases inherited a parent-shell `PROJECT_ROOT`, so `expo-constants` and `expo-updates` resolved the workspace parent instead of the app root.
- `expo-dev-launcher` generated module artifacts under `Pods/Target Support Files/expo-dev-launcher/`, but Xcode expected matching public headers and modulemap files under `Pods/Headers/Public/EXDevLauncher/`.
- `fmt` 11 left `FMT_USE_CONSTEVAL` enabled under Xcode 26.4, which caused native compilation to fail.

## Fixes Stored In This Repo

- `plugins/withExpoProjectRootFix.js` and `ios/Podfile` sanitize generated CocoaPods podspecs and build phases so the Expo scripts no longer use the wrong `PROJECT_ROOT`.
- The generated `EXConstants` and `EXUpdates` phases are forced to run as `unset PROJECT_ROOT && ...` to prevent parent-shell leakage during `bash -l`.
- `ios/Podfile` includes a `post_integrate` fallback that rewrites the generated `Pods.xcodeproj` if CocoaPods reintroduces the stale `PROJECT_ROOT`.
- `ios/Podfile` also materializes the missing `expo-dev-launcher` public headers and module artifacts into `Pods/Headers/Public/EXDevLauncher/`.
- `plugins/withFmtFix.js` and `ios/Podfile` force `FMT_USE_CONSTEVAL 0` in the generated `fmt/base.h`.

## Recovery Steps If The Issue Returns

1. Run `cd ios && pod install`.
2. Verify the `EXConstants` and `EXUpdates` script phases contain `unset PROJECT_ROOT &&`.
3. Verify `Pods/Headers/Public/EXDevLauncher/expo-dev-launcher.modulemap` exists.
4. Verify `Pods/fmt/include/fmt/base.h` has no active `FMT_USE_CONSTEVAL 1` branches.
5. Rebuild with:

```bash
xcodebuild -workspace "PlayspaceAuditTool.xcworkspace" -scheme "PlayspaceAuditTool" -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,id=F4594418-B3F5-44B6-BF01-9F27223CA36B" build
```

## Verification

The fixes above were verified with the `xcodebuild` command above, which completed successfully with exit code `0`.

## Follow-Up

- If `ios/` is regenerated from scratch, keep the custom plugins in `app.json` and re-run `pod install`.
- The `Podfile` fallbacks are currently the source of truth for the `expo-dev-launcher` header materialization and the late `fmt` patch. If those need to survive future Expo prebuilds more cleanly, move them into config plugins as well.
