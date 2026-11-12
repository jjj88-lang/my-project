/**
 * Typographic quotes and apostrophes for text that arrives with straight ones
 * (pricing.json is written in plain ASCII so it stays easy to edit).
 */
export function smart(text: string): string {
  return (
    text
      // An apostrophe inside or at the end of a word: don't, days' notice
      .replace(/(\p{L}|\d)'(?=\p{L}|\s|[.,;:!?)]|$)/gu, "$1’")
      // Opening single and double quotes
      .replace(/(^|[\s([{])'/g, "$1‘")
      .replace(/(^|[\s([{])"/g, "$1“")
      // Whatever is left closes
      .replace(/'/g, "’")
      .replace(/"/g, "”")
  );
}
