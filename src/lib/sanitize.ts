// Centralized sanitization helpers backed by DOMPurify.
//
// Why this exists, in 3 lines :
//  - React's JSX already escapes any string interpolated as text → XSS via
//    {value} is impossible. We don't need to sanitize at render time.
//  - The real injection vectors are `dangerouslySetInnerHTML` (currently
//    used only for internal constants in this repo, no user input flows there).
//  - These helpers add a defense-in-depth layer at the WRITE boundary :
//    on every form submit we strip HTML tags from user-controlled fields
//    before saving. If a future feature ever renders the field as raw HTML,
//    no payload will have been stored.
//
// Use one of:
//  - `sanitizeText(str)`  — strips ALL tags, keeps only text. For names,
//    titles, emails, single-line inputs.
//  - `sanitizeMultiline(str)` — same but preserves whitespace and newlines.
//    For descriptions, comments, chat messages.
//
// Both helpers return "" for null/undefined and never throw.

import DOMPurify from "isomorphic-dompurify";

const TEXT_OPTS = {
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
};

export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  return String(DOMPurify.sanitize(str, TEXT_OPTS)).trim();
}

export function sanitizeMultiline(input: unknown): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  return String(DOMPurify.sanitize(str, TEXT_OPTS));
}

/** Returns sanitized text or null if the result is empty. */
export function sanitizeTextOrNull(input: unknown): string | null {
  const out = sanitizeText(input);
  return out.length > 0 ? out : null;
}
