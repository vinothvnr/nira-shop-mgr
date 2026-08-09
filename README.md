# LogBook v2.1

Build 2.1 keeps the Build 2 UI and adds an **extensible, header-driven Google Sheets layer**.

## What changed

The Google Apps Script no longer depends on fixed column positions.

The standard columns are:

- ID
- Timestamp
- Date
- Time
- Log Type
- Description
- Status
- Synced At

The script finds these by their **header names**.

### You can now

- Add new columns to the right side of the sheet.
- Reorder existing columns.
- Keep custom columns in the sheet.
- Add future app fields without rewriting the row insertion logic.
- Keep duplicate protection based on the ID column.

## Example future columns

You can add:

- Amount
- Customer
- Distributor
- Product
- Quantity
- Payment Mode
- Location
- Remarks

The app can later send these named fields, and the header-driven backend can place them into matching columns.

## Important rule for future development

Use clear column headers. For example:

`Customer`, `Distributor`, `Amount`, `Payment Mode`, `Quantity`

The backend matches headers case-insensitively and tolerates spaces, `_`, and `-`.

## Google Sheets setup

1. Create/open the Google Sheet.
2. Extensions -> Apps Script.
3. Replace the old `Code.gs` with the new `google-app-script/Code.gs` from this package.
4. Save.
5. Deploy -> Manage deployments.
6. Edit the existing Web App deployment, or create a new deployment.
7. Execute as: Me.
8. Who has access: Anyone.
9. Deploy and authorize if prompted.
10. Keep using the `/exec` Web App URL in LogBook.

### Existing sheet

If your Build 2 sheet already has data, **do not delete it**.

The new script preserves existing columns and rows. It only ensures the standard headers exist.

If you have manually added columns, they remain intact.

## Future feature example

Suppose Build 3 adds an `Amount` field.

The app can send:

```text
{
  id: "...",
  timestamp: "...",
  logType: "Cashin",
  description: "Payment received",
  status: "Paid Cash",
  amount: 5000
}
```

If the Sheet contains an `Amount` header, the backend can place `5000` in that column without changing the row-mapping algorithm.

## Reordering columns

Safe:

`Description | ID | Amount | Timestamp | Status | ...`

The backend identifies columns by their headers, not their position.

## Important limitation

A new app field does not automatically create a Google Sheet column merely because the field exists in the JSON payload.

For controlled schema evolution, add the desired header to the sheet first. Then the backend will populate it when the app starts sending that field.

This avoids accidentally creating unwanted columns from typos or internal fields.
