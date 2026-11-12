/**
 * The request side: the real deliverGoogle driver (apps/restaurant/src/lib/inbox/drivers/google.ts)
 * against a local HTTP server that imitates an Apps Script web app, including the 302 redirect
 * Google answers a POST with before handing over the result.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { deliverGoogle } from "../../../apps/restaurant/src/lib/inbox/drivers/google.ts";
import { loadScript, SECRET } from "./support/load-code.mjs";
import { SAMPLES } from "./support/samples.mjs";

let server;
let base;
let mode = "script";
let posts = 0;
let script;
const results = new Map();

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, base);
    if (req.method === "POST" && url.pathname === "/macros/s/TEST/exec") {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        posts += 1;
        if (mode === "hang") return; // never answers
        if (mode === "html") {
          res.writeHead(200, { "Content-Type": "text/html" });
          return res.end("<!DOCTYPE html><html><body>Sorry, unable to open the file at this time.</body></html>");
        }
        // Run the real Code.gs on the body, then answer the way Google does: a redirect to the result.
        const output = script.post(raw);
        const key = String(posts);
        results.set(key, output.text);
        res.writeHead(302, { Location: `/macros/echo?user_content_key=${key}` });
        res.end();
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/macros/echo") {
      const text = results.get(url.searchParams.get("user_content_key") ?? "");
      res.writeHead(text ? 200 : 404, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(text ?? "{}");
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

function reset(newMode) {
  mode = newMode;
  posts = 0;
  script = loadScript();
}

const URL_PATH = () => `${base}/macros/s/TEST/exec`;

test("success: follows the 302, gets { ok: true }, and the row and emails exist", async () => {
  reset("script");
  const result = await deliverGoogle(SAMPLES.catering, URL_PATH(), SECRET);
  assert.deepEqual(result, { ok: true, driver: "google" });
  assert.equal(posts, 1);
  assert.equal(script.tab("Catering inquiries").table().rows.length, 1);
  assert.equal(script.world.mail.sent.length, 2);
});

test("refusal: a wrong secret is reported with the script's reason and not retried", async () => {
  reset("script");
  const result = await deliverGoogle(SAMPLES.contact, URL_PATH(), "wrong-secret");
  assert.equal(result.ok, false);
  assert.match(result.error, /secret did not match/);
  assert.equal(posts, 1);
  assert.equal(script.world.mail.attempts, 0);
});

test("an HTML page instead of JSON is a failure, retried once", async () => {
  reset("html");
  const result = await deliverGoogle(SAMPLES.contact, URL_PATH(), SECRET);
  assert.equal(result.ok, false);
  assert.match(result.error, /not JSON \(HTTP 200\)/);
  assert.equal(posts, 2);
});

test("a timeout is a failure, retried once", async () => {
  reset("hang");
  // The driver waits 12 seconds per attempt. The same driver is used with a shorter abort signal
  // so the test takes well under a second; everything else is unchanged.
  const shortTimeout = (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(300) });
  const result = await deliverGoogle(SAMPLES.contact, URL_PATH(), SECRET, shortTimeout);
  assert.equal(result.ok, false);
  assert.match(result.error, /timeout|aborted/i);
  assert.equal(posts, 2);
});

test("a retry after a lost answer is recorded once (idempotent on the reference)", async () => {
  reset("script");
  let calls = 0;
  // First attempt reaches the script but the answer is lost on the way back.
  const flaky = async (url, init) => {
    calls += 1;
    const response = await fetch(url, init);
    if (calls === 1) throw new Error("socket hang up");
    return response;
  };
  const result = await deliverGoogle(SAMPLES.lead, URL_PATH(), SECRET, flaky);
  assert.deepEqual(result, { ok: true, driver: "google" });
  assert.equal(posts, 2);
  assert.equal(script.tab("Leads").table().rows.length, 1);
  assert.equal(script.world.mail.sent.length, 2);
});
