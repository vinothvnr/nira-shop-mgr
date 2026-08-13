# LogBook v3

Features: two-way Google Sheets sync, hidden sync settings, Google login/logout, authorized-user allowlist, and header-driven extensible columns.

## Google login
Create a Google OAuth Web Client ID and replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` in `js/app.js`. Add your GitHub Pages origin as an authorized JavaScript origin, e.g. `https://USERNAME.github.io`.

## Apps Script authorization
In Apps Script -> Project Settings -> Script Properties add:
`ALLOWED_EMAILS` = `your@gmail.com,another@gmail.com`
Only listed Google accounts can sync with the sheet.

Replace the old Code.gs with `google-app-script/Code.gs`, then redeploy the Web App as Execute as Me / Who has access Anyone. Keep the `/exec` URL in the app.

## Two-way sync
Browser local data and pending changes are sent to Apps Script; Apps Script returns the current sheet records. `Updated At` decides which version wins. Deletes are soft deletes using `Deleted`.

## Extensible columns
The sheet remains header-driven. Add headers such as Amount, Customer, Distributor, Product, Quantity, Payment Mode, Location or Remarks. Future named app fields can map to these headers without depending on column position.

## Security
The Apps Script `ALLOWED_EMAILS` list is the authorization boundary for sheet access. Keep it limited to intended accounts. The Google login UI should be configured with your own OAuth client ID.


## Build 3.1
The supplied Google OAuth Web Client ID is already configured in `js/app.js`. Add your GitHub Pages origin (for example `https://YOUR-USERNAME.github.io`) to Authorized JavaScript origins in Google Cloud. Do not include the repository path. Never place a client secret in the GitHub Pages code.
\n\n## Build 4\n- Stores the creator's Google display name in `User Name`.\n- Shows `Amount` only for Cashin/Cashout today; the sheet field is extensible for future log types.\n- Dashboard includes Cashin/Cashout counts and total amounts.\n- Apps Script adds missing headers without relying on column positions.\n

## Build 5 additions
- Removed the Clear All button.
- Page title is now **Nira Log Book**.
- Dashboard has a date selector; dashboard counts/amounts are for the selected date.
- Added a separate **Daily Trends** tab with 7-day charts for log count, cash flow amounts, cash flow counts, and key status counts.


## Build 5.1
- Visible webpage title and browser title are **Nira Log Book**.
- Fixed Google Login initialization.
- Added button press feedback.

## Build 5.2 login hotfix

- Login button now explicitly invokes Google Identity Services.
- Google Identity Services is initialized with retry logic when the script loads asynchronously.
- The login card also renders the standard Google sign-in button as a fallback.
- The supplied OAuth Client ID is retained.
- Login button shows a brief "Opening Google…" state.


## Build 5.3 login hotfix
The login issue was caused by Build 5 dashboard JavaScript referencing dashboard elements that were missing from the HTML. That JavaScript exception stopped the rest of the page initialization, including the Google login handler. Build 5.3 restores the dashboard elements and makes initialization null-safe.


## Build 5.4
- Rebuilt the main JavaScript cleanly to remove the syntax error in Build 5.3.
- Initialization is now DOM-safe and null-safe.
- Google Identity Services initialization is isolated and retried until available.
- Dashboard/trend event handlers no longer run against missing elements.
- Added defensive chart rendering.
- Preserved Nira Log Book branding, Google login/logout, amount/user fields, dashboard date selector, daily trends, and Sheets sync.


## Build 5.5
- Fixed the Logs table being incorrectly filtered by the Dashboard date selector.
- The Logs table now always displays all non-deleted logs, including historical entries.
- Search operates across all logs.
- Dashboard cards remain date-specific.
- Daily Trends remains based on the selected dashboard date.
- Successful sync now refreshes both the log table and trends.


## Build 5.6
- Rebuilt `app.js` cleanly instead of layering another patch over previous builds.
- Fixed log-table rendering and dashboard rendering paths.
- Added defensive localStorage/date parsing.
- Logs table always displays all non-deleted logs.
- Dashboard totals use only the selected dashboard date.
- Added cache-busting query strings (`?v=5.6`) to prevent GitHub Pages/browser cache from serving an older JavaScript file.
- Preserved Google Login, Sheets sync, amounts, usernames, trends, and button feedback.
