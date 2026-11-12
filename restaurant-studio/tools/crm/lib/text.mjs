/**
 * Small text helpers for the prospect package: sentence splitting, checklist items,
 * file-name slugs and word counts. Nothing in here knows about any particular restaurant.
 */

// A period after one of these does not end a sentence.
const ABBREVIATIONS = new Set([
  "st", "rd", "ave", "blvd", "dr", "ln", "ct", "pl", "hwy", "ste", "apt", "no", "mt",
  "mr", "mrs", "ms", "jr", "sr", "inc", "co", "ltd", "vs", "etc", "approx", "est",
  "e.g", "i.e", "a.m", "p.m",
]);

/**
 * Splits a paragraph into sentences. A break is a period, question mark or exclamation mark
 * (with an optional closing quote or bracket) followed by a space and a capital letter, a digit
 * or an opening quote. Web addresses, street abbreviations and initials are left whole.
 */
export function splitSentences(paragraph) {
  const text = String(paragraph || "").replace(/\s+/g, " ").trim();
  if (text === "") return [];

  const sentences = [];
  let start = 0;
  const boundary = /([.?!])(["'”’)\]]*)\s+(?=["'“‘(\[]?[A-Z0-9])/g;
  let match;
  while ((match = boundary.exec(text)) !== null) {
    const end = match.index + match[1].length + match[2].length;
    if (match[1] === ".") {
      const before = text.slice(start, match.index);
      const lastWord = (before.split(/[\s(]/).pop() || "").replace(/^["'“‘]+/, "");
      const bare = lastWord.toLowerCase();
      const isInitial = /^[A-Za-z]$/.test(lastWord) || /^([A-Za-z]\.)+[A-Za-z]$/.test(lastWord);
      if (ABBREVIATIONS.has(bare) || isInitial) continue;
    }
    sentences.push(text.slice(start, end).trim());
    start = boundary.lastIndex;
  }
  const rest = text.slice(start).trim();
  if (rest !== "") sentences.push(rest);
  return sentences;
}

function tidyItem(text) {
  let item = text.trim().replace(/^(and|then)\s+/i, "");
  if (item === "") return "";
  item = item[0].toUpperCase() + item.slice(1);
  if (/[A-Za-z0-9)\]'"”’]$/.test(item)) item += ".";
  return item;
}

/**
 * Turns a paragraph of instructions into checklist items: one per sentence, and one per
 * semicolon-separated step where every step is long enough to stand on its own.
 * A sentence with a lettered list in it, such as "(a) ... (b) ...", is kept whole.
 */
export function checklistItems(paragraph) {
  const items = [];
  for (const sentence of splitSentences(paragraph)) {
    const lettered = /\(a\)/i.test(sentence) && /\(b\)/i.test(sentence);
    const parts = sentence.split(/;\s+/);
    const allLongEnough = parts.every((part) => wordCount(part) >= 3);
    if (!lettered && parts.length > 1 && allLongEnough) {
      for (const part of parts) items.push(tidyItem(part.replace(/[.]$/, "")));
    } else {
      items.push(tidyItem(sentence));
    }
  }
  return items.filter((item) => item !== "");
}

export function wordCount(text) {
  const words = String(text || "").trim().split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word));
  return words.length;
}

const SLUG_STOPWORDS = new Set(["the", "of", "and", "a", "an", "at", "in"]);

/**
 * A short, file-name-safe version of a business name: lower case, no punctuation, small words
 * dropped, the city dropped from the front, at most three words.
 * "The Example Noodle House of Anytown" -> "example-noodle-house"
 */
export function slugifyName(name, cityName = "") {
  const plain = String(name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .toLowerCase();
  let words = plain.split(/[^a-z0-9]+/).filter(Boolean);
  const city = cityName.toLowerCase();
  if (words.length > 1 && city !== "" && words[0] === city) words = words.slice(1);
  const kept = words.filter((word) => !SLUG_STOPWORDS.has(word));
  const chosen = (kept.length > 0 ? kept : words).slice(0, 3);
  return chosen.join("-") || "restaurant";
}

/** Splits "Name (a note about the name)" into the name and the note. */
export function splitNameNote(recorded) {
  const text = String(recorded || "").trim();
  const match = /^(.*?)\s*\((.+)\)\s*$/.exec(text);
  if (!match || match[1].trim() === "") return { name: text, note: "" };
  return { name: match[1].trim(), note: match[2].trim() };
}

/** "Topeka, KS" -> "Topeka" */
export function cityShortName(city) {
  return String(city || "").split(",")[0].trim();
}

/** Capitalizes the first letter and leaves the rest alone. */
export function upperFirst(text) {
  const value = String(text || "");
  return value === "" ? "" : value[0].toUpperCase() + value.slice(1);
}
