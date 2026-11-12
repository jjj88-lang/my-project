/**
 * A simulated Google Apps Script environment, for running Code.gs under Node.
 *
 * These fakes are written to behave like the real services in the ways Code.gs depends on:
 * the same method names and argument order, the same return types, and the same errors for the
 * mistakes that are easy to make (a range outside the sheet, a setValues call of the wrong size,
 * sending mail past the daily quota).
 *
 * THIS IS A MODEL, NOT GOOGLE. Three behaviours below are assumptions taken from Google's
 * documentation and long-standing practice, and can only be confirmed on a live account:
 *
 *   A1. A string that starts with an apostrophe is stored as text without the apostrophe,
 *       whatever the cell's number format.
 *   A2. A cell whose number format is "@" (plain text) stores any string as text, including one
 *       that begins with "=".
 *   A3. In any other cell, a string that begins with "=" becomes a formula, a string that begins
 *       with "+" or "-" becomes a number or a formula, and strings that look like numbers, dates,
 *       times or TRUE/FALSE are converted, as if a person had typed them.
 *
 * TESTING.md lists what follows from that.
 */
import { randomUUID } from "node:crypto";

export const MODEL_ASSUMPTIONS = [
  "A1: a leading apostrophe marks a cell as text and is not part of the stored value",
  "A2: a cell formatted as plain text (@) stores strings literally, formulas included",
  "A3: other cells parse strings as if typed: =, + and - start formulas; numbers, dates and booleans are converted",
];

export const DEFAULT_START = Date.parse("2026-11-11T20:05:00.000Z"); // 2:05 PM in Topeka

const GENERAL_FORMAT = "0.###############";
const PLAIN_TEXT = "@";

function isDate(value) {
  return Object.prototype.toString.call(value) === "[object Date]";
}

function fail(message) {
  // Apps Script reports service errors as "Exception: ...". The message is what matters here.
  const error = new Error(message);
  error.name = "Exception";
  return error;
}

/* ------------------------------------------------------------------------------------------
 * How a spreadsheet cell reads a value written by setValue / setValues / appendRow
 * ---------------------------------------------------------------------------------------- */

const NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?%?$/;
const NUMBER_WITH_COMMAS = /^[+-]?\$?\d{1,3}(,\d{3})+(\.\d+)?$/;
const CURRENCY = /^[+-]?\$\d+(\.\d+)?$/;
const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE_OR_TIME = [
  /^\d{4}-\d{1,2}-\d{1,2}$/,
  /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/,
  /^\d{1,2}-\d{1,2}(-\d{2,4})?$/,
  /^\d{1,2}:\d{2}(:\d{2})?(\s?[ap]\.?m\.?)?$/i,
  /^\d{1,2}\s?[ap]m$/i,
  new RegExp(`^${MONTH} \\d{1,2}(,? \\d{4})?$`, "i"),
  new RegExp(`^\\d{1,2} ${MONTH}( \\d{4})?$`, "i"),
];

function evaluateFormula(formula) {
  // Enough arithmetic to make the point in tests: "=1+1" shows 2, like a real spreadsheet.
  const simple = /^=\s*\+?(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)\s*$/.exec(formula);
  if (simple) {
    const a = Number(simple[1]);
    const b = Number(simple[3]);
    return { "+": a + b, "-": a - b, "*": a * b, "/": b === 0 ? "#DIV/0!" : a / b }[simple[2]];
  }
  if (/^=\s*[A-Za-z]+\(/.test(formula)) return "#FORMULA_RESULT";
  return "#ERROR!";
}

/** Returns the stored form of an input, given the cell's number format. */
export function interpretInput(input, numberFormat) {
  if (input === null || input === undefined || input === "") return { kind: "empty", value: "" };
  if (typeof input === "number") return { kind: "number", value: input };
  if (typeof input === "boolean") return { kind: "boolean", value: input };
  if (isDate(input)) return { kind: "date", value: new Date(input.getTime()) };
  if (typeof input !== "string") {
    throw fail(`The parameters (${typeof input}) don't match the method signature for SpreadsheetApp.Range.setValue.`);
  }

  if (input.charAt(0) === "'") return { kind: "text", value: input.slice(1), forcedText: true }; // A1
  if (numberFormat === PLAIN_TEXT) return { kind: "text", value: input, forcedText: true }; // A2

  // A3: everything below is "as if typed into the cell".
  if (input.charAt(0) === "=" && input.length > 1) {
    return { kind: "formula", formula: input, value: evaluateFormula(input) };
  }
  if (NUMBER.test(input) || NUMBER_WITH_COMMAS.test(input) || CURRENCY.test(input)) {
    const cleaned = input.replace(/[$,%]/g, "");
    return { kind: "number", value: Number(cleaned) / (input.endsWith("%") ? 100 : 1), converted: true };
  }
  if (/^[+-]/.test(input)) {
    const formula = `=${input}`;
    return { kind: "formula", formula, value: evaluateFormula(formula) };
  }
  if (/^(true|false)$/i.test(input)) return { kind: "boolean", value: /^true$/i.test(input), converted: true };
  if (DATE_OR_TIME.some((pattern) => pattern.test(input.trim()))) {
    const parsed = Date.parse(input);
    return { kind: "date", value: Number.isNaN(parsed) ? input : new Date(parsed), converted: true };
  }
  return { kind: "text", value: input };
}

function displayOf(cell) {
  switch (cell.kind) {
    case "empty":
      return "";
    case "boolean":
      return cell.value ? "TRUE" : "FALSE";
    case "date":
      return isDate(cell.value) ? cell.value.toISOString().slice(0, 10) : String(cell.value);
    default:
      return String(cell.value);
  }
}

/* ------------------------------------------------------------------------------------------
 * The world: everything one script installation can see
 * ---------------------------------------------------------------------------------------- */

export function createWorld(options = {}) {
  let now = options.now ?? DEFAULT_START;

  const world = {
    clock: {
      now: () => now,
      set: (ms) => {
        now = ms;
      },
      advance: (ms) => {
        now += ms;
      },
    },
    /** "editor" when a person runs a function by hand, "webapp" inside doGet / doPost. */
    context: "editor",
    /** Every write to a sheet and every email, in order, with whether the script lock was held. */
    journal: [],
    failures: [],
    sheetsDirty: false,
    flushes: 0,
    spreadsheet: null,
    mail: {
      sent: [],
      attempts: 0,
      /** Recipients the account may still email today. A consumer account starts at about 100. */
      quota: options.quota ?? 100,
      /** Optional hook: (message, attemptNumber) => Error | undefined. */
      failWhen: null,
    },
    properties: new Map(Object.entries(options.properties ?? {})),
    cache: new Map(),
    lock: { held: false, heldByOther: false, acquired: 0, released: 0, waitedMs: 0, onRequest: null },
    logger: [],
    console: [],
    session: {
      effectiveEmail: options.ownerAccount ?? "owner@restaurant.example",
      timeZone: options.timeZone ?? "America/Chicago",
    },
    sleptMs: 0,

    /** Make the named call fail the next `times` times, e.g. world.failNext("Range.setValues"). */
    failNext(point, message = "Service error: simulated failure", times = 1) {
      world.failures.push({ point, message, times });
    },
    trip(point) {
      const failure = world.failures.find((f) => f.point === point && f.times > 0);
      if (failure) {
        failure.times -= 1;
        throw fail(failure.message);
      }
    },
    record(entry) {
      world.journal.push({ ...entry, lockHeld: world.lock.held, context: world.context, at: now });
    },
  };

  if (options.bound !== false) {
    world.spreadsheet = new FakeSpreadsheet(world, options.spreadsheetName ?? "Website inquiries");
  }

  world.globals = buildGlobals(world);
  return world;
}

/* ------------------------------------------------------------------------------------------
 * SpreadsheetApp
 * ---------------------------------------------------------------------------------------- */

function emptyCell() {
  return {
    kind: "empty",
    value: "",
    formula: "",
    raw: "",
    format: GENERAL_FORMAT,
    weight: "normal",
    background: "#ffffff",
    validation: null,
    converted: false,
    forcedText: false,
  };
}

function wholeNumber(value, name, minimum) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw fail(`The parameters don't match the method signature: ${name} must be a whole number.`);
  }
  if (value < minimum) {
    throw fail(
      name.startsWith("num")
        ? `The number of ${name === "numRows" ? "rows" : "columns"} in the range must be at least 1.`
        : `The starting ${name} of the range is too small.`,
    );
  }
}

export class FakeSpreadsheet {
  constructor(world, name) {
    this.world = world;
    this.name = name;
    this.id = "FAKE_SPREADSHEET_ID";
    this.sheets = [];
    this.nextSheetId = 0;
    // A new Google Sheet starts with one empty tab.
    this.sheets.push(new FakeSheet(world, this, "Sheet1", this.nextSheetId++));
  }

  getName() {
    return this.name;
  }
  getId() {
    return this.id;
  }
  getUrl() {
    return `https://docs.google.com/spreadsheets/d/${this.id}/edit`;
  }
  getSheets() {
    return [...this.sheets];
  }
  getSheetByName(name) {
    this.world.trip("Spreadsheet.getSheetByName");
    return this.sheets.find((sheet) => sheet.name === name) ?? null;
  }
  insertSheet(name) {
    this.world.trip("Spreadsheet.insertSheet");
    if (typeof name !== "string" || name === "") throw fail("Invalid argument: sheetName");
    if (this.sheets.some((sheet) => sheet.name.toLowerCase() === name.toLowerCase())) {
      throw fail(`A sheet with the name "${name}" already exists. Please enter another name.`);
    }
    const sheet = new FakeSheet(this.world, this, name, this.nextSheetId++);
    this.sheets.push(sheet);
    this.world.sheetsDirty = true;
    this.world.record({ service: "sheet", op: "insertSheet", sheet: name });
    return sheet;
  }
  deleteSheet(sheet) {
    this.sheets = this.sheets.filter((s) => s !== sheet);
  }
}

export class FakeSheet {
  constructor(world, spreadsheet, name, sheetId) {
    this.world = world;
    this.spreadsheet = spreadsheet;
    this.name = name;
    this.sheetId = sheetId;
    this.maxRows = 1000;
    this.maxColumns = 26;
    this.frozenRows = 0;
    this.cells = new Map();
  }

  /* --- internals used by the fake and by test helpers --- */
  _get(row, column) {
    return this.cells.get(`${row}:${column}`) ?? emptyCell();
  }
  _touch(row, column) {
    const key = `${row}:${column}`;
    if (!this.cells.has(key)) this.cells.set(key, emptyCell());
    return this.cells.get(key);
  }
  _write(row, column, input) {
    const cell = this._touch(row, column);
    const stored = interpretInput(input, cell.format);
    cell.kind = stored.kind;
    cell.value = stored.value;
    cell.formula = stored.formula ?? "";
    cell.converted = stored.converted === true;
    cell.forcedText = stored.forcedText === true;
    cell.raw = input;
  }
  _shift(test, move) {
    const next = new Map();
    for (const [key, cell] of this.cells) {
      const [row, column] = key.split(":").map(Number);
      const [newRow, newColumn] = test(row, column) ? move(row, column) : [row, column];
      next.set(`${newRow}:${newColumn}`, cell);
    }
    this.cells = next;
  }
  _mutated(op, detail = {}) {
    this.world.sheetsDirty = true;
    this.world.record({ service: "sheet", op, sheet: this.name, ...detail });
  }
  _read() {
    // Reading forces pending writes through, as it does on Google's side.
    this.world.sheetsDirty = false;
  }

  /* --- Sheet methods --- */
  getName() {
    return this.name;
  }
  getSheetId() {
    return this.sheetId;
  }
  getParent() {
    return this.spreadsheet;
  }
  getMaxRows() {
    return this.maxRows;
  }
  getMaxColumns() {
    return this.maxColumns;
  }
  getFrozenRows() {
    return this.frozenRows;
  }
  setFrozenRows(rows) {
    wholeNumber(rows, "rows", 0);
    this.frozenRows = rows;
    this._mutated("setFrozenRows", { rows });
  }
  getLastRow() {
    let last = 0;
    for (const [key, cell] of this.cells) {
      if (cell.kind !== "empty") last = Math.max(last, Number(key.split(":")[0]));
    }
    return last;
  }
  getLastColumn() {
    let last = 0;
    for (const [key, cell] of this.cells) {
      if (cell.kind !== "empty") last = Math.max(last, Number(key.split(":")[1]));
    }
    return last;
  }
  getRange(row, column, numRows = 1, numColumns = 1) {
    if (typeof row === "string") throw fail("A1 notation is not modeled by this fake. Use row and column numbers.");
    wholeNumber(row, "row", 1);
    wholeNumber(column, "column", 1);
    wholeNumber(numRows, "numRows", 1);
    wholeNumber(numColumns, "numColumns", 1);
    if (row + numRows - 1 > this.maxRows || column + numColumns - 1 > this.maxColumns) {
      throw fail("The coordinates of the range are outside the dimensions of the sheet.");
    }
    return new FakeRange(this, row, column, numRows, numColumns);
  }
  getDataRange() {
    return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1));
  }
  insertColumnsBefore(beforePosition, howMany) {
    wholeNumber(beforePosition, "column", 1);
    wholeNumber(howMany, "numColumns", 1);
    if (beforePosition > this.maxColumns) throw fail("Those columns are out of bounds.");
    this._shift(
      (row, column) => column >= beforePosition,
      (row, column) => [row, column + howMany],
    );
    this.maxColumns += howMany;
    this._mutated("insertColumnsBefore", { beforePosition, howMany });
    return this;
  }
  insertColumnsAfter(afterPosition, howMany) {
    wholeNumber(afterPosition, "column", 1);
    wholeNumber(howMany, "numColumns", 1);
    if (afterPosition > this.maxColumns) throw fail("Those columns are out of bounds.");
    this._shift(
      (row, column) => column > afterPosition,
      (row, column) => [row, column + howMany],
    );
    this.maxColumns += howMany;
    this._mutated("insertColumnsAfter", { afterPosition, howMany });
    return this;
  }
  insertColumnBefore(beforePosition) {
    return this.insertColumnsBefore(beforePosition, 1);
  }
  insertColumnAfter(afterPosition) {
    return this.insertColumnsAfter(afterPosition, 1);
  }
  insertRowsAfter(afterPosition, howMany) {
    wholeNumber(afterPosition, "row", 1);
    wholeNumber(howMany, "numRows", 1);
    if (afterPosition > this.maxRows) throw fail("Those rows are out of bounds.");
    this._shift(
      (row) => row > afterPosition,
      (row, column) => [row + howMany, column],
    );
    this.maxRows += howMany;
    this._mutated("insertRowsAfter", { afterPosition, howMany });
    return this;
  }
  insertRowsBefore(beforePosition, howMany) {
    wholeNumber(beforePosition, "row", 1);
    wholeNumber(howMany, "numRows", 1);
    if (beforePosition > this.maxRows) throw fail("Those rows are out of bounds.");
    this._shift(
      (row) => row >= beforePosition,
      (row, column) => [row + howMany, column],
    );
    this.maxRows += howMany;
    this._mutated("insertRowsBefore", { beforePosition, howMany });
    return this;
  }
  deleteRow(position) {
    wholeNumber(position, "row", 1);
    for (const key of [...this.cells.keys()]) if (Number(key.split(":")[0]) === position) this.cells.delete(key);
    this._shift(
      (row) => row > position,
      (row, column) => [row - 1, column],
    );
    this.maxRows -= 1;
    this._mutated("deleteRow", { position });
    return this;
  }
  deleteColumn(position) {
    wholeNumber(position, "column", 1);
    for (const key of [...this.cells.keys()]) if (Number(key.split(":")[1]) === position) this.cells.delete(key);
    this._shift(
      (row, column) => column > position,
      (row, column) => [row, column - 1],
    );
    this.maxColumns -= 1;
    this._mutated("deleteColumn", { position });
    return this;
  }
  /** Adds a row after the last row with content, reading each value as if it were typed. */
  appendRow(rowContents) {
    if (!Array.isArray(rowContents)) throw fail("The parameters don't match the method signature for appendRow.");
    const row = this.getLastRow() + 1;
    if (row > this.maxRows) this.maxRows = row;
    if (rowContents.length > this.maxColumns) this.maxColumns = rowContents.length;
    rowContents.forEach((value, index) => this._write(row, index + 1, value));
    this._mutated("appendRow", { row });
    return this;
  }

  /* --- helpers for tests (not part of Apps Script) --- */

  /** What a person looking at the sheet would see: the header and each row as { heading: text }. */
  table() {
    const width = this.getLastColumn();
    const header = [];
    for (let column = 1; column <= width; column++) header.push(displayOf(this._get(1, column)));
    const rows = [];
    for (let row = 2; row <= this.getLastRow(); row++) {
      const entry = {};
      for (let column = 1; column <= width; column++) {
        if (header[column - 1] !== "") entry[header[column - 1]] = displayOf(this._get(row, column));
      }
      rows.push(entry);
    }
    return { header, rows };
  }
  /** The exact strings the script handed to the sheet for one row, as { heading: string }. */
  rawRow(row) {
    const entry = {};
    for (let column = 1; column <= this.getLastColumn(); column++) {
      const heading = displayOf(this._get(1, column));
      if (heading !== "") entry[heading] = this._get(row, column).raw;
    }
    return entry;
  }
  cell(row, column) {
    return this._get(row, column);
  }
  cellUnder(heading, row) {
    for (let column = 1; column <= this.getLastColumn(); column++) {
      if (displayOf(this._get(1, column)) === heading) return this._get(row, column);
    }
    return undefined;
  }
  /** Cells that a spreadsheet would calculate. Must always be empty for visitor data. */
  formulaCells() {
    return [...this.cells.entries()].filter(([, cell]) => cell.kind === "formula").map(([key, cell]) => ({ key, formula: cell.formula }));
  }
  /** Cells whose text was silently turned into a number, date or TRUE/FALSE. */
  convertedCells() {
    return [...this.cells.entries()].filter(([, cell]) => cell.converted).map(([key, cell]) => ({ key, raw: cell.raw }));
  }
  /** Moves a whole column, the way an owner might by dragging it. */
  moveColumn(from, to) {
    const columnOf = (key) => Number(key.split(":")[1]);
    const moving = [...this.cells.entries()].filter(([key]) => columnOf(key) === from);
    for (const [key] of moving) this.cells.delete(key);
    if (from < to) {
      this._shift(
        (row, column) => column > from && column <= to,
        (row, column) => [row, column - 1],
      );
    } else {
      this._shift(
        (row, column) => column >= to && column < from,
        (row, column) => [row, column + 1],
      );
    }
    for (const [key, cell] of moving) this.cells.set(`${key.split(":")[0]}:${to}`, cell);
  }
}

class FakeRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  _map(read) {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const line = [];
      for (let c = 0; c < this.numColumns; c++) line.push(read(this.sheet._get(this.row + r, this.column + c)));
      out.push(line);
    }
    return out;
  }
  _each(change) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numColumns; c++) change(this.sheet._touch(this.row + r, this.column + c), r, c);
    }
  }
  _detail() {
    return { row: this.row, column: this.column, numRows: this.numRows, numColumns: this.numColumns };
  }

  getSheet() {
    return this.sheet;
  }
  getRow() {
    return this.row;
  }
  getColumn() {
    return this.column;
  }
  getNumRows() {
    return this.numRows;
  }
  getNumColumns() {
    return this.numColumns;
  }
  getLastRow() {
    return this.row + this.numRows - 1;
  }
  getLastColumn() {
    return this.column + this.numColumns - 1;
  }

  getValues() {
    this.sheet.world.trip("Range.getValues");
    this.sheet._read();
    return this._map((cell) => (cell.kind === "empty" ? "" : cell.value));
  }
  getValue() {
    return this.getValues()[0][0];
  }
  getDisplayValues() {
    this.sheet.world.trip("Range.getValues");
    this.sheet._read();
    return this._map(displayOf);
  }
  getDisplayValue() {
    return this.getDisplayValues()[0][0];
  }
  getFormulas() {
    this.sheet._read();
    return this._map((cell) => cell.formula);
  }
  getFormula() {
    return this.getFormulas()[0][0];
  }

  setValues(values) {
    this.sheet.world.trip("Range.setValues");
    if (!Array.isArray(values) || !values.every((line) => Array.isArray(line))) {
      throw fail("The parameters (String) don't match the method signature for SpreadsheetApp.Range.setValues.");
    }
    if (values.length !== this.numRows) {
      throw fail(
        `The number of rows in the data does not match the number of rows in the range. The data has ${values.length} but the range has ${this.numRows}.`,
      );
    }
    for (const line of values) {
      if (line.length !== this.numColumns) {
        throw fail(
          `The number of columns in the data does not match the number of columns in the range. The data has ${line.length} but the range has ${this.numColumns}.`,
        );
      }
    }
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numColumns; c++) this.sheet._write(this.row + r, this.column + c, values[r][c]);
    }
    this.sheet._mutated("setValues", this._detail());
    return this;
  }
  setValue(value) {
    this.sheet.world.trip("Range.setValue");
    if (Array.isArray(value)) throw fail("The parameters (Array) don't match the method signature for SpreadsheetApp.Range.setValue.");
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numColumns; c++) this.sheet._write(this.row + r, this.column + c, value);
    }
    this.sheet._mutated("setValue", this._detail());
    return this;
  }

  setNumberFormat(format) {
    this.sheet.world.trip("Range.setNumberFormat");
    if (typeof format !== "string") throw fail("The parameters don't match the method signature for setNumberFormat.");
    this._each((cell) => {
      cell.format = format;
    });
    this.sheet._mutated("setNumberFormat", { ...this._detail(), format });
    return this;
  }
  getNumberFormats() {
    return this._map((cell) => cell.format);
  }
  getNumberFormat() {
    return this.getNumberFormats()[0][0];
  }

  setFontWeight(weight) {
    if (weight !== "bold" && weight !== "normal" && weight !== null) throw fail("Invalid argument: fontWeight");
    this._each((cell) => {
      cell.weight = weight ?? "normal";
    });
    this.sheet._mutated("setFontWeight", this._detail());
    return this;
  }
  getFontWeights() {
    return this._map((cell) => cell.weight);
  }
  getFontWeight() {
    return this.getFontWeights()[0][0];
  }

  setBackground(color) {
    this.sheet.world.trip("Range.setBackground");
    if (color !== null && typeof color !== "string") throw fail("Invalid argument: color");
    this._each((cell) => {
      cell.background = color ?? "#ffffff";
    });
    this.sheet._mutated("setBackground", this._detail());
    return this;
  }
  getBackgrounds() {
    return this._map((cell) => cell.background);
  }
  getBackground() {
    return this.getBackgrounds()[0][0];
  }

  setDataValidation(rule) {
    this.sheet.world.trip("Range.setDataValidation");
    if (rule !== null && !(rule && rule.__isDataValidation === true)) {
      throw fail("The parameters don't match the method signature for setDataValidation.");
    }
    this._each((cell) => {
      cell.validation = rule;
    });
    this.sheet._mutated("setDataValidation", this._detail());
    return this;
  }
  getDataValidations() {
    return this._map((cell) => cell.validation);
  }
  getDataValidation() {
    return this.getDataValidations()[0][0];
  }

  clearContent() {
    this._each((cell) => {
      cell.kind = "empty";
      cell.value = "";
      cell.formula = "";
      cell.raw = "";
      cell.converted = false;
    });
    this.sheet._mutated("clearContent", this._detail());
    return this;
  }
}

function newDataValidationBuilder() {
  const rule = { __isDataValidation: true, type: null, values: null, showDropdown: true, allowInvalid: true, helpText: "" };
  const builder = {
    requireValueInList(values, showDropdown = true) {
      if (!Array.isArray(values) || values.length === 0 || !values.every((v) => typeof v === "string")) {
        throw fail("The parameters don't match the method signature for requireValueInList.");
      }
      rule.type = "VALUE_IN_LIST";
      rule.values = [...values];
      rule.showDropdown = showDropdown;
      return builder;
    },
    setAllowInvalid(allow) {
      if (typeof allow !== "boolean") throw fail("The parameters don't match the method signature for setAllowInvalid.");
      rule.allowInvalid = allow;
      return builder;
    },
    setHelpText(text) {
      rule.helpText = String(text);
      return builder;
    },
    build() {
      if (rule.type === null) throw fail("A data validation rule needs a criteria.");
      return Object.freeze({ ...rule });
    },
  };
  return builder;
}

/* ------------------------------------------------------------------------------------------
 * Utilities.formatDate: the letters of Java's SimpleDateFormat that the script uses
 * ---------------------------------------------------------------------------------------- */

function formatDate(date, timeZone, pattern) {
  if (!isDate(date) || Number.isNaN(date.getTime())) throw fail("Invalid argument: date");
  if (typeof timeZone !== "string" || typeof pattern !== "string") {
    throw fail("The parameters don't match the method signature for Utilities.formatDate.");
  }
  let parts;
  try {
    const pick = (options) =>
      Object.fromEntries(
        new Intl.DateTimeFormat("en-US", { timeZone, ...options }).formatToParts(date).map((p) => [p.type, p.value]),
      );
    const numeric = pick({ year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" });
    parts = {
      year: Number(numeric.year),
      month: Number(numeric.month),
      day: Number(numeric.day),
      hour: Number(numeric.hour),
      minute: Number(numeric.minute),
      second: Number(numeric.second),
      weekdayLong: pick({ weekday: "long" }).weekday,
      weekdayShort: pick({ weekday: "short" }).weekday,
      monthLong: pick({ month: "long" }).month,
      monthShort: pick({ month: "short" }).month,
    };
  } catch {
    throw fail(`Invalid argument: timeZone. Should be of type: String (${timeZone})`);
  }

  const pad = (value, width) => String(value).padStart(width, "0");
  const letters = {
    y: (n) => (n === 2 ? pad(parts.year % 100, 2) : pad(parts.year, n)),
    M: (n) => (n >= 4 ? parts.monthLong : n === 3 ? parts.monthShort : pad(parts.month, n)),
    d: (n) => pad(parts.day, n),
    E: (n) => (n >= 4 ? parts.weekdayLong : parts.weekdayShort),
    a: () => (parts.hour < 12 ? "AM" : "PM"),
    H: (n) => pad(parts.hour, n),
    h: (n) => pad(parts.hour % 12 === 0 ? 12 : parts.hour % 12, n),
    m: (n) => pad(parts.minute, n),
    s: (n) => pad(parts.second, n),
  };

  let out = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "'") {
      if (pattern[i + 1] === "'") {
        out += "'";
        i += 2;
        continue;
      }
      const end = pattern.indexOf("'", i + 1);
      if (end === -1) throw fail("Unterminated quote in the date format.");
      out += pattern.slice(i + 1, end);
      i = end + 1;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let run = 1;
      while (pattern[i + run] === ch) run++;
      if (!letters[ch]) throw fail(`Illegal pattern character '${ch}'`);
      out += letters[ch](run);
      i += run;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/* ------------------------------------------------------------------------------------------
 * The global objects Code.gs sees
 * ---------------------------------------------------------------------------------------- */

const ADDRESS = /^[^\s@,;<>()"]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

function buildGlobals(world) {
  /* SpreadsheetApp */
  const SpreadsheetApp = {
    getActiveSpreadsheet: () => world.spreadsheet,
    getActive: () => world.spreadsheet,
    flush() {
      world.trip("SpreadsheetApp.flush");
      world.sheetsDirty = false;
      world.flushes += 1;
    },
    newDataValidation: newDataValidationBuilder,
    openById() {
      throw fail("You do not have permission to call SpreadsheetApp.openById. The script is limited to the current document.");
    },
    getUi() {
      throw fail("Cannot call SpreadsheetApp.getUi() from this context.");
    },
  };

  /* MailApp */
  const MailApp = {
    getRemainingDailyQuota() {
      world.trip("MailApp.getRemainingDailyQuota");
      return world.mail.quota;
    },
    sendEmail(first, second, third, fourth) {
      let message;
      if (typeof first === "object" && first !== null) {
        message = { ...first };
      } else if (typeof fourth === "string") {
        message = { to: first, replyTo: second, subject: third, body: fourth };
      } else {
        message = { to: first, subject: second, body: third, ...(fourth ?? {}) };
      }
      world.mail.attempts += 1;

      const recipients = [message.to, message.cc, message.bcc]
        .filter((list) => typeof list === "string" && list.trim() !== "")
        .flatMap((list) => list.split(","))
        .map((address) => address.trim());
      if (recipients.length === 0) throw fail("Failed to send email: no recipient");
      for (const address of recipients) {
        if (!ADDRESS.test(address)) throw fail(`Invalid email: ${address}`);
      }
      if (message.replyTo !== undefined && !ADDRESS.test(String(message.replyTo))) {
        throw fail(`Invalid email: ${message.replyTo}`);
      }
      if (typeof message.subject !== "string" || /[\r\n]/.test(message.subject)) throw fail("Invalid argument: subject");
      if (typeof message.body !== "string") throw fail("Invalid argument: body");

      world.trip("MailApp.sendEmail");
      const injected = world.mail.failWhen?.(message, world.mail.attempts);
      if (injected) throw injected;

      // The quota counts recipients, not messages.
      if (recipients.length > world.mail.quota) throw fail("Service invoked too many times for one day: email.");
      world.mail.quota -= recipients.length;

      const sent = {
        to: message.to,
        subject: message.subject,
        body: message.body,
        replyTo: message.replyTo,
        name: message.name,
        htmlBody: message.htmlBody,
        recipients,
        sheetsDirtyAtSend: world.sheetsDirty,
      };
      world.mail.sent.push(sent);
      world.record({ service: "mail", op: "sendEmail", to: message.to });
    },
  };

  /* PropertiesService */
  const scriptProperties = {
    getProperty(key) {
      return world.properties.has(key) ? world.properties.get(key) : null;
    },
    getProperties() {
      world.trip("PropertiesService.getProperties");
      return Object.fromEntries(world.properties);
    },
    getKeys() {
      return [...world.properties.keys()];
    },
    setProperty(key, value) {
      if (typeof key !== "string" || key === "") throw fail("Invalid argument: key");
      world.properties.set(key, String(value));
      return scriptProperties;
    },
    setProperties(values, deleteAllOthers = false) {
      if (deleteAllOthers) world.properties.clear();
      for (const [key, value] of Object.entries(values)) world.properties.set(key, String(value));
      return scriptProperties;
    },
    deleteProperty(key) {
      world.properties.delete(key);
      return scriptProperties;
    },
    deleteAllProperties() {
      world.properties.clear();
      return scriptProperties;
    },
  };
  const PropertiesService = {
    getScriptProperties: () => scriptProperties,
    getUserProperties() {
      throw fail("This fake only models script properties.");
    },
    getDocumentProperties() {
      throw fail("This fake only models script properties.");
    },
  };

  /* LockService */
  const scriptLock = {
    tryLock(timeoutInMillis) {
      world.trip("LockService.tryLock");
      if (typeof timeoutInMillis !== "number") throw fail("The parameters don't match the method signature for tryLock.");
      world.lock.onRequest?.();
      if (world.lock.heldByOther) {
        world.lock.waitedMs += timeoutInMillis;
        world.clock.advance(timeoutInMillis);
        return false;
      }
      world.lock.held = true;
      world.lock.acquired += 1;
      return true;
    },
    waitLock(timeoutInMillis) {
      if (!scriptLock.tryLock(timeoutInMillis)) {
        throw fail("Lock timeout: another process was holding the lock for too long.");
      }
    },
    releaseLock() {
      if (world.lock.held) world.lock.released += 1;
      world.lock.held = false;
    },
    hasLock: () => world.lock.held,
  };
  const LockService = {
    getScriptLock: () => scriptLock,
    getUserLock: () => scriptLock,
    getDocumentLock: () => scriptLock,
  };

  /* CacheService */
  const scriptCache = {
    get(key) {
      world.trip("CacheService.get");
      const entry = world.cache.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= world.clock.now()) {
        world.cache.delete(key);
        return null;
      }
      return entry.value;
    },
    put(key, value, expirationInSeconds = 600) {
      world.trip("CacheService.put");
      if (typeof key !== "string" || key.length > 250) throw fail("Argument too large: key");
      if (typeof value !== "string") throw fail("The parameters don't match the method signature for CacheService.Cache.put.");
      if (value.length > 100 * 1024) throw fail("Argument too large: value");
      const seconds = Math.min(Math.max(1, expirationInSeconds), 21600); // six hours is the most the service keeps
      world.cache.set(key, { value, expiresAt: world.clock.now() + seconds * 1000 });
    },
    remove(key) {
      world.cache.delete(key);
    },
  };
  const CacheService = {
    getScriptCache: () => scriptCache,
    getUserCache: () => scriptCache,
    getDocumentCache: () => scriptCache,
  };

  /* ContentService */
  const MimeType = Object.freeze({ JSON: "JSON", TEXT: "TEXT", JAVASCRIPT: "JAVASCRIPT", XML: "XML", CSV: "CSV" });
  const ContentService = {
    MimeType,
    createTextOutput(content = "") {
      let text = String(content);
      let mime = MimeType.TEXT;
      const output = {
        __isTextOutput: true,
        append(more) {
          text += String(more);
          return output;
        },
        setContent(next) {
          text = String(next);
          return output;
        },
        getContent: () => text,
        setMimeType(next) {
          if (!Object.values(MimeType).includes(next)) throw fail("Invalid argument: mimeType");
          mime = next;
          return output;
        },
        getMimeType: () => mime,
      };
      return output;
    },
  };

  /* Session */
  const Session = {
    getEffectiveUser: () => ({ getEmail: () => world.session.effectiveEmail }),
    // A web app that runs as its owner and is open to anyone does not know who is calling.
    getActiveUser: () => ({ getEmail: () => (world.context === "webapp" ? "" : world.session.effectiveEmail) }),
    getScriptTimeZone: () => world.session.timeZone,
  };

  /* Utilities */
  const Utilities = {
    getUuid: () => randomUUID(),
    formatDate,
    sleep(milliseconds) {
      if (typeof milliseconds !== "number" || milliseconds < 0) throw fail("Invalid argument: milliseconds");
      world.sleptMs += milliseconds;
      world.clock.advance(milliseconds);
    },
  };

  /* Logger and console */
  const Logger = {
    log(format, ...values) {
      let index = 0;
      const text = values.length > 0 ? String(format).replace(/%s/g, () => String(values[index++])) : String(format);
      world.logger.push(text);
      return Logger;
    },
    getLog: () => world.logger.join("\n"),
    clear() {
      world.logger.length = 0;
    },
  };
  const write = (level) => (...args) => {
    world.console.push({ level, text: args.map(String).join(" ") });
  };
  const fakeConsole = { log: write("log"), info: write("info"), warn: write("warn"), error: write("error") };

  /* Date: the script's clock is the world's clock, so tests can move through an hour in an instant. */
  class ScriptDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(world.clock.now());
      else super(...args);
    }
    static now() {
      return world.clock.now();
    }
  }

  return {
    SpreadsheetApp,
    MailApp,
    PropertiesService,
    LockService,
    CacheService,
    ContentService,
    Session,
    Utilities,
    Logger,
    console: fakeConsole,
    Date: ScriptDate,
  };
}
