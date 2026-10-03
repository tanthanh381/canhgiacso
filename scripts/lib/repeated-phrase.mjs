// Detects accidental text duplication such as
//   "7 cách tra cứu số lạ: 7 cách tra cứu số lạ: 7 cách tra cứu số lạ"
// which the content pipeline once produced when a patch stage ran repeatedly.
// Shared by scripts/seo-audit.mjs and tests/content-pipeline-idempotent.test.mjs.

const MAX_PHRASE_WORDS = 12;

const decodeEntities = (value) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));

const visibleText = (fragment) =>
  decodeEntities(
    fragment
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

/** Normalised comparison tokens: lower-cased, edge punctuation removed, punctuation-only tokens dropped. */
function tokens(text) {
  return text
    .toLocaleLowerCase("vi")
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

/**
 * Returns the first phrase that is repeated back-to-back, or null.
 *
 * - any phrase of 1..12 words repeated `minRepeats` (default 3) or more times;
 * - a long phrase (`longPhraseWords`, default 5, or more words) repeated just
 *   `longPhraseRepeats` (default 2) times. Two copies of a 5+ word sentence in
 *   one title/link is never intentional, while short phrases legitimately occur
 *   twice in a card ("Hoàn tiền Hoàn tiền đơn hàng ...": label + title).
 *
 * Comparison ignores case and punctuation, so "A b: a b: a b" counts as three
 * repeats of "a b".
 */
export function findRepeatedPhrase(
  text,
  { minRepeats = 3, longPhraseWords = 5, longPhraseRepeats = 2 } = {},
) {
  const words = tokens(text);
  for (let length = 1; length <= MAX_PHRASE_WORDS; length += 1) {
    const required = length >= longPhraseWords ? Math.min(minRepeats, longPhraseRepeats) : minRepeats;
    for (let start = 0; start + length * required <= words.length; start += 1) {
      let repeats = 1;
      while (start + length * (repeats + 1) <= words.length) {
        let same = true;
        for (let offset = 0; offset < length; offset += 1) {
          if (words[start + offset] !== words[start + repeats * length + offset]) {
            same = false;
            break;
          }
        }
        if (!same) break;
        repeats += 1;
      }
      if (repeats >= required) {
        return { phrase: words.slice(start, start + length).join(" "), repeats };
      }
    }
  }
  return null;
}

/** Text of every <title>, <a> and <h1>-<h3> element in an HTML document. */
export function collectHeadingTexts(html) {
  const found = [];
  const add = (kind, fragment) => {
    const text = visibleText(fragment);
    if (text) found.push({ kind, text });
  };
  for (const match of html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)) add("title", match[1]);
  for (const match of html.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)) add(match[1].toLowerCase(), match[2]);
  for (const match of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) add("a", match[1]);
  return found;
}

/** Every title/link/heading in `html` that contains a back-to-back repeated phrase. */
export function findRepeatedPhrasesInHtml(html, options) {
  const problems = [];
  for (const { kind, text } of collectHeadingTexts(html)) {
    const repeated = findRepeatedPhrase(text, options);
    if (repeated) problems.push({ kind, text, ...repeated });
  }
  return problems;
}
