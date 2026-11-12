/**
 * Loads Code.gs into a fresh node:vm sandbox whose globals are the fakes in apps-script-fakes.mjs,
 * the way Apps Script loads a project: every top-level function becomes a global.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createWorld } from "./apps-script-fakes.mjs";

export const CODE_PATH = fileURLToPath(new URL("../../Code.gs", import.meta.url));
const SOURCE = readFileSync(CODE_PATH, "utf8");

export const SECRET = "test-secret-0123456789abcdef0123456789abcdef";

export const BUSINESS = {
  name: "Hibana (sample concept)",
  phone: "(785) 555-0142",
  address: "100 Sample Street, Topeka, KS 66603",
};

/** The Script Properties of an installed inbox, as setup plus the owner would leave them. */
export function installedProperties(overrides = {}) {
  return {
    INBOX_SECRET: SECRET,
    KINDS: "catering,contact,lead",
    OWNER_EMAIL: "owner@restaurant.example",
    BUSINESS_NAME: BUSINESS.name,
    BUSINESS_PHONE: BUSINESS.phone,
    BUSINESS_ADDRESS: BUSINESS.address,
    HOURLY_LIMIT: "20",
    PAUSED: "no",
    ...overrides,
  };
}

/**
 * Returns { world, script, post, get, run }.
 *   post(bodyOrString) -> { reply, mime }   calls doPost as the web app would
 *   run(name)          -> calls a function from the editor's Run list
 */
export function loadScript(options = {}) {
  const world = createWorld({ ...options, properties: options.properties ?? installedProperties() });
  const context = vm.createContext({ ...world.globals });
  vm.runInContext(SOURCE, context, { filename: "Code.gs" });

  function asWebApp(fn) {
    world.context = "webapp";
    try {
      return fn();
    } finally {
      world.context = "editor";
    }
  }

  function post(body) {
    const contents = typeof body === "string" ? body : JSON.stringify(body);
    const output = asWebApp(() => context.doPost({ postData: { contents, type: "application/json", length: contents.length } }));
    return { reply: JSON.parse(output.getContent()), mime: output.getMimeType(), text: output.getContent() };
  }

  function get() {
    const output = asWebApp(() => context.doGet({ parameter: {} }));
    return { reply: JSON.parse(output.getContent()), mime: output.getMimeType(), text: output.getContent() };
  }

  function run(name) {
    world.context = "editor";
    const result = context[name]();
    // Results built inside the sandbox belong to another realm; copy them out as plain data.
    return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
  }

  function tab(name) {
    return world.spreadsheet.getSheetByName(name);
  }

  return { world, script: context, post, get, run, tab };
}
