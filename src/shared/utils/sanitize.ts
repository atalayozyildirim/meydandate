// Kullanici girdisini HTML calistirmayan, ekranda gosterilmeye uygun duz metne indirger.
const CONTROL_AND_BIDI_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;
const DANGEROUS_HTML_OPENERS =
  /<\s*\/?\s*(?:script|iframe|object|embed|svg|math|style|link|meta|form|input|button|textarea|base)\b[^>]*>?/gi;
const HTML_TAGS = /<\s*\/?\s*[a-z][^>]*>/gi;
const DANGEROUS_PROTOCOLS = /\b(?:javascript|vbscript|data)\s*:/gi;
const INLINE_EVENT_HANDLERS = /\bon[a-z]+\s*=/gi;

export const sanitizePlainText = (value: string | null | undefined, maxLength?: number): string => {
  const sanitized = (value ?? "")
    .normalize("NFC")
    .replace(CONTROL_AND_BIDI_CHARACTERS, "")
    .replace(HTML_COMMENTS, "")
    .replace(DANGEROUS_HTML_OPENERS, "")
    .replace(HTML_TAGS, "")
    .replace(DANGEROUS_PROTOCOLS, "")
    .replace(INLINE_EVENT_HANDLERS, "");

  return typeof maxLength === "number" ? sanitized.slice(0, maxLength) : sanitized;
};
