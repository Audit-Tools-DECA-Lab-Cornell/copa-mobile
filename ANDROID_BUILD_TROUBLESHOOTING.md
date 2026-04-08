# Debugging Android Builds in Production/Testing

## Bugs encountered and fixes applied

### 1. Aab/apk bundle crashing on launch on emulator/physical device

Root cause: Hermes engine mismatch between build and runtime

Fix:

1. Set `jsEngine` to `hermes` in `app.config.js`

```json
{
    "expo": {
        "jsEngine": "hermes"
    }
}
```

2. Remove `buildReactNativeFromSource` from `app.config.js`. It is not required for hermes engine.
3. Remove `resolutions` from `package.json`. It causes the mismatch between build and runtime.

### 2. All pages except the home and the settings page are blank in the app with error message: "Missing theme"

Root cause: The conditional export of `themes` in `./themes.ts` is preventing export in production builds. The conditional export is only meant for web deployment, not mobile.

Fix:

1. Remove the conditional export of `themes` in `./themes.ts`.

```typescript
export const themes = builtThemes;
```

2. Set `disableExtraction` to `true` in `babel.config.js`.

```markdown
{
"plugins": [
[
"@tamagui/babel-plugin",
{
"components": ["tamagui"],
"config": "./tamagui.config.ts",
"disableExtraction": ~~process.env.NODE_ENV === "production"~~ true
}
]
]
}
```

Then rebuild the app with the eas production build command.

```bash
eas build --platform android --profile production
```

### 3. Google Maps API key is not working in the app

Root cause: The Google Maps API key restrictions do not include the SHA-5 fingerprint of the app.

Fix: Add the SHA-5 fingerprint of the app to the Google Maps API key restrictions in the Google Cloud Console.
