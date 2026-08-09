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