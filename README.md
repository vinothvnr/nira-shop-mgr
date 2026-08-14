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
- Current outstanding ticket count on the dashboard.
- Outstanding Tickets page with a Jira-like workflow table.
- Distributor visit logs create workflow tickets with status-change history.
- Daily Trends tab with seven-day charts.

## Google Login

Create a Google OAuth Web Client ID and configure it in `js/app.js`. Add your GitHub Pages origin as an authorized JavaScript origin, for example `https://USERNAME.github.io`. Do not include the repository path, and never place a client secret in GitHub Pages code.

## Apps Script Authorization

In Apps Script -> Project Settings -> Script Properties, add:

`ALLOWED_EMAILS` = `your@gmail.com,another@gmail.com`

Only listed Google accounts can sync with the sheet. Replace the old `Code.gs` with `google-app-script/Code.gs`, then redeploy the Web App as Execute as Me / Who has access Anyone. Keep the `/exec` URL in the app sync settings.

Note: the current backend authorization checks the email sent by the frontend. Server-side Google ID token verification should be added before treating this as a strong security boundary.

## Ticket Workflow

Distributor visit logs are treated as workflow tickets. The first status must be `Ordered`, and each later change moves one step through this order:

`Ordered -> Received -> Payment pending -> Paid cheque -> Paid cash -> Inventory added`

Each ticket stores who created it, when it was created, and a `ticketStatusHistory` array recording every status change with the changing user and timestamp. Tickets are outstanding until they reach `Inventory added`.

## Two-Way Sync

Browser local data and pending changes are sent to Apps Script. Apps Script returns the current sheet records. `Updated At` decides which version wins when the same record exists locally and in the sheet.

## Extensible Columns

The sheet remains header-driven. Add headers such as Amount, Customer, Distributor, Product, Quantity, Payment Mode, Location, or Remarks. Future named app fields can map to these headers without depending on column position.

## Automated Tests

Run the Add Log and ticket workflow regression test with:

```bash
npm test
```

## Manual Test Checklist

Use this checklist after frontend or sync changes:

1. Load `index.html` or the GitHub Pages deployment and confirm the login card renders without console errors.
2. Sign in with an allowed Google account and confirm the main app appears.
3. Add a regular Log entry and confirm it appears in the table.
4. Add Cashin and Cashout entries with amounts and confirm the dashboard totals update for the selected date.
5. Create a Distributor visit with status `Ordered` and confirm it appears in Outstanding Tickets.
6. Confirm Distributor visit with `NA` status is rejected.
7. Move the ticket through the workflow one status at a time and confirm status history records the changing user and timestamp.
8. Confirm dashboard outstanding ticket count drops when a ticket reaches `Inventory added`.
9. Search the Logs table and confirm historical entries are included.
10. Switch to Daily Trends and confirm all four charts render.
11. Configure the Apps Script Web App URL, click Sync Now, and confirm the sheet receives records.
12. Reload the page and confirm locally stored records and auth state behave as expected.

## Build Notes

### Build 5.8

- Added log-backed ticket workflow for Distributor visit logs.
- Added Outstanding Tickets page with Jira-like table, workflow strip, status lozenges, and one-step transition actions.
- Added dashboard outstanding-ticket count.
- Added ticket creator and status-change history metadata.
- Added `v5.8` header suffix and asset cache-busting query strings.
- Added automated regression coverage for Add Log and ticket workflow behavior.

### Maintenance Cleanup

- Reformatted storage, auth, and Sheets sync modules for maintainability.
- Updated the sync queue so later edits replace earlier queued records with the same ID.
- Removed duplicated CSS hotfix blocks.
- Replaced corrupted display text with ASCII-safe UI strings.
- Added manual and automated test notes.
