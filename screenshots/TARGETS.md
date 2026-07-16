# Screenshot targets

This file documents the trimmed screenshot target lists used by `scripts/capture-screenshots.mjs` (driven by `bun run screenshots:ios` / `bun run screenshots:android`).

The tables below are organized by phone vs tablet layout. The `android-phone` device type uses the **iPhone** target list and `android-tablet` uses the **iPad** target list (same routes, scroll offsets, and filenames), so only two tables are maintained.

Routes with `<placeId>`, `<projectId>`, and `<auditId>` are resolved at runtime from the screenshot account's assigned places and submitted audits. `Scroll Y` means the value passed through `__screenshotScrollY`.

## Fresh capture note

After this renumbering, treat the existing PNGs under these folders as stale unless the exact filename appears in the tables below:

- `screenshots/iphone/light/` and `screenshots/iphone/dark/`
- `screenshots/ipad/light/` and `screenshots/ipad/dark/`
- `screenshots/android-phone/light/` and `screenshots/android-phone/dark/`
- `screenshots/android-tablet/light/` and `screenshots/android-tablet/dark/`

Safest cleanup before the next run:

```bash
# iOS (booted simulators)
find screenshots/iphone screenshots/ipad -type f -name '*.png' -delete
bun run screenshots:ios -- --email "$SCREENSHOT_EMAIL" --password "$SCREENSHOT_PASSWORD"

# Android (connected devices, USB debugging enabled)
find screenshots/android-phone screenshots/android-tablet -type f -name '*.png' -delete
bun run screenshots:android -- --email "$SCREENSHOT_EMAIL" --password "$SCREENSHOT_PASSWORD"
```

The report-detail tail offsets are first-pass values. After the fresh capture run, check the near-end/end frames and tune the values in `REPORT_DETAIL_SCROLLS` if either frame is still too similar or misses the report footer.

## iPhone targets

| File                               | Route                                                           | Scroll Y | Notes                                                                                              | Fresh capture? |
| ---------------------------------- | --------------------------------------------------------------- | -------: | -------------------------------------------------------------------------------------------------- | -------------- |
| `01-login.png`                     | `/(auth)/login`                                                 |        - | Public login screen.                                                                               | Yes            |
| `02-signup.png`                    | `/(auth)/signup`                                                |        - | Public signup screen.                                                                              | Yes            |
| `03-home.png`                      | `/`                                                             |        - | Home top.                                                                                          | Yes            |
| `04-home-queue.png`                | `/`                                                             |      780 | Home queue scroll retained for iPhone.                                                             | Yes            |
| `05-places.png`                    | `/places`                                                       |        - | Places list top.                                                                                   | Yes            |
| `06-place-detail.png`              | `/place/<placeId>?projectId=<projectId>`                        |        - | Place detail.                                                                                      | Yes            |
| `07-execute.png`                   | `/execute`                                                      |        - | Execute list top.                                                                                  | Yes            |
| `08-execute-place.png`             | `/execute/<placeId>?projectId=<projectId>`                      |      170 | Replaces old 08/09/10 with one merged execute-place frame at roughly 1/4 of old 09's 680px scroll. | Yes            |
| `09-execute-pre-audit.png`         | `/execute/<placeId>/pre-audit?projectId=<projectId>`            |        - | Pre-audit top only; old 12/13 removed.                                                             | Yes            |
| `10-execute-section.png`           | `/execute/<placeId>/section/<sectionKey>?projectId=<projectId>` |        - | Execute section top retained.                                                                      | Yes            |
| `11-execute-section-questions.png` | `/execute/<placeId>/section/<sectionKey>?projectId=<projectId>` |      780 | Execute section questions retained.                                                                | Yes            |
| `12-execute-section-notes.png`     | `/execute/<placeId>/section/<sectionKey>?projectId=<projectId>` |     4000 | Execute section notes retained.                                                                    | Yes            |
| `13-reports.png`                   | `/reports`                                                      |        - | Reports list top; old report list/preview scrolls removed.                                         | Yes            |
| `14-report-detail-top.png`         | `/report/<auditId>`                                             |        - | Report detail top.                                                                                 | Yes            |
| `15-report-detail-early.png`       | `/report/<auditId>`                                             |      600 | Second report frame; slightly less scroll than old 700px shot.                                     | Yes            |
| `16-report-detail-near-end.png`    | `/report/<auditId>`                                             |     2600 | Near-end report frame; tune after capture if needed.                                               | Yes            |
| `17-report-detail-end.png`         | `/report/<auditId>`                                             |     3600 | End report frame; tune after capture if needed.                                                    | Yes            |
| `18-settings.png`                  | `/settings`                                                     |        - | Settings top, renumbered from old 21.                                                              | Yes            |
| `19-settings-scrolled.png`         | `/settings`                                                     |      950 | One settings scroll frame with a larger offset than old 22's 700px; old 23 removed.                | Yes            |
| `21-execute-overview.png`          | `/execute/<placeId>/overview?projectId=<projectId>`             |        - | Execute section overview (added for the overhaul recapture).                                       | Yes            |
| `22-execute-space-audit.png`       | `/execute/<placeId>/space-audit?projectId=<projectId>`          |        - | Execute space-audit setup (added).                                                                 | Yes            |
| `23-execute-final-comments.png`    | `/execute/<placeId>/final-comments?projectId=<projectId>`       |        - | Execute final comments (added).                                                                    | Yes            |

## iPad targets

| File                            | Route                                                           | Scroll Y | Notes                                                                                  | Fresh capture? |
| ------------------------------- | --------------------------------------------------------------- | -------: | -------------------------------------------------------------------------------------- | -------------- |
| `01-login.png`                  | `/(auth)/login`                                                 |        - | Public login screen.                                                                   | Yes            |
| `02-signup.png`                 | `/(auth)/signup`                                                |        - | Public signup screen.                                                                  | Yes            |
| `03-home.png`                   | `/`                                                             |        - | Home top; old 04 home queue removed because iPad fits it in the top frame.             | Yes            |
| `04-places.png`                 | `/places`                                                       |        - | Places list top, renumbered from old 05.                                               | Yes            |
| `05-place-detail.png`           | `/place/<placeId>?projectId=<projectId>`                        |        - | Place detail, renumbered from old 06.                                                  | Yes            |
| `06-execute.png`                | `/execute`                                                      |        - | Execute list top, renumbered from old 07.                                              | Yes            |
| `07-execute-place.png`          | `/execute/<placeId>?projectId=<projectId>`                      |        - | Execute place top only; old 09/10 removed.                                             | Yes            |
| `08-execute-pre-audit.png`      | `/execute/<placeId>/pre-audit?projectId=<projectId>`            |      360 | Single pre-audit frame with slight scroll to merge old 11/12 coverage; old 13 removed. | Yes            |
| `09-execute-section-notes.png`  | `/execute/<placeId>/section/<sectionKey>?projectId=<projectId>` |     4000 | Execute section notes only; old section top/questions removed.                         | Yes            |
| `10-reports.png`                | `/reports`                                                      |        - | Reports list top; old 18/19 removed.                                                   | Yes            |
| `11-report-detail-top.png`      | `/report/<auditId>`                                             |        - | Report detail top.                                                                     | Yes            |
| `12-report-detail-early.png`    | `/report/<auditId>`                                             |      600 | Second report frame; slightly less scroll than old 700px shot.                         | Yes            |
| `13-report-detail-near-end.png` | `/report/<auditId>`                                             |     2200 | Near-end report frame; tune after capture if needed.                                   | Yes            |
| `14-report-detail-end.png`      | `/report/<auditId>`                                             |     3200 | End report frame; tune after capture if needed.                                        | Yes            |
| `15-settings.png`               | `/settings`                                                     |        - | Settings top, renumbered from old 21.                                                  | Yes            |
| `16-settings-about.png`         | `/settings`                                                     |     1250 | Settings about retained from old 23; old preferences 22 removed.                       | Yes            |
| `17-execute-overview.png`       | `/execute/<placeId>/overview?projectId=<projectId>`             |        - | Execute section overview (added for the overhaul recapture).                           | Yes            |
| `18-execute-space-audit.png`    | `/execute/<placeId>/space-audit?projectId=<projectId>`          |        - | Execute space-audit setup (added).                                                     | Yes            |
| `19-execute-final-comments.png` | `/execute/<placeId>/final-comments?projectId=<projectId>`       |        - | Execute final comments (added).                                                        | Yes            |

## Warm-up ordering

The execute-place target intentionally runs **before** the section deep-link
targets so `ensurePlaceAudit` resolves during the earlier navigation; the first
section target additionally carries `extraWaitMs: 4000` in the script. Per the
approved overhaul scope, recapture **all sets except iPhone** (iPhone recapture
is deferred).

## Removed old targets

### iPhone

Old `09-execute-place-sections.png`, `10-execute-place-footer.png`, `12-execute-pre-audit-questions.png`, `13-execute-pre-audit-footer.png`, `18-reports-list.png`, `19-reports-preview.png`, and `23-settings-about.png` are removed. Old `20-report-detail.png` is replaced by four unique report-detail files.

### iPad

Old `04-home-queue.png`, `09-execute-place-sections.png`, `10-execute-place-footer.png`, `12-execute-pre-audit-questions.png`, `13-execute-pre-audit-footer.png`, `14-execute-section.png`, `15-execute-section-questions.png`, `18-reports-list.png`, `19-reports-preview.png`, and `22-settings-preferences.png` are removed. Old `20-report-detail.png` is replaced by four unique report-detail files.
