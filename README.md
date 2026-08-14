# Nira Log Book

Nira Log Book is a static browser app for activity and cash logging. It stores records locally in the browser and can sync them two-way with a Google Sheet through Google Apps Script.

## Features

- Google login/logout with Google Identity Services.
- Local-first log storage in `localStorage`.
- Optional two-way Google Sheets sync through an Apps Script Web App URL.
- Authorized-user allowlist in Apps Script through `ALLOWED_EMAILS`.
- Header-driven sheet columns so the sheet does not depend on fixed column positions.
- Soft deletes through the `Deleted` column.
- Dashboard totals for a selected date.
- Daily Trends tab with seven-day charts.

## Google Login

Create a Google OAuth Web Client ID and configure it in `js/app.js`. Add your GitHub Pages origin as an authorized JavaScript origin, for example `https://USERNAME.github.io`. Do not include the repository path, and never place a client secret in GitHub Pages code.

## Apps Script Authorization

In Apps Script -> Project Settings -> Script Properties, add:

`ALLOWED_EMAILS` = `your@gmail.com,another@gmail.com`

Only listed Google accounts can sync with the sheet. Replace the old `Code.gs` with `google-app-script/Code.gs`, then redeploy the Web App as Execute as Me / Who has access Anyone. Keep the `/exec` URL in the app sync settings.

Note: the current backend authorization checks the email sent by the frontend. Server-side Google ID token verification should be added before treating this as a strong security boundary.

## Two-Way Sync

Browser local data and pending changes are sent to Apps Script. Apps Script returns the current sheet records. `Updated At` decides which version wins when the same record exists locally and in the sheet.

## Extensible Columns

The sheet remains header-driven. Add headers such as Amount, Customer, Distributor, Product, Quantity, Payment Mode, Location, or Remarks. Future named app fields can map to these headers without depending on column position.

## Manual Test Checklist

Use this checklist after frontend or sync changes:

1. Load `index.html` or the GitHub Pages deployment and confirm the login card renders without console errors.
2. Sign in with an allowed Google account and confirm the main app appears.
3. Add a regular Log entry and confirm it appears in the table.
4. Add Cashin and Cashout entries with amounts and confirm the dashboard totals update for the selected date.
5. Edit a log before syncing and confirm the queued version reflects the latest edit.
6. Delete a log and confirm it disappears from the table but remains eligible for soft-delete sync.
7. Search the Logs table and confirm historical entries are included.
8. Switch to Daily Trends and confirm all four charts render.
9. Configure the Apps Script Web App URL, click Sync Now, and confirm the sheet receives records.
10. Reload the page and confirm locally stored records and auth state behave as expected.

## Build Notes

### Build 5.6

- Rebuilt `app.js` cleanly instead of layering another patch over previous builds.
- Fixed log-table rendering and dashboard rendering paths.
- Added defensive localStorage/date parsing.
- Logs table always displays all non-deleted logs.
- Dashboard totals use only the selected dashboard date.
- Added cache-busting query strings (`?v=5.6`) to prevent GitHub Pages/browser cache from serving an older JavaScript file.
- Preserved Google Login, Sheets sync, amounts, usernames, trends, and button feedback.

### Maintenance Cleanup

- Reformatted storage, auth, and Sheets sync modules for maintainability.
- Updated the sync queue so later edits replace earlier queued records with the same ID.
- Removed duplicated CSS hotfix blocks.
- Replaced corrupted display text with ASCII-safe UI strings.
- Added this manual test checklist.
