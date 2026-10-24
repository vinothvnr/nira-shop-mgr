# Nira Log Book

Nira Log Book is a static, browser-based activity and cash logging app. It stores data locally in the browser and can optionally synchronize records two-way with a Google Sheet through a Google Apps Script Web App.

## What it includes

- Google Identity Services sign-in and sign-out.
- Local-first storage using browser `localStorage`.
- Log types for regular logs, cash-in, cash-out, distributor visits, and customer feedback.
- Day close entries with cash-counter, Paytm, and POS totals plus automatic excess/shortage calculation.
- Date-based dashboard totals for logs, cash movement, distributor visits, feedback, and ticket statuses.
- Search and column filters for the log table.
- Seven-day Daily Trends charts rendered with the Canvas API, including Day close discrepancy amounts.
- Vendor tracking for distributor visits with ticket IDs, status groups, and next/previous workflow actions.
- Optional two-way Google Sheets synchronization with a pending-change queue.
- Header-driven Apps Script sheet columns and soft deletes through the `Deleted` field.

## Repository layout

```text
index.html                    Application shell and page markup
css/style.css                 Application styles
js/storage.js                 Local log storage
js/auth.js                    Local authentication state
js/sheets.js                  Sync URL, queue, and Google Sheets requests
js/app.js                     UI, dashboard, charts, and ticket workflow
google-app-script/Code.gs     Google Sheets Web App backend
tests/                        Node-based regression tests
package.json                  Test script; no runtime dependencies
```

## Try it locally

The app is static, but serve it from a local HTTP server instead of opening `index.html` directly. This gives Google Identity Services and browser `fetch` the expected web origin.

### Option 1: Python

From the repository root:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

### Option 2: Node.js

If you have a static server available through `npx`:

```bash
npx serve . -l 8000
```

Then open the localhost URL shown by the command.

There is no frontend build step and no `npm install` is required to run the app or its tests.

### Local testing before GitHub Pages

Use this sequence before deploying:

1. Open a terminal in the repository root, the folder containing `index.html`.
2. Start a local server with one of the commands above and keep that terminal running.
3. Open the matching URL, for example <http://localhost:8000>. Do not open `index.html` with a `file://` URL.
4. If testing Google sign-in, add the exact local origin, such as `http://localhost:8000`, to the OAuth client's **Authorized JavaScript origins**.
5. Run `npm test` in a second terminal and confirm both regression test suites pass.
6. Use the [manual smoke test](#manual-smoke-test) to check login, logs, cash totals, Day close, vendor tracking, search, charts, and optional Google Sheets sync.
7. Check the browser developer console for errors, especially after signing in and clicking **Sync Now**.
8. Stop the local server with `Ctrl+C` after testing.

The local server only serves the frontend. Google Sheets synchronization still requires the deployed Apps Script Web App URL, and Google sign-in requires the localhost origin to be configured in Google Cloud Console.

## Run automated tests

The tests execute the browser modules in a lightweight Node VM and cover Add Log, validation, search and filters, vendor tracking, ticket ID allocation, and workflow transitions.

```bash
npm test
```

The test command runs:

```text
node tests/add-log.test.js
node tests/features.test.js
```

Use a current Node.js version with modern JavaScript support.

## Google sign-in setup

The Google OAuth web client ID is currently configured in `js/app.js` as `GOOGLE_CLIENT_ID`.

1. In Google Cloud Console, create or select a Web application OAuth client.
2. Add the origin you use to test the app, such as `http://localhost:8000`, to **Authorized JavaScript origins**.
3. Add your production origin as well, for example `https://USERNAME.github.io`.
4. Do not add the repository path to the origin, and do not place a client secret in this repository.
5. Sign in with a Google account that is allowed by the Apps Script configuration when using sync.

If the client ID changes, update `GOOGLE_CLIENT_ID` in `js/app.js` and add the matching origins in Google Cloud Console.

## Google Sheets synchronization setup

The backend expects a spreadsheet with a sheet named `Logs`. If the sheet or required headers do not exist, `Code.gs` creates the sheet and adds the standard headers.

1. Open or create a Google Apps Script project bound to the target spreadsheet.
2. Replace its code with [`google-app-script/Code.gs`](google-app-script/Code.gs).
3. In **Project Settings → Script properties**, add:

   ```text
   ALLOWED_EMAILS=your@gmail.com,another@gmail.com
   ```

4. Deploy the project as a Web app:
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Copy the deployed `/exec` URL into the app's **Show Sync Settings** panel, or update the saved URL in the browser.
6. Sign in, create a record, and click **Sync Now**.

The sync request sends local records and pending changes. The Apps Script backend merges records by `ID`, allocates `NIRA-<number>` IDs for distributor visits, and uses `Updated At` to decide which version wins. A script lock protects ticket-number allocation when multiple users sync at the same time.

The current backend allowlist trusts the email value sent by the frontend. Add server-side Google ID-token verification before treating this as a strong security boundary.

## Vendor tracking workflow

Creating a `Distributor visit` creates a log-backed vendor ticket. New tickets must start at `Ordered` and can move through this workflow:

```text
Ordered → Received → Payment pending → Paid cheque → Inventory added
                                  ↘ Paid cash → Inventory added
```

The app records the ticket creator, creation time, creator email, and status-change history. Tickets remain outstanding until they reach `Inventory added`; the dashboard and navigation badge show the current outstanding count.

## Data and browser behavior

The browser uses these local-storage keys:

- `logbook_v3_logs` — saved log records.
- `logbook_v3_user` — the locally remembered signed-in user.
- `logbook_v3_url` — the Apps Script Web App URL.
- `logbook_v3_queue` — records waiting to sync.

Clearing site data for the app removes local records, login state, sync settings, and pending changes. Google Sheets is only updated when synchronization is configured and succeeds.

## Manual smoke test

After frontend or sync changes:

1. Start a local HTTP server and open the app.
2. Confirm the login card renders without browser console errors.
3. Sign in with an allowed Google account.
4. Add a regular log, a cash-in entry, and a cash-out entry; confirm dashboard totals.
5. Create a **Day close**, enter all four amounts, and confirm the popup shows the entered values and calculated excess/shortage.
6. Confirm the Day close description contains all amounts and its discrepancy is stored in the Amount column.
7. Create a distributor visit with `Ordered`; confirm it appears under **Vendor tracking**.
8. Confirm a distributor visit with status `NA` is rejected.
9. Move a ticket through valid next and previous states; confirm the count and status groups update.
10. Search logs and try the date, user, type, description, amount, and status filters.
11. Open **Daily Trends** and confirm all five charts render, including the Day Close Discrepancy chart.
12. Configure the Apps Script URL, click **Sync Now**, and confirm the record appears in the `Logs` sheet.
13. Reload the page and confirm local records and the remembered auth state are restored.

## Deployment

After local testing passes, deploy the repository contents to GitHub Pages:

1. Push the tested files to the GitHub repository's default branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch and `/ (root)` folder, then save.
4. Wait for the Pages deployment and open the published site URL.
5. Add the exact published origin, such as `https://USERNAME.github.io`, to the Google OAuth client's **Authorized JavaScript origins**. Do not include a path such as `/nira-shop-mgr` in the origin field.
6. Test sign-in and Google Sheets sync again on the published URL.

The frontend has no build step. The Google Apps Script backend is deployed separately as a Web app.
