# iOS Build Troubleshooting

This note captures the native iOS build and launch fixes that were required to get local simulator builds and physical iPhone runs passing for this app on macOS Sequoia with Xcode 26.4, Expo SDK 55, and React Native 0.83.2.

## Failure Signatures

- `Error: Unable to locate project (no package.json found) at path: /Users/praty/Desktop/StudentJob/playspace`
- `fatal error: module map file '.../Pods/Headers/Public/EXDevLauncher/expo-dev-launcher.modulemap' not found`
- `fmt/format-inl.h ... call to consteval function ... is not a constant expression`
- `Provisioning profile "iOS Team Provisioning Profile: com.pratyush.sudhakar.audit-tools-playspace-mobile" doesn't include the currently selected device "Pratyush’s iPhone"`
- `Failed to load provisioning paramter list due to error: Error Domain=com.apple.dt.CoreDeviceError Code=1002 "No provider was found."`
- `Unable to launch com.pratyush.sudhakar.audit-tools-playspace-mobile because it has an invalid code signature, inadequate entitlements or its profile has not been explicitly trusted by the user`

## Root Causes

- Expo CocoaPods script phases inherited a parent-shell `PROJECT_ROOT`, so `expo-constants` and `expo-updates` resolved the workspace parent instead of the app root.
- `expo-dev-launcher` generated module artifacts under `Pods/Target Support Files/expo-dev-launcher/`, but Xcode expected matching public headers and modulemap files under `Pods/Headers/Public/EXDevLauncher/`.
- `fmt` 11 left `FMT_USE_CONSTEVAL` enabled under Xcode 26.4, which caused native compilation to fail.
- The Apple development provisioning profile for `com.pratyush.sudhakar.audit-tools-playspace-mobile` did not include the connected iPhone yet, so device builds failed before compilation finished.
- After the app was built and installed, iOS still blocked launch until the device trusted the developer profile and had Developer Mode enabled. The `devicectl` "No provider was found" line was a side-effect during launch, not the primary root cause.

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

## Physical Device Recovery Steps

1. Refresh provisioning for the connected iPhone with:

```bash
xcodebuild -workspace "ios/PlayspaceAuditTool.xcworkspace" -configuration Debug -scheme "PlayspaceAuditTool" -destination id=00008130-00010D2E1A08001C DEVELOPMENT_TEAM=ZD947U862S -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
```

2. Re-run the normal Expo device flow:

```bash
bun ios --device 00008130-00010D2E1A08001C
```

3. If the build now succeeds but launch fails with a trust or security error, enable `Settings > Privacy & Security > Developer Mode` on the iPhone and complete the required restart.
4. If iOS still blocks launch, open `Settings > General > VPN & Device Management` and trust the developer profile for the app.
5. Launch the installed app again from the Home Screen or rerun `bun ios --device 00008130-00010D2E1A08001C`.

## Verification

The simulator fixes above were verified with the `xcodebuild` command above, which completed successfully with exit code `0`.

The physical-device fix was verified in two stages:

- A direct `xcodebuild` run against `Pratyush’s iPhone` with `-allowProvisioningUpdates` and `-allowProvisioningDeviceRegistration` completed successfully with exit code `0`.
- A follow-up `bun ios --device 00008130-00010D2E1A08001C` reached `Build Succeeded`, installed the app on the phone, and only required the remaining on-device trust and Developer Mode steps before launch.

## Follow-Up

- If `ios/` is regenerated from scratch, keep the custom plugins in `app.json` and re-run `pod install`.
- The `Podfile` fallbacks are currently the source of truth for the `expo-dev-launcher` header materialization and the late `fmt` patch. If those need to survive future Expo prebuilds more cleanly, move them into config plugins as well.
- The app target does not currently hardcode a `PROVISIONING_PROFILE_SPECIFIER`, so future physical-device failures of this type should be treated as Apple signing or device-trust issues before changing repo code.
