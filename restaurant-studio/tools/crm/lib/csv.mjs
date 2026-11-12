/**
 * A small CSV reader and writer (RFC 4180: quoted fields, doubled quotes, line breaks inside
 * quotes). No dependency, so the CRM tools install quickly.
 *
 * The text in a prospect file comes from web research, so it is treated as untrusted. A cell
 * that a spreadsheet would read as a formula (it starts with = + - @, a tab or a carriage
 * return) is written with a leading apostrophe, and that apostrophe is removed again when the
 * file is read back by these tools.
 */

// A formula character at the start, with or without apostrophes in front of it. Counting the
// apostrophes is what makes guardCell and unguardCell exact opposites of each other.
const NEEDS_GUARD = /^'*[=+\-@\t\r]/;
const IS_GUARDED = /^'+[=+\-@\t\r]/;

/** Makes a cell safe to open in a spreadsheet program. */
export function guardCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return NEEDS_GUARD.test(text) ? `'${text}` : text;
}

/** Undoes guardCell. Only the one apostrophe that guardCell added is removed. */
export function unguardCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return IS_GUARDED.test(text) ? text.slice(1) : text;
}

function quote(text) {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Turns rows (arrays of values) into CSV text. Every cell is guarded.
 * Lines end with CRLF, which is what spreadsheet programs expect.
 */
export function stringifyCsv(rows) {
  return rows.map((row) => row.map((cell) => quote(guardCell(cell))).join(",")).join("\r\n") + "\r\n";
}

/**
 * Reads CSV text into rows of strings. A leading byte-order mark is ignored and empty lines
 * are skipped. Throws when a quoted field is never closed.
 */
export function parseCsv(text) {
  const source = String(text).replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let quotedField = false;

  const endField = () => {
    row.push(field);
    field = "";
    quotedField = false;
  };
  const endRow = () => {
    endField();
    const empty = row.length === 1 && row[0] === "";
    if (!empty) rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field === "" && !quotedField) {
      inQuotes = true;
      quotedField = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\n") {
      endRow();
    } else if (char === "\r") {
      if (source[i + 1] === "\n") i++;
      endRow();
    } else {
      field += char;
    }
  }
  if (inQuotes) throw new Error("The CSV file ends inside a quoted cell. A closing quote mark is missing.");
  if (field !== "" || row.length > 0) endRow();
  return rows;
}
