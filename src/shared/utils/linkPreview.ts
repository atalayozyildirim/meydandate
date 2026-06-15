import type { FeedLinkPreview } from "@/domain/entities/Feed";
import { sanitizePlainText } from "@/shared/utils/sanitize";

const urlRegex = /https?:\/\/[^\s<>"']+/i;
const trailingPunctuationRegex = /[),.;:!?]+$/;
const maxHtmlLength = 180_000;
const fetchTimeoutMs = 6500;

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));

const getAttribute = (tag: string, attribute: string) => {
  const match = tag.match(
    new RegExp(`${attribute}\\s*=\\s*(['"])(.*?)\\1`, "i"),
  );

  return match?.[2] ? decodeHtmlEntities(match[2].trim()) : null;
};

const findMetaContent = (html: string, keys: string[]) => {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = match[0];
    const key = getAttribute(tag, "property") ?? getAttribute(tag, "name");
    const content = getAttribute(tag, "content");

    if (key && content && normalizedKeys.has(key.toLowerCase())) {
      return content;
    }
  }

  return null;
};

const findTitle = (html: string) => {
  const ogTitle = findMetaContent(html, ["og:title", "twitter:title"]);

  if (ogTitle) {
    return ogTitle;
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1].trim()) : null;
};

const absolutizeUrl = (value: string | null, baseUrl: string) => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, baseUrl);
    return /^https?:$/i.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

export const extractFirstUrl = (text: string) => {
  const match = text.match(urlRegex);
  const rawUrl = match?.[0]?.replace(trailingPunctuationRegex, "");

  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    return /^https?:$/i.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

export const fetchLinkPreview = async (
  text: string,
): Promise<FeedLinkPreview | null> => {
  const url = extractFirstUrl(text);

  if (!url) {
    return null;
  }

  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Link preview timeout")), fetchTimeoutMs);
    });
    const response = await Promise.race([
      fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
        },
      }),
      timeout,
    ]);

    if (!response.ok) {
      return { url };
    }

    const html = (await response.text()).slice(0, maxHtmlLength);
    const parsedUrl = new URL(url);
    const title = sanitizePlainText(findTitle(html) ?? "", 140).trim();
    const description = sanitizePlainText(
      findMetaContent(html, ["og:description", "twitter:description", "description"]) ??
        "",
      220,
    ).trim();
    const siteName = sanitizePlainText(
      findMetaContent(html, ["og:site_name", "application-name"]) ??
        parsedUrl.hostname.replace(/^www\./i, ""),
      80,
    ).trim();
    const imageUrl = absolutizeUrl(
      findMetaContent(html, ["og:image", "twitter:image"]),
      url,
    );

    return {
      url,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(siteName ? { siteName } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    };
  } catch {
    return { url };
  }
};
