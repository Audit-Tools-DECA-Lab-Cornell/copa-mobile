# Mobile Maestro E2E flows

These flows cover the auditor-only native app path. They assume a development build is installed on a simulator/emulator and points at the same backend seeded by `testing/scripts/seed-e2e-data.sh`.

## Run

```bash
cd copa-mobile
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 bun run dev
bun run test:e2e:maestro:smoke
```

The default app id is Android (`com.pratyush.sudhakar.audittoolsplayspacemobile`). For iOS simulator runs, pass Maestro's app id override or copy the flows with `com.pratyush.sudhakar.audit-tools-playspace-mobile`.

`custom-option-answers.yaml` covers answers an admin adds to an ordinary scale: each one must be
its own answer, so choosing one never marks the others and the choice survives a restart offline.
Its assertions are required, not optional - run it against a seeded instrument whose first question
offers No / Some / A lot on Provision.

The `complete-audit.yaml` file is intentionally a scaffold until every audit section control has stable accessibility labels; smoke CI should use login, dashboard, assigned-place, resume, and report visibility flows first.
