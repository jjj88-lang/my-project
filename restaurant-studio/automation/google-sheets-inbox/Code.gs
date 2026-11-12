/**
 * @OnlyCurrentDoc
 *
 * WEBSITE INBOX
 * =============
 * Receives inquiries from a website form and keeps them in the Google Sheet this script is
 * attached to. For every inquiry it does three things, in this order:
 *
 *   1. Adds a row to the Sheet, with the status "New".
 *   2. Emails the owner the details. Replying to that email answers the customer.
 *   3. Sends the customer a short note saying the request arrived.
 *
 * It never confirms a booking, a date, availability or a price. A person does that.
 *
 * HOW TO INSTALL (the full walkthrough is in README.md)
 *   1. Open the Google Sheet, then Extensions > Apps Script. Paste this whole file. Save.
 *   2. Choose "setup" in the function list at the top and press Run. Approve the permissions.
 *   3. In Project Settings > Script Properties, fill in BUSINESS_NAME, BUSINESS_PHONE and
 *      BUSINESS_ADDRESS.
 *   4. Run "testSubmission". Check the new row and the two emails.
 *   5. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *   6. Give the website the web app URL and the secret that setup printed.
 *
 * FUNCTIONS YOU CAN RUN FROM THE LIST AT THE TOP OF THE EDITOR
 *   setup            First-time setup for a restaurant. Safe to run again: it only fills gaps.
 *   setupStudio      The same, for the studio's own lead inbox (one "Leads" tab).
 *   testSubmission   Sends one clearly fake inquiry through the whole path, to your own address.
 *   pauseInbox       Stops accepting inquiries. The website then asks visitors to call.
 *   resumeInbox      Accepts inquiries again.
 *   rotateSecret     Makes a new secret. The old one keeps working until retireOldSecret.
 *   retireOldSecret  Switches the old secret off, once the website uses the new one.
 *
 * The "@OnlyCurrentDoc" line at the top limits this script to the one Sheet it is attached to.
 * It cannot open the account's other spreadsheets.
 *
 * This script has been tested in a simulated Apps Script environment (see TESTING.md).
 * Run the live checklist in README.md after every install and after every change.
 */

var SCRIPT_VERSION = "1.0.0";

/* ============================================================================================
 * CONFIG
 * The wording of the customer's note and the names of the tabs live here.
 *
 * The websites show a preview of these same emails on their sample pages, built from
 * apps/restaurant/src/lib/inbox/messages.ts. A test compares the two, character for character.
 * If you change wording here, change it there too, and keep the rule: the note says the request
 * arrived and promises nothing else.
 * ========================================================================================== */

var CONFIG = {
  // One entry per kind of form. "sheet" is the name of the tab. "ack" is the customer's note.
  // Placeholders: {firstName} {business} {phone} {address} {ackSummary} {id}
  KINDS: {
    catering: {
      sheet: "Catering inquiries",
      ack: {
        subject: "We received your catering request | {business}",
        body: [
          "Hi {firstName},",
          "",
          "Thank you for thinking of {business}. We received your catering request{ackSummary}.",
          "",
          "This note only lets you know that your request arrived. It is not a confirmation of your event, availability or pricing. Someone from our team will review the details and contact you to talk through options and a quote.",
          "",
          "If your event is coming up soon, or anything changes, please call us at {phone}.",
          "",
          "Reference: {id}",
          "",
          "{business}",
          "{address}",
          "{phone}"
        ]
      }
    },
    contact: {
      sheet: "Messages",
      ack: {
        subject: "We received your message | {business}",
        body: [
          "Hi {firstName},",
          "",
          "Thank you for writing to {business}. Your message arrived, and we will reply as soon as we can.",
          "",
          "For same-day reservations or anything urgent, please call us at {phone}.",
          "",
          "Reference: {id}",
          "",
          "{business}",
          "{address}",
          "{phone}"
        ]
      }
    },
    lead: {
      sheet: "Leads",
      ack: {
        subject: "Thanks for reaching out | {business}",
        body: [
          "Hi {firstName},",
          "",
          "Thank you for contacting {business}. Your request arrived, and I will reply personally, usually within one business day.",
          "",
          "Nothing is booked or owed at this point. If it is easier to talk, call or text {phone}.",
          "",
          "Reference: {id}",
          "",
          "{business}",
          "{phone}"
        ]
      }
    }
  },

  // The first three columns of every tab, and the two at the end that record the emails.
  COLUMNS: {
    received: "Received",
    reference: "Reference",
    status: "Status",
    ownerEmail: "Email to owner",
    customerEmail: "Note to customer"
  },

  // Offered as a dropdown in the Status column. New rows start with the first one.
  STATUSES: ["New", "Contacted", "Quoted", "Booked", "Declined"],

  // What the two email columns can say.
  MARKERS: {
    sent: "Sent",
    pending: "Not sent yet",
    notSent: "Email not sent: "
  },

  // What the email to the owner says about the customer's note. The first line is the normal
  // case and must match messages.ts. The others replace it when the note did not go out, so the
  // owner is never told something that did not happen.
  OWNER_NOTES: {
    sent: "Nothing has been confirmed with the customer. They were sent an automatic note saying their request arrived and that you will follow up.",
    address: "Nothing has been confirmed with the customer. No automatic note was sent, because the email address they gave does not look valid. They have not heard from you yet.",
    details: "Nothing has been confirmed with the customer. No automatic note was sent, because the business name, phone or address is missing in this script's settings. They have not heard from you yet.",
    daily: "Nothing has been confirmed with the customer. No automatic note was sent, because your Google account reached its daily email limit. They have not heard from you yet."
  },

  // The matching text for the "Note to customer" column.
  ACK_PROBLEMS: {
    address: "address looks invalid",
    details: "business details missing in script settings",
    daily: "daily email limit reached"
  },

  // Used when a Script Property is missing. setup writes these in for you.
  DEFAULTS: {
    kinds: "catering,contact",
    studioKinds: "lead",
    hourlyLimit: 20
  },

  // Anything bigger or stranger than this is refused before it reaches the Sheet.
  LIMITS: {
    bodyChars: 60000,
    fields: 30,
    labelChars: 100,
    valueChars: 5000,
    nameChars: 120,
    emailChars: 254,
    lineChars: 200,
    shortLineChars: 60,
    ackSummaryChars: 120,
    secretChars: 24,
    ownerAddresses: 5
  },

  SENDER_NAME: "Website inquiries",
  LOCK_WAIT_MS: 8000,
  EXTRA_ROWS: 200,
  NOT_SENT_COLOR: "#fce8e6"
};

/* ============================================================================================
 * TEST INQUIRIES
 * What testSubmission sends. The labels match the forms on the websites, so a test row uses the
 * same columns as a real inquiry. One value starts with "=" and one with "+" on purpose: both
 * must show in the Sheet as plain text.
 * Placeholders: {name} {email} {date}
 * ========================================================================================== */

var TEST_PROBE = "=1+1 This is a test sent from the script editor. It is not a real inquiry. This cell starts with a formula on purpose: it must show as plain text, never as the number 2.";

var TEST_INQUIRIES = {
  catering: {
    kindLabel: "Catering inquiry (test)",
    guests: 25,
    fields: [
      ["Your name", "{name}"],
      ["Email", "{email}"],
      ["Phone", "+1 (555) 555-0100"],
      ["Event date", "{date}"],
      ["Number of guests", "25"],
      ["Type of service", "Test only"],
      ["Approximate start time", ""],
      ["Budget", ""],
      ["Event address", ""],
      ["Anything else we should know?", TEST_PROBE]
    ]
  },
  contact: {
    kindLabel: "Website message (test)",
    fields: [
      ["Your name", "{name}"],
      ["Email", "{email}"],
      ["Phone", "+1 (555) 555-0100"],
      ["What is this about?", "General question"],
      ["Message", TEST_PROBE]
    ]
  },
  lead: {
    kindLabel: "Website lead (test)",
    fields: [
      ["Your name", "{name}"],
      ["Restaurant name", "Test Restaurant (not a real request)"],
      ["Email", "{email}"],
      ["Phone", "+1 (555) 555-0100"],
      ["City and state", "Topeka, KS"],
      ["Current website", ""],
      ["What do you need?", "Not sure yet"],
      ["Best way to reach you", "Email"],
      ["Anything else?", TEST_PROBE]
    ]
  }
};

/* ============================================================================================
 * THE WEB APP
 * ========================================================================================== */

/**
 * Answers a plain visit to the web app URL. It shows that the script is deployed and which
 * version is live. It reveals nothing about the Sheet, the settings or any inquiry.
 */
function doGet() {
  return json_({ ok: true, service: "website-inbox", script: SCRIPT_VERSION });
}

/**
 * Receives one inquiry from the website. The answer is always JSON:
 *   { ok: true, duplicate: false, ... }   recorded
 *   { ok: true, duplicate: true }         already recorded earlier, nothing was sent again
 *   { ok: false, code: "...", error: "..." }   refused, and nothing was recorded
 */
function doPost(e) {
  var reply;
  try {
    reply = handlePost_(e);
  } catch (err) {
    note_("Unexpected error: " + describe_(err));
    reply = refuse_("error", "The inbox script hit an unexpected error. See the script's execution log.");
  }
  return json_(reply);
}

function handlePost_(e) {
  var raw = e && e.postData && typeof e.postData.contents === "string" ? e.postData.contents : "";
  if (raw === "") return refuse_("no_body", "The request had no body.");
  if (raw.length > CONFIG.LIMITS.bodyChars) {
    return refuse_("too_large", "The request is larger than this inbox accepts.");
  }

  var body;
  try {
    body = JSON.parse(raw);
  } catch (err) {
    return refuse_("bad_json", "The request body is not valid JSON.");
  }
  if (!isRecord_(body)) return refuse_("bad_json", "The request body must be a JSON object.");

  // The secret comes first. A caller who does not know it gets no further than this, and the
  // script has touched neither the Sheet nor the mailbox by then.
  var props = PropertiesService.getScriptProperties().getProperties();
  var secrets = secretsFrom_(props);
  if (secrets.secret === "") {
    return refuse_("not_set_up", "This inbox has not been set up yet. Open the script editor and run setup.");
  }
  if (!secretMatches_(body.secret, secrets)) {
    return refuse_("unauthorized", "The secret did not match. Check INBOX_GOOGLE_SECRET in the website's hosting settings.");
  }
  var settings = settingsFrom_(props);
  if (body.version !== 1) {
    return refuse_("unsupported_version", "This inbox understands version 1 requests only. The script may need an update.");
  }
  if (settings.paused) {
    return refuse_("paused", "This inbox is paused. Run resumeInbox in the script editor to accept inquiries again.");
  }

  var checked = checkSubmission_(body, settings);
  if (!checked.ok) return refuse_(checked.code, checked.error);

  // One inquiry at a time. Two that arrive together cannot land on the same row, and a
  // retry of the same inquiry waits here until the first attempt has finished.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.LOCK_WAIT_MS)) {
    return refuse_("busy", "The inbox was busy with other inquiries. Nothing was recorded for this one.");
  }
  try {
    return process_(checked.submission, settings);
  } finally {
    try {
      SpreadsheetApp.flush();
    } catch (ignore) {}
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

function process_(s, settings) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    return refuse_("no_sheet", "This script is not attached to a Google Sheet. Create it from the Sheet: Extensions, then Apps Script.");
  }

  var saved = saveRow_(ss, s);
  if (saved.duplicate) return { ok: true, duplicate: true };

  // The inquiry is now safely in the Sheet. From here on, a problem with email must never
  // undo that or turn the answer into a failure.
  var sent = { owner: CONFIG.MARKERS.pending, customer: CONFIG.MARKERS.pending };
  try {
    sendEmails_(ss, s, settings, sent);
  } catch (err) {
    note_("Emails for " + s.id + " stopped early: " + describe_(err));
  }
  if (sent.owner === CONFIG.MARKERS.pending) sent.owner = notSent_("error");
  if (sent.customer === CONFIG.MARKERS.pending) sent.customer = notSent_("error");

  try {
    markEmails_(saved, sent);
  } catch (err) {
    note_("Could not update the email columns for " + s.id + ": " + describe_(err));
  }
  return { ok: true, duplicate: false, ownerEmail: sent.owner, customerEmail: sent.customer };
}

/* ============================================================================================
 * FUNCTIONS TO RUN BY HAND
 * ========================================================================================== */

/** First-time setup for a restaurant: a tab for catering inquiries and a tab for messages. */
function setup() {
  return install_("");
}

/** First-time setup for the studio's own lead inbox: one "Leads" tab. */
function setupStudio() {
  return install_(CONFIG.DEFAULTS.studioKinds);
}

function install_(kinds) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("This script is not attached to a Google Sheet. Open the Sheet, choose Extensions > Apps Script, and paste the script there.");
  }

  var store = PropertiesService.getScriptProperties();
  var props = store.getProperties();

  var secretIsNew = text_(props.INBOX_SECRET).length < CONFIG.LIMITS.secretChars;
  if (secretIsNew) store.setProperty("INBOX_SECRET", newSecret_());

  if (kinds !== "") {
    store.setProperty("KINDS", kinds);
  } else if (text_(props.KINDS) === "") {
    store.setProperty("KINDS", CONFIG.DEFAULTS.kinds);
  }

  // Existing values are never overwritten, so running setup again is safe.
  var ownAddress = "";
  try {
    ownAddress = text_(Session.getEffectiveUser().getEmail());
  } catch (ignore) {}
  var defaults = [
    ["OWNER_EMAIL", ownAddress],
    ["BUSINESS_NAME", ""],
    ["BUSINESS_PHONE", ""],
    ["BUSINESS_ADDRESS", ""],
    ["HOURLY_LIMIT", String(CONFIG.DEFAULTS.hourlyLimit)],
    ["PAUSED", "no"]
  ];
  for (var i = 0; i < defaults.length; i++) {
    if (typeof props[defaults[i][0]] !== "string") store.setProperty(defaults[i][0], defaults[i][1]);
  }

  var settings = readSettings_();
  var tabs = [];
  for (var k = 0; k < settings.kinds.length; k++) {
    var name = CONFIG.KINDS[settings.kinds[k]].sheet;
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    ensureColumns_(sheet, []);
    tabs.push(name);
  }
  SpreadsheetApp.flush();

  var missing = [];
  for (var m = 0; m < settings.kinds.length; m++) {
    var needs = missingForAck_(settings.kinds[m], settings.business);
    for (var n = 0; n < needs.length; n++) {
      if (missing.indexOf(needs[n]) === -1) missing.push(needs[n]);
    }
  }

  var lines = [
    "Website inbox, script version " + SCRIPT_VERSION,
    "Sheet: " + ss.getName(),
    "Tabs ready: " + tabs.join(", "),
    "Inquiries are emailed to: " + (settings.ownerEmails.length > 0 ? settings.ownerEmails.join(", ") : "NOBODY YET. Set OWNER_EMAIL."),
    "Hourly limit: " + settings.hourlyLimit + " inquiries",
    settings.paused ? "The inbox is PAUSED. Run resumeInbox to accept inquiries." : "The inbox is accepting inquiries.",
    "",
    "STILL TO DO"
  ];
  var step = 1;
  if (missing.length > 0) {
    lines.push(step + ". Fill in " + missing.join(", ") + ". Open Project Settings (the gear), then Script Properties. Until then customers get no note.");
    step++;
  }
  lines.push(step + ". Run testSubmission. Check the new row and the two emails.");
  step++;
  lines.push(step + ". Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the web app URL.");
  step++;
  lines.push(step + ". Put these two values in the website's hosting settings (environment variables), then redeploy the website:");
  lines.push("");
  lines.push("INBOX_GOOGLE_URL = the web app URL from the deploy step. It ends in /exec.");
  lines.push("INBOX_GOOGLE_SECRET = " + settings.secret);
  lines.push("");
  lines.push(secretIsNew ? "The secret above is new. Treat it like a password." : "The secret above was already set. It has not changed. Treat it like a password.");
  if (settings.previousSecret !== "") {
    lines.push("An older secret is still accepted. Run retireOldSecret once the website uses the new one.");
  }
  say_(lines);

  return { tabs: tabs, kinds: settings.kinds, secretIsNew: secretIsNew, missing: missing };
}

/**
 * Sends one clearly fake inquiry through the whole path: the same checks, the same row, the same
 * two emails. Both emails go to the owner's own address. Delete the test row afterwards.
 */
function testSubmission() {
  var settings = readSettings_();
  if (settings.secret === "") throw new Error("Run setup first. This inbox has no secret yet.");
  if (settings.ownerEmails.length === 0) {
    throw new Error("Set OWNER_EMAIL first: Project Settings, then Script Properties.");
  }
  if (settings.paused) {
    say_(["The inbox is paused, so the test was not sent. Run resumeInbox, then run testSubmission again."]);
    return { ok: false, code: "paused" };
  }

  var kind = settings.kinds[0];
  var test = TEST_INQUIRIES[kind];
  var owner = settings.ownerEmails[0];
  var now = new Date();
  var zone = Session.getScriptTimeZone();
  var eventDay = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  var vars = {
    name: "Test Customer",
    email: owner,
    date: Utilities.formatDate(eventDay, zone, "yyyy-MM-dd")
  };

  var fields = [];
  for (var i = 0; i < test.fields.length; i++) {
    fields.push({ label: test.fields[i][0], value: fill_(test.fields[i][1], vars) });
  }

  var id = "TEST-" + Utilities.formatDate(now, zone, "yyyyMMdd") + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 4).toUpperCase();
  var ackSummary = "";
  if (kind === "catering") {
    ackSummary = " for " + Utilities.formatDate(eventDay, zone, "EEEE, MMMM d, yyyy") + " (" + test.guests + " guests)";
  }

  var request = {
    version: 1,
    secret: settings.secret,
    id: id,
    kind: kind,
    kindLabel: test.kindLabel,
    submittedAt: now.toISOString(),
    submittedAtLocal: Utilities.formatDate(now, zone, "EEE, MMM d, yyyy 'at' h:mm a"),
    source: "the script editor",
    customer: { name: vars.name, email: owner },
    summary: "TEST ONLY, not a real inquiry",
    ackSummary: ackSummary,
    fields: fields
  };

  // The test goes through doPost, exactly as a request from the website does.
  var answer = JSON.parse(doPost({ postData: { contents: JSON.stringify(request), type: "application/json" } }).getContent());
  var tab = CONFIG.KINDS[kind].sheet;

  if (answer.ok !== true) {
    say_([
      "The test inquiry was REFUSED, and nothing was recorded.",
      "Reason: " + answer.error,
      "Fix that, then run testSubmission again."
    ]);
    return answer;
  }

  say_([
    "Test inquiry " + id + " went through.",
    "Row: added to the \"" + tab + "\" tab, with the status New.",
    CONFIG.COLUMNS.ownerEmail + ": " + answer.ownerEmail,
    CONFIG.COLUMNS.customerEmail + ": " + answer.customerEmail,
    "",
    "NOW CHECK",
    "1. The new row in the \"" + tab + "\" tab. The cell that begins with =1+1 must show as text, not as 2. The phone number must show as typed.",
    "2. Two emails at " + owner + ": the inquiry, and the customer's note. Look in spam too.",
    "3. The customer's note promises nothing: no date, no price, no availability.",
    "Then delete the test row.",
    "",
    "Emails your Google account can still send today: " + emailBudgetText_()
  ]);
  return answer;
}

/** Stops accepting inquiries. The website tells visitors it could not send and asks them to call. */
function pauseInbox() {
  PropertiesService.getScriptProperties().setProperty("PAUSED", "yes");
  say_([
    "The inbox is paused. New inquiries are refused, and nothing is recorded or emailed.",
    "The form on the website will tell visitors it could not send their request and ask them to call.",
    "Run resumeInbox to accept inquiries again."
  ]);
}

/** Accepts inquiries again after pauseInbox. */
function resumeInbox() {
  PropertiesService.getScriptProperties().setProperty("PAUSED", "no");
  say_(["The inbox is accepting inquiries again. Send a test through the website form to be sure."]);
}

/**
 * Makes a new secret. The old one keeps working, so the website's form does not break while you
 * update its hosting settings. Run retireOldSecret when the website uses the new one.
 */
function rotateSecret() {
  var store = PropertiesService.getScriptProperties();
  var current = text_(store.getProperty("INBOX_SECRET"));
  var next = newSecret_();
  if (current.length >= CONFIG.LIMITS.secretChars) store.setProperty("INBOX_SECRET_PREVIOUS", current);
  store.setProperty("INBOX_SECRET", next);
  say_([
    "A new secret is ready. The old one still works for now.",
    "1. In the website's hosting settings, set:",
    "",
    "INBOX_GOOGLE_SECRET = " + next,
    "",
    "2. Redeploy the website and send one test inquiry through its form.",
    "3. Run retireOldSecret. After that the old secret is refused."
  ]);
}

/** Switches off the secret that rotateSecret replaced. */
function retireOldSecret() {
  PropertiesService.getScriptProperties().deleteProperty("INBOX_SECRET_PREVIOUS");
  say_(["The old secret no longer works. Only the current INBOX_SECRET is accepted."]);
}

/* ============================================================================================
 * CHECKING A REQUEST
 * Names that end with an underscore are internal. Apps Script keeps them out of the Run list.
 * ========================================================================================== */

/**
 * Checks every part of a request and returns a clean copy with only the parts this script uses.
 * Anything missing, of the wrong type, too long or oddly shaped is refused. Values are never
 * repaired here: the website validates what visitors type, and this is the second lock.
 */
function checkSubmission_(body, settings) {
  var L = CONFIG.LIMITS;

  if (typeof body.id !== "string" || !/^[A-Z]{2,8}-[0-9]{8}-[A-Z0-9]{4,8}$/.test(body.id)) {
    return invalid_("the reference is not in the expected format");
  }
  if (typeof body.kind !== "string" || !own_(CONFIG.KINDS, body.kind)) {
    return { ok: false, code: "unknown_kind", error: "This inbox does not know that kind of form." };
  }
  if (settings.kinds.indexOf(body.kind) === -1) {
    return { ok: false, code: "kind_not_enabled", error: "This inbox is not set up for that kind of form. See the KINDS script property." };
  }
  if (!isLine_(body.kindLabel, 1, L.shortLineChars)) return invalid_("kindLabel is missing or too long");
  if (typeof body.submittedAt !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$/.test(body.submittedAt)) {
    return invalid_("submittedAt is not a time in ISO format");
  }
  if (!isLine_(body.submittedAtLocal, 1, L.shortLineChars)) return invalid_("submittedAtLocal is missing or too long");
  if (!isLine_(body.source, 1, L.lineChars)) return invalid_("source is missing or too long");
  if (!isRecord_(body.customer)) return invalid_("customer is missing");
  if (!isLine_(body.customer.name, 1, L.nameChars)) return invalid_("the customer's name is missing or too long");
  if (!isAddressShaped_(body.customer.email)) return invalid_("the customer's email address is missing or malformed");
  if (!isLine_(body.summary, 0, L.lineChars)) return invalid_("summary is not a single line of text");
  if (!isAckSummary_(body.ackSummary)) return invalid_("ackSummary contains something other than a short date and count");
  if (!Array.isArray(body.fields) || body.fields.length < 1 || body.fields.length > L.fields) {
    return invalid_("fields must be a list of 1 to " + L.fields + " entries");
  }

  var reserved = [];
  for (var key in CONFIG.COLUMNS) {
    if (own_(CONFIG.COLUMNS, key)) reserved.push(CONFIG.COLUMNS[key].toLowerCase());
  }
  var seen = [];
  var fields = [];
  for (var i = 0; i < body.fields.length; i++) {
    var field = body.fields[i];
    var n = i + 1;
    if (!isRecord_(field)) return invalid_("field " + n + " is not an object");
    if (!isLabel_(field.label)) return invalid_("field " + n + " has a label this inbox does not accept");
    var lower = field.label.toLowerCase();
    if (reserved.indexOf(lower) !== -1) return invalid_("field " + n + " uses a column name the inbox keeps for itself");
    if (seen.indexOf(lower) !== -1) return invalid_("field " + n + " repeats an earlier label");
    seen.push(lower);
    if (!isValue_(field.value)) return invalid_("field " + n + " has a value that is not text or is too long");
    fields.push({ label: field.label, value: field.value });
  }

  return {
    ok: true,
    submission: {
      id: body.id,
      kind: body.kind,
      kindLabel: body.kindLabel,
      submittedAt: body.submittedAt,
      submittedAtLocal: body.submittedAtLocal,
      source: body.source,
      customer: { name: body.customer.name, email: body.customer.email },
      summary: body.summary,
      ackSummary: body.ackSummary,
      fields: fields
    }
  };
}

function invalid_(what) {
  return { ok: false, code: "invalid", error: "The inquiry was refused: " + what + "." };
}

/** One line of text of a sensible length, with no control characters or line breaks. */
function isLine_(value, min, max) {
  return typeof value === "string" && value.length >= min && value.length <= max && !/[\u0000-\u001F\u007F  ]/.test(value);
}

/** A column heading: one line, no spaces at the ends, and nothing a spreadsheet reads as a formula. */
function isLabel_(value) {
  return isLine_(value, 1, CONFIG.LIMITS.labelChars) && value === value.trim() && !/^[=+\-@']/.test(value);
}

/** What a visitor typed. Line breaks and tabs are fine. Other control characters are not. */
function isValue_(value) {
  return typeof value === "string" && value.length <= CONFIG.LIMITS.valueChars && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

/** The same loose shape the websites accept. It is recorded, but see isSendable_ below. */
function isAddressShaped_(value) {
  return typeof value === "string" && value.length <= CONFIG.LIMITS.emailChars && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && !/[\u0000-\u001F\u007F]/.test(value);
}

/**
 * The stricter test an address must pass before this script will send to it or use it as a
 * Reply-To: plain letters, digits and the usual punctuation, exactly one address.
 */
function isSendable_(value) {
  return typeof value === "string" && value.length <= CONFIG.LIMITS.emailChars &&
    /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/.test(value);
}

/**
 * The website builds ackSummary from a validated date and a number, for example
 * " for Saturday, December 12, 2026 (40 guests)". It goes into the customer's note, so nothing
 * that could form a link, an address or markup is allowed in it.
 */
function isAckSummary_(value) {
  return typeof value === "string" && value.length <= CONFIG.LIMITS.ackSummaryChars &&
    !/[\u0000-\u001F\u007F  \/\\@.<>\[\]{}=&%#?!";_*~^|$+`]/.test(value);
}

function isRecord_(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function own_(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/* ============================================================================================
 * SETTINGS AND THE SECRET
 * ========================================================================================== */

function readSettings_() {
  return settingsFrom_(PropertiesService.getScriptProperties().getProperties());
}

/** The current secret and, during a rotation, the one before it. Too short counts as not set. */
function secretsFrom_(props) {
  var min = CONFIG.LIMITS.secretChars;
  var secret = text_(props.INBOX_SECRET);
  var previous = text_(props.INBOX_SECRET_PREVIOUS);
  return {
    secret: secret.length >= min ? secret : "",
    previousSecret: previous.length >= min ? previous : ""
  };
}

function settingsFrom_(props) {
  var secrets = secretsFrom_(props);

  var kinds = [];
  var wanted = text_(props.KINDS).toLowerCase().split(/[\s,;]+/);
  for (var i = 0; i < wanted.length; i++) {
    if (wanted[i] !== "" && own_(CONFIG.KINDS, wanted[i]) && kinds.indexOf(wanted[i]) === -1) kinds.push(wanted[i]);
  }
  if (kinds.length === 0) kinds = CONFIG.DEFAULTS.kinds.split(",");

  var limit = parseInt(text_(props.HOURLY_LIMIT), 10);
  if (!(limit >= 1)) limit = CONFIG.DEFAULTS.hourlyLimit;

  return {
    secret: secrets.secret,
    previousSecret: secrets.previousSecret,
    kinds: kinds,
    hourlyLimit: limit,
    paused: /^(yes|true|on|1)$/i.test(text_(props.PAUSED)),
    ownerEmails: ownerEmails_(props.OWNER_EMAIL),
    business: {
      name: oneLine_(props.BUSINESS_NAME),
      phone: oneLine_(props.BUSINESS_PHONE),
      address: oneLine_(props.BUSINESS_ADDRESS)
    }
  };
}

/** OWNER_EMAIL may list a few addresses, separated by commas. With none set, the script's own account is used. */
function ownerEmails_(value) {
  var list = [];
  var parts = text_(value).split(/[\s,;]+/);
  for (var i = 0; i < parts.length; i++) {
    if (isSendable_(parts[i]) && list.indexOf(parts[i]) === -1) list.push(parts[i]);
  }
  if (list.length === 0) {
    var own = "";
    try {
      own = text_(Session.getEffectiveUser().getEmail());
    } catch (ignore) {}
    if (isSendable_(own)) list.push(own);
  }
  return list.slice(0, CONFIG.LIMITS.ownerAddresses);
}

/**
 * True when the secret in the request is the stored one. While a rotation is in progress the
 * previous secret is accepted too.
 */
function secretMatches_(given, settings) {
  var candidate = typeof given === "string" && given.length <= 256 ? given : "";
  var hit = sameText_(candidate, settings.secret) ? 1 : 0;
  if (settings.previousSecret !== "") {
    hit = hit | (sameText_(candidate, settings.previousSecret) ? 1 : 0);
  }
  return hit === 1 && candidate !== "";
}

/**
 * Compares two strings without stopping at the first difference. Every character is looked at
 * every time, so how long the comparison takes says nothing about how much of a guess was right.
 */
function sameText_(a, b) {
  var difference = a.length ^ b.length;
  var length = Math.max(a.length, b.length);
  for (var i = 0; i < length; i++) {
    difference = difference | ((a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0));
  }
  return difference === 0;
}

/** 64 random characters from Google's UUID generator (two random UUIDs, about 240 random bits). */
function newSecret_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
}

/* ============================================================================================
 * THE SHEET
 * ========================================================================================== */

/**
 * Adds the inquiry as a new row, unless its reference is already in the tab.
 * A passing fault in Google Sheets gets one more try. A row is never written twice.
 */
function saveRow_(ss, s) {
  var state = { wrote: false, sheet: null, header: null };
  try {
    return writeRow_(ss, s, state);
  } catch (err) {
    if (state.wrote) {
      // The row may have reached the Sheet before the error. Look first.
      var row = findReference_(state.sheet, state.header, s.id);
      if (row > 0) return { duplicate: false, sheet: state.sheet, header: state.header, row: row };
    }
    note_("Recording " + s.id + " failed once: " + describe_(err) + ". Trying again.");
    Utilities.sleep(500);
    state.wrote = false;
    return writeRow_(ss, s, state);
  }
}

function writeRow_(ss, s, state) {
  var C = CONFIG.COLUMNS;
  var name = CONFIG.KINDS[s.kind].sheet;
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  var labels = [];
  for (var i = 0; i < s.fields.length; i++) labels.push(s.fields[i].label);
  var header = ensureColumns_(sheet, labels);
  state.sheet = sheet;
  state.header = header;

  if (findReference_(sheet, header, s.id) > 0) return { duplicate: true };

  var cells = [
    [C.received, safeCell_(s.submittedAtLocal)],
    [C.reference, s.id],
    [C.status, CONFIG.STATUSES[0]]
  ];
  for (var f = 0; f < s.fields.length; f++) cells.push([s.fields[f].label, safeCell_(s.fields[f].value)]);
  cells.push([C.ownerEmail, CONFIG.MARKERS.pending]);
  cells.push([C.customerEmail, CONFIG.MARKERS.pending]);

  // The row covers every column this inbox owns. Columns the owner added further right are left alone.
  var width = 0;
  for (var c = 0; c < cells.length; c++) width = Math.max(width, header.indexOf(cells[c][0]) + 1);
  var values = [];
  for (var v = 0; v < width; v++) values.push("");
  for (var p = 0; p < cells.length; p++) values[header.indexOf(cells[p][0])] = cells[p][1];

  var row = Math.max(sheet.getLastRow(), 1) + 1;
  fitSheet_(sheet, row, width);

  // Plain text first, then the values: nothing a visitor typed is ever read as a formula,
  // a date or a number, whatever it looks like.
  var range = sheet.getRange(row, 1, 1, width);
  range.setNumberFormat("@");
  state.wrote = true;
  range.setValues([values]);

  try {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.STATUSES, true).setAllowInvalid(true).build();
    sheet.getRange(row, header.indexOf(C.status) + 1).setDataValidation(rule);
  } catch (ignore) {}

  // Commit the row before any email is attempted.
  SpreadsheetApp.flush();
  return { duplicate: false, sheet: sheet, header: header, row: row };
}

/** The row number that holds a reference, or 0. */
function findReference_(sheet, header, id) {
  var column = header.indexOf(CONFIG.COLUMNS.reference) + 1;
  var last = sheet.getLastRow();
  if (column < 1 || last < 2) return 0;
  var cells = sheet.getRange(2, column, last - 1, 1).getValues();
  for (var i = 0; i < cells.length; i++) {
    if (String(cells[i][0]).trim() === id) return i + 2;
  }
  return 0;
}

/**
 * Makes sure the tab has a column for every heading this inquiry needs, and returns the header
 * row as a list. Columns are found by their heading, so the owner may reorder them.
 *
 * A new tab gets: Received, Reference, Status, one column per form field, then the two email
 * columns. When a form gains a field later, its column is added just left of the email columns.
 */
function ensureColumns_(sheet, fieldLabels) {
  var C = CONFIG.COLUMNS;
  var ours = [C.received, C.reference, C.status];
  var emails = [C.ownerEmail, C.customerEmail];
  var wanted = ours.concat(fieldLabels).concat(emails);

  var header = readHeader_(sheet);
  if (header.length === 0) {
    writeHeader_(sheet, 1, wanted);
    sheet.setFrozenRows(1);
    return wanted;
  }

  var anchor = -1;
  for (var e = 0; e < emails.length; e++) {
    var at = header.indexOf(emails[e]);
    if (at !== -1 && (anchor === -1 || at < anchor)) anchor = at;
  }

  var newFields = [];
  var rest = [];
  for (var i = 0; i < wanted.length; i++) {
    if (header.indexOf(wanted[i]) !== -1) continue;
    if (anchor !== -1 && fieldLabels.indexOf(wanted[i]) !== -1) newFields.push(wanted[i]);
    else rest.push(wanted[i]);
  }

  if (newFields.length > 0) {
    sheet.insertColumnsBefore(anchor + 1, newFields.length);
    writeHeader_(sheet, anchor + 1, newFields);
    header = header.slice(0, anchor).concat(newFields).concat(header.slice(anchor));
  }
  if (rest.length > 0) {
    writeHeader_(sheet, header.length + 1, rest);
    header = header.concat(rest);
  }
  return header;
}

function readHeader_(sheet) {
  var width = sheet.getLastColumn();
  if (sheet.getLastRow() < 1 || width < 1) return [];
  var cells = sheet.getRange(1, 1, 1, width).getValues()[0];
  var header = [];
  for (var i = 0; i < cells.length; i++) header.push(String(cells[i]).trim());
  return header;
}

function writeHeader_(sheet, column, labels) {
  fitSheet_(sheet, 1, column + labels.length - 1);
  var range = sheet.getRange(1, column, 1, labels.length);
  range.setNumberFormat("@");
  range.setValues([labels]);
  range.setFontWeight("bold");
}

/** A new tab has 1,000 rows and 26 columns. Add more before writing past the edge. */
function fitSheet_(sheet, rows, columns) {
  var maxRows = sheet.getMaxRows();
  if (rows > maxRows) sheet.insertRowsAfter(maxRows, rows - maxRows + CONFIG.EXTRA_ROWS);
  var maxColumns = sheet.getMaxColumns();
  if (columns > maxColumns) sheet.insertColumnsAfter(maxColumns, columns - maxColumns);
}

/**
 * Spreadsheets treat a cell that begins with = + - @ (or a tab or carriage return) as a formula.
 * A leading apostrophe tells the spreadsheet "this is text". The websites already add it
 * (safeCell in messages.ts). It is added here again in case a value arrives without it.
 */
function safeCell_(value) {
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

/** The reverse, for emails: what the visitor typed, without the apostrophe the website added. */
function typed_(value) {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

/** Writes the outcome of each email into the row. */
function markEmails_(saved, sent) {
  setMarker_(saved.sheet, saved.row, saved.header.indexOf(CONFIG.COLUMNS.ownerEmail) + 1, sent.owner);
  setMarker_(saved.sheet, saved.row, saved.header.indexOf(CONFIG.COLUMNS.customerEmail) + 1, sent.customer);
}

function setMarker_(sheet, row, column, text) {
  if (column < 1) return;
  var cell = sheet.getRange(row, column);
  cell.setValue(text);
  if (text !== CONFIG.MARKERS.sent) {
    try {
      cell.setBackground(CONFIG.NOT_SENT_COLOR);
    } catch (ignore) {}
  }
}

/* ============================================================================================
 * EMAIL
 * ========================================================================================== */

/**
 * Sends the email to the owner, then the note to the customer, and records how each went in
 * "sent". Every send is guarded: a failure here is written into the row and never loses it.
 */
function sendEmails_(ss, s, settings, sent) {
  var M = CONFIG.MARKERS;
  var hour = Math.floor(new Date().getTime() / 3600000);
  var count = countThisHour_(hour);
  var budget = emailBudget_();

  // Past the hourly limit the row is still saved, but no email goes out for it. The owner is
  // told once per hour. This keeps a flood from using up the account's daily email allowance.
  if (count > settings.hourlyLimit) {
    sent.owner = notSent_("hourly limit reached");
    sent.customer = notSent_("hourly limit reached");
    tellOwnerAboutLimit_(ss, settings, hour, budget);
    return;
  }

  // The owner comes first. If only part of the allowance is left, the owner gets it.
  var owners = settings.ownerEmails.slice(0, budget);
  budget -= owners.length;

  // Decide now whether the customer's note can go out, so the email to the owner is accurate.
  var address = s.customer.email;
  var sendable = isSendable_(address);
  var problem = "";
  if (!sendable) problem = "address";
  else if (missingForAck_(s.kind, settings.business).length > 0) problem = "details";
  else if (budget < 1) problem = "daily";

  var ownerSaidNoteWasSent = false;
  if (settings.ownerEmails.length === 0) {
    sent.owner = notSent_("no owner email address set");
  } else if (owners.length === 0) {
    sent.owner = notSent_("daily email limit reached");
  } else {
    var message = ownerEmail_(s, problem, sendable);
    try {
      mail_(owners, message.subject, message.body, sendable ? address : "", CONFIG.SENDER_NAME);
      sent.owner = M.sent;
      ownerSaidNoteWasSent = problem === "";
    } catch (err) {
      // The owner must hear about the inquiry. Try once more without a Reply-To header, in case
      // Google objected to it, and say so in the email.
      note_("Email to the owner for " + s.id + " failed once: " + describe_(err));
      try {
        message = ownerEmail_(s, problem, false);
        mail_(owners, message.subject, message.body, "", CONFIG.SENDER_NAME);
        sent.owner = M.sent;
        ownerSaidNoteWasSent = problem === "";
      } catch (err2) {
        sent.owner = notSent_("error (" + brief_(err2) + ")");
      }
    }
  }

  if (problem !== "") {
    sent.customer = notSent_(CONFIG.ACK_PROBLEMS[problem]);
    return;
  }
  try {
    var ack = customerEmail_(s, settings.business);
    mail_([address], ack.subject, ack.body, settings.ownerEmails[0] || "", settings.business.name);
    sent.customer = M.sent;
  } catch (err3) {
    sent.customer = notSent_("error (" + brief_(err3) + ")");
    note_("Note to the customer for " + s.id + " failed: " + describe_(err3));
    if (ownerSaidNoteWasSent) correctOwner_(owners, s);
  }
}

/**
 * The email to the owner. In the normal case it is built exactly like renderOwnerEmail in
 * messages.ts. Two sentences change when they would otherwise be untrue.
 */
function ownerEmail_(s, problem, replyWorks) {
  var first = firstName_(s.customer.name);
  var lines = [s.kindLabel + " received " + s.submittedAtLocal + " through " + s.source + ".", ""];
  for (var i = 0; i < s.fields.length; i++) {
    var value = typed_(s.fields[i].value);
    if (value !== "") lines.push(s.fields[i].label + ": " + value);
  }
  lines.push("");
  lines.push(replyWorks
    ? "Reply to this email to answer " + first + " directly."
    : "Replying to this email will not reach " + first + ". Use the contact details above.");
  lines.push("");
  lines.push(problem === "" ? CONFIG.OWNER_NOTES.sent : CONFIG.OWNER_NOTES[problem]);
  lines.push("");
  lines.push("Reference: " + s.id);
  return {
    subject: "New " + s.kindLabel.toLowerCase() + ": " + s.customer.name + (s.summary ? " (" + s.summary + ")" : ""),
    body: lines.join("\n")
  };
}

/**
 * The note to the customer, built exactly like renderCustomerEmail in messages.ts.
 * It contains the first name (letters only), the summary the website computed, the reference and
 * the business details. It never contains anything else the visitor typed.
 */
function customerEmail_(s, business) {
  var template = CONFIG.KINDS[s.kind].ack;
  var vars = {
    firstName: firstName_(s.customer.name),
    business: business.name,
    phone: business.phone,
    address: business.address,
    ackSummary: s.ackSummary,
    id: s.id
  };
  var lines = [];
  for (var i = 0; i < template.body.length; i++) lines.push(fill_(template.body[i], vars));
  return { subject: fill_(template.subject, vars), body: lines.join("\n") };
}

/** Which business details the note for this kind of form needs and does not have yet. */
function missingForAck_(kind, business) {
  var template = CONFIG.KINDS[kind].ack;
  var text = template.subject + "\n" + template.body.join("\n");
  var needs = [
    ["{business}", business.name, "BUSINESS_NAME"],
    ["{phone}", business.phone, "BUSINESS_PHONE"],
    ["{address}", business.address, "BUSINESS_ADDRESS"]
  ];
  var missing = [];
  for (var i = 0; i < needs.length; i++) {
    if (text.indexOf(needs[i][0]) !== -1 && needs[i][1] === "") missing.push(needs[i][2]);
  }
  return missing;
}

/** Sent only when the owner was told the customer got a note and the note then failed. */
function correctOwner_(owners, s) {
  try {
    var first = firstName_(s.customer.name);
    mail_(
      owners,
      "Correction: the automatic note for " + s.id + " was not sent",
      [
        "A moment ago you were emailed about a new " + s.kindLabel.toLowerCase() + " from " + s.customer.name + ".",
        "",
        "That email said the customer was sent an automatic note. Google reported an error when the note was sent, so it did not go out. " + first + " has not heard from you yet.",
        "",
        "Nothing has been confirmed with the customer.",
        "",
        "Reference: " + s.id
      ].join("\n"),
      "",
      CONFIG.SENDER_NAME
    );
  } catch (err) {
    note_("Correction email for " + s.id + " failed: " + describe_(err));
  }
}

/** One notice per hour, at most, when the hourly limit has been passed. */
function tellOwnerAboutLimit_(ss, settings, hour, budget) {
  try {
    var cache = CacheService.getScriptCache();
    var key = "inbox.limit-notice." + hour;
    if (cache.get(key)) return;
    var owners = settings.ownerEmails.slice(0, budget);
    if (owners.length === 0) return;
    cache.put(key, "sent", 7200);

    var url = "";
    try {
      url = ss.getUrl();
    } catch (ignore) {}
    mail_(
      owners,
      "Website inquiries: emails paused for the rest of this hour",
      [
        "More than " + settings.hourlyLimit + " inquiries have come in through your website this hour. That is unusual, and it can mean a spam run.",
        "",
        "Every inquiry is still being saved in your Google Sheet. Until the hour is over, new inquiries will not be emailed to you, and customers will not get the automatic note. This protects your Google account's daily email limit.",
        "",
        "What to do now:",
        "1. Open your Sheet" + (url ? ": " + url : "."),
        "2. Look at the newest rows. Rows saved during the pause say \"Email not sent\" in the last two columns.",
        "3. If they look like real customers, contact them yourself. If they look like spam, tell the person who looks after your website.",
        "",
        "You will get this message at most once an hour while it lasts. Nothing has been confirmed with any customer."
      ].join("\n"),
      "",
      CONFIG.SENDER_NAME
    );
  } catch (err) {
    note_("Hourly limit notice failed: " + describe_(err));
  }
}

function mail_(to, subject, body, replyTo, name) {
  var message = { to: to.join(","), subject: subject, body: body };
  if (replyTo) message.replyTo = replyTo;
  if (name) message.name = name;
  MailApp.sendEmail(message);
}

/** How many inquiries have been accepted this clock hour, counting this one. */
function countThisHour_(hour) {
  try {
    var cache = CacheService.getScriptCache();
    var key = "inbox.count." + hour;
    var count = (parseInt(cache.get(key), 10) || 0) + 1;
    cache.put(key, String(count), 7200);
    return count;
  } catch (err) {
    // If the counter is unavailable, do not hold emails back. The daily limit still applies.
    return 0;
  }
}

/** How many more recipients Google will let this account email today. */
function emailBudget_() {
  try {
    var left = MailApp.getRemainingDailyQuota();
    if (typeof left === "number" && left >= 0) return Math.floor(left);
  } catch (ignore) {}
  // Unknown: try anyway. A send that Google refuses is caught and written into the row.
  return 1000000;
}

function emailBudgetText_() {
  try {
    return String(MailApp.getRemainingDailyQuota());
  } catch (err) {
    return "unknown";
  }
}

function notSent_(reason) {
  return CONFIG.MARKERS.notSent + reason;
}

/* ============================================================================================
 * SMALL HELPERS
 * ========================================================================================== */

/**
 * "Mary-Jane O'Neil" becomes "Mary-Jane". Only letters, apostrophes and hyphens survive, so a
 * name can never smuggle a link or a sentence into the customer's note. Same as firstName in
 * messages.ts.
 */
function firstName_(fullName) {
  var first = String(fullName).trim().split(/\s+/)[0] || "";
  return first.replace(notNamePattern_(), "").slice(0, 40) || "there";
}

var NOT_NAME_PATTERN_ = null;

function notNamePattern_() {
  if (NOT_NAME_PATTERN_ === null) {
    try {
      // Everything that is not a letter in any alphabet, an accent, an apostrophe or a hyphen.
      NOT_NAME_PATTERN_ = new RegExp("[^\\p{L}\\p{M}'’-]", "gu");
    } catch (err) {
      // For a runtime without Unicode classes: remove digits, punctuation, symbols and emoji.
      NOT_NAME_PATTERN_ = /[\u0000-&(-,.-@[-`{-¿×÷ -‘‚-⯿\uD800-\uDFFF]/g;
    }
  }
  return NOT_NAME_PATTERN_;
}

/** Replaces {name} placeholders. Unknown placeholders are left as they are. */
function fill_(template, vars) {
  return template.replace(/\{(\w+)\}/g, function (match, key) {
    return own_(vars, key) ? vars[key] : match;
  });
}

function text_(value) {
  return typeof value === "string" ? value.trim() : "";
}

function oneLine_(value) {
  return text_(value).replace(/[\u0000-\u001F\u007F  ]+/g, " ").trim();
}

function refuse_(code, message) {
  return { ok: false, code: code, error: message };
}

/** Every answer leaves through here, as JSON. */
function json_(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}

/** An error as one short line, for a cell in the Sheet. */
function brief_(err) {
  var message = String(err && err.message ? err.message : err);
  return message.replace(/\s+/g, " ").trim().slice(0, 80);
}

/** The same, for the execution log, with any email address removed. The log never holds customer details. */
function describe_(err) {
  return brief_(err).replace(/[^\s@]+@[^\s@]+/g, "[address]");
}

function note_(message) {
  try {
    console.log("[inbox] " + message);
  } catch (ignore) {}
}

function say_(lines) {
  Logger.log(lines.join("\n"));
}
