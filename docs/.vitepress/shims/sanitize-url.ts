const INVALID_PROTOCOL_REGEX = /^([^\w]*)(javascript|data|vbscript)/im;
const HTML_ENTITIES_REGEX = /&#(\w+)(^\w|;)?/g;
const HTML_CTRL_ENTITY_REGEX = /&(newline|tab);/gi;
const CTRL_CHARACTERS_REGEX = /[\u0000-\u001F\u007F-\u009F\u2000-\u200D\uFEFF]/gim;
const URL_SCHEME_REGEX = /^.+(:|&colon;)/gim;
const WHITESPACE_ESCAPE_CHARS_REGEX = /(\\|%5[cC])((%(6[eE]|72|74))|[nrt])/g;
const RELATIVE_FIRST_CHARACTERS = [".", "/"];
const BLANK_URL = "about:blank";

function isRelativeUrlWithoutProtocol(url: string): boolean {
  return RELATIVE_FIRST_CHARACTERS.includes(url[0]);
}

function decodeHtmlCharacters(value: string): string {
  const removedNullByte = value.replace(CTRL_CHARACTERS_REGEX, "");
  return removedNullByte.replace(HTML_ENTITIES_REGEX, (_match, dec) => String.fromCharCode(dec));
}

function isValidUrl(url: string): boolean {
  return URL.canParse(url);
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function sanitizeUrl(url?: string | null): string {
  if (!url) {
    return BLANK_URL;
  }

  let charsToDecode: RegExpMatchArray | null;
  let decodedUrl = safeDecodeURIComponent(url.trim());

  do {
    decodedUrl = decodeHtmlCharacters(decodedUrl)
      .replace(HTML_CTRL_ENTITY_REGEX, "")
      .replace(CTRL_CHARACTERS_REGEX, "")
      .replace(WHITESPACE_ESCAPE_CHARS_REGEX, "")
      .trim();
    decodedUrl = safeDecodeURIComponent(decodedUrl);
    charsToDecode =
      decodedUrl.match(CTRL_CHARACTERS_REGEX) ||
      decodedUrl.match(HTML_ENTITIES_REGEX) ||
      decodedUrl.match(HTML_CTRL_ENTITY_REGEX) ||
      decodedUrl.match(WHITESPACE_ESCAPE_CHARS_REGEX);
  } while (charsToDecode && charsToDecode.length > 0);

  const sanitizedUrl = decodedUrl;
  if (!sanitizedUrl) {
    return BLANK_URL;
  }

  if (isRelativeUrlWithoutProtocol(sanitizedUrl)) {
    return sanitizedUrl;
  }

  const trimmedUrl = sanitizedUrl.trimStart();
  const urlSchemeParseResults = trimmedUrl.match(URL_SCHEME_REGEX);
  if (!urlSchemeParseResults) {
    return sanitizedUrl;
  }

  const urlScheme = urlSchemeParseResults[0].toLowerCase().trim();
  if (INVALID_PROTOCOL_REGEX.test(urlScheme)) {
    return BLANK_URL;
  }

  const backSanitized = trimmedUrl.replace(/\\/g, "/");
  if (urlScheme === "mailto:" || urlScheme.includes("://")) {
    return backSanitized;
  }

  if (urlScheme === "http:" || urlScheme === "https:") {
    if (!isValidUrl(backSanitized)) {
      return BLANK_URL;
    }

    const normalizedUrl = new URL(backSanitized);
    normalizedUrl.protocol = normalizedUrl.protocol.toLowerCase();
    normalizedUrl.hostname = normalizedUrl.hostname.toLowerCase();
    return normalizedUrl.toString();
  }

  return backSanitized;
}

export default sanitizeUrl;
