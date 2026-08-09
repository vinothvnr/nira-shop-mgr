/*
 * LogBook Google Sheets API - Extensible / header-driven version
 *
 * The app sends named fields. The sheet is mapped by header name,
 * not by column number. You can add/reorder columns in the sheet.
 */

const SHEET_NAME = 'Logs';

const BASE_HEADERS = [
  'ID',
  'Timestamp',
  'Date',
  'Time',
  'Log Type',
  'Description',
  'Status',
  'Synced At'
];

function doGet() {
  return json_({
    ok: true,
    service: 'LogBook',
    version: '2.1',
    message: 'Header-driven Google Sheets API'
  });
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');

    if (body.action !== 'sync') {
      throw new Error('Unsupported action');
    }

    const logs = Array.isArray(body.logs) ? body.logs : [];
    const sheet = getSheet_();

    // Make sure the standard columns exist, while preserving any
    // user-added columns already present in the sheet.
    ensureHeaders_(sheet, BASE_HEADERS);

    const headers = getHeaders_(sheet);
    const headerMap = buildHeaderMap_(headers);
    const existingIds = getExistingIds_(sheet, headerMap);

    const rows = [];

    logs.forEach(function(log) {
      const id = String(log.id || '');
      if (!id || existingIds.has(id)) return;

      const row = new Array(headers.length).fill('');
      const timestamp = log.timestamp ? new Date(log.timestamp) : new Date();

      put_(row, headerMap, 'ID', id);
      put_(row, headerMap, 'Timestamp', log.timestamp || timestamp.toISOString());
      put_(row, headerMap, 'Date',
        Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
      put_(row, headerMap, 'Time',
        Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss'));
      put_(row, headerMap, 'Log Type', log.logType || '');
      put_(row, headerMap, 'Description', log.description || '');
      put_(row, headerMap, 'Status', log.status || '');
      put_(row, headerMap, 'Synced At', new Date());

      // Future fields can be added to the app payload without changing
      // the row-writing logic. If the matching header exists, it is used.
      Object.keys(log).forEach(function(key) {
        const header = normalizeHeader_(key);
        const target = HEADER_ALIASES_[header] || key;
        if (headerMap[normalizeHeader_(target)] !== undefined &&
            !['id','timestamp','logtype','description','status'].includes(header)) {
          put_(row, headerMap, target, log[key]);
        }
      });

      rows.push(row);
    });

    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length)
        .setValues(rows);
    }

    return json_({
      ok: true,
      inserted: rows.length,
      skippedDuplicates: logs.length - rows.length
    });

  } catch (err) {
    return json_({
      ok: false,
      error: String(err.message || err)
    });
  }
}

/*
 * Add future aliases here if the app field name differs from the
 * Google Sheet header you want to use.
 *
 * Example:
 * amount: 'Amount',
 * customerName: 'Customer'
 */
const HEADER_ALIASES_ = {
  logtype: 'Log Type',
  syncedat: 'Synced At'
};

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet, BASE_HEADERS);
  return sheet;
}

function ensureHeaders_(sheet, requiredHeaders) {
  let headers = getHeaders_(sheet);

  if (headers.length === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length)
      .setValues([requiredHeaders]);
    return;
  }

  const existing = new Set(headers.map(normalizeHeader_));

  requiredHeaders.forEach(function(header) {
    if (!existing.has(normalizeHeader_(header))) {
      const nextColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextColumn).setValue(header);
      existing.add(normalizeHeader_(header));
    }
  });
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();

  if (lastColumn === 0) return [];

  return sheet.getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(value) {
      return String(value || '').trim();
    });
}

function buildHeaderMap_(headers) {
  const map = {};

  headers.forEach(function(header, index) {
    const normalized = normalizeHeader_(header);
    if (normalized) map[normalized] = index;
  });

  return map;
}

function getExistingIds_(sheet, headerMap) {
  const idColumn = headerMap[normalizeHeader_('ID')];

  if (idColumn === undefined || sheet.getLastRow() < 2) {
    return new Set();
  }

  const values = sheet.getRange(
    2,
    idColumn + 1,
    sheet.getLastRow() - 1,
    1
  ).getValues();

  return new Set(
    values.flat()
      .filter(function(value) { return String(value).trim() !== ''; })
      .map(function(value) { return String(value); })
  );
}

function put_(row, headerMap, header, value) {
  const index = headerMap[normalizeHeader_(header)];

  if (index !== undefined) {
    row[index] = value;
  }
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
