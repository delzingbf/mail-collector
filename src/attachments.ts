
import type { gmail_v1 } from "googleapis";
import { extractPdfText } from "./pdf";
import { extractWordText } from "./word";

type GmailClient = gmail_v1.Gmail;
type MessagePart = gmail_v1.Schema$MessagePart;

export interface ExtractedAttachment {
  type: "pdf" | "docx";
  filename: string;
  text: string;
  status: "success" | "empty" | "error";
  error?: string;
}

function attachmentType(part: MessagePart): "pdf" | "docx" | undefined {
  const mime = part.mimeType?.toLowerCase().split(";")[0].trim();
  const filename = part.filename?.toLowerCase();
  if (filename?.endsWith(".docx")) return "docx";
  if (filename?.endsWith(".pdf")) return "pdf";
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return undefined;
}

function findAttachmentParts(part: MessagePart | undefined): MessagePart[] {
  if (!part) return [];
  const results: MessagePart[] = [];
  if (attachmentType(part)) results.push(part);
  for (const child of part.parts ?? []) {
    results.push(...findAttachmentParts(child));
  }
  return results;
}

function decodeBase64Url(data: string): Buffer {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
}

export async function extractAttachments(
  gmail: GmailClient,
  message: gmail_v1.Schema$Message
): Promise<ExtractedAttachment[]> {
  if (!message.id) {
    throw new Error("Mensagem sem identificador.");
  }

  const parts = findAttachmentParts(message.payload);
  const results: ExtractedAttachment[] = [];

  for (const [index, part] of parts.entries()) {
    const type = attachmentType(part)!;
    const filename = part.filename || `anexo-${index + 1}.${type}`;

    try {
      let encodedData = part.body?.data;

      if (!encodedData && part.body?.attachmentId) {
        const response =
          await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: message.id,
            id: part.body.attachmentId,
          });

        encodedData = response.data.data ?? undefined;
      }

      if (!encodedData) {
        throw new Error("Anexo sem dados disponíveis.");
      }

      const buffer = decodeBase64Url(encodedData);
      const text = type === "pdf"
        ? await extractPdfText(buffer)
        : await extractWordText(buffer);

      results.push({
        type,
        filename,
        text,
        status: text.length > 0 ? "success" : "empty",
      });
    } catch (error) {
      results.push({
        type,
        filename,
        text: "",
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  return results;
}
