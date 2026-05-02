# Mobile Maestro E2E flows

These flows cover the auditor-only native app path. They assume a development build is installed on a simulator/emulator and points at the same backend seeded by `testing/scripts/seed-e2e-data.sh`.

## Run

```bash
cd audit-tools-playspace-mobile
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 bun run dev
bun run test:e2e:maestro:smoke
```

The default app id is Android (`com.pratyush.sudhakar.audittoolsplayspacemobile`). For iOS simulator runs, pass Maestro's app id override or copy the flows with `com.pratyush.sudhakar.audit-tools-playspace-mobile`.

The `complete-audit.yaml` file is intentionally a scaffold until every audit section control has stable accessibility labels; smoke CI should use login, dashboard, assigned-place, resume, and report visibility flows first.
