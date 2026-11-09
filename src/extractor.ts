
import type { gmail_v1 } from "googleapis";
import { convert } from "html-to-text";

type MessagePart = gmail_v1.Schema$MessagePart;

export interface ExtractedEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  text: string;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");

  return Buffer.from(base64, "base64").toString("utf8");
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] = [],
  name: string
): string {
  return (
    headers.find(
      (header) =>
        header.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? "Não informado"
  );
}

function findText(
  part: MessagePart | undefined,
  mimeType: string
): string | null {
  if (!part) return null;

  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  for (const child of part.parts ?? []) {
    const result = findText(child, mimeType);

    if (result !== null) {
      return result;
    }
  }

  return null;
}

function htmlToText(html: string): string {
  return convert(html, {
    wordwrap: false,
    preserveNewlines: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  }).trim();
}

export function extractEmail(
  message: gmail_v1.Schema$Message
): ExtractedEmail {
  const headers = message.payload?.headers ?? [];

  const plainText = findText(
    message.payload,
    "text/plain"
  );

  const htmlText = findText(
    message.payload,
    "text/html"
  );

  const text =
    plainText ??
    (htmlText ? htmlToText(htmlText) : "");

  return {
    id: message.id ?? "",
    from: getHeader(headers, "From"),
    subject: getHeader(headers, "Subject"),
    date: getHeader(headers, "Date"),
    text: text.trim(),
  };
}
