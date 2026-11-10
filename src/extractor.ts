
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

  // Attachments and forwarded messages are not the email body.
  const disposition = getHeader(part.headers ?? [], "Content-Disposition");
  if (
    part.filename?.trim() ||
    /^attachment(?:;|$)/i.test(disposition.trim()) ||
    part.mimeType?.toLowerCase() === "message/rfc822"
  ) {
    return null;
  }

  if (part.mimeType?.toLowerCase() === mimeType && part.body?.data) {
    const text = decodeBase64Url(part.body.data);
    if (text.trim()) return text;
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
      { selector: "head", format: "skip" },
      { selector: "style", format: "skip" },
      { selector: "script", format: "skip" },
      { selector: "template", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  }).trim();
}

export function extractEmail(
  message: gmail_v1.Schema$Message
): ExtractedEmail {
  const headers = message.payload?.headers ?? [];

  // Some senders include CSS in their text/plain alternative. Prefer text
  // extracted from HTML, where style/script elements can be skipped safely.
  const html = findText(message.payload, "text/html");
  const convertedHtml = html ? htmlToText(html) : "";
  const text = convertedHtml || findText(message.payload, "text/plain") || "";

  return {
    id: message.id ?? "",
    from: getHeader(headers, "From"),
    subject: getHeader(headers, "Subject"),
    date: getHeader(headers, "Date"),
    text: text.trim(),
  };
}
