
import type { gmail_v1 } from "googleapis";
import { extractPdfText } from "./pdf";

type GmailClient = gmail_v1.Gmail;
type MessagePart = gmail_v1.Schema$MessagePart;

export interface ExtractedPdf {
  filename: string;
  text: string;
  status: "success" | "empty" | "error";
  error?: string;
}

function findPdfParts(
  part: MessagePart | undefined
): MessagePart[] {
  if (!part) return [];

  const results: MessagePart[] = [];

  const isPdf =
    part.mimeType?.toLowerCase() === "application/pdf" ||
    part.filename?.toLowerCase().endsWith(".pdf");

  if (isPdf && part.body) {
    results.push(part);
  }

  for (const child of part.parts ?? []) {
    results.push(...findPdfParts(child));
  }

  return results;
}

function decodeBase64Url(data: string): Buffer {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
}

export async function extractPdfAttachments(
  gmail: GmailClient,
  message: gmail_v1.Schema$Message
): Promise<ExtractedPdf[]> {
  if (!message.id) {
    throw new Error("Mensagem sem identificador.");
  }

  const pdfParts = findPdfParts(message.payload);
  const results: ExtractedPdf[] = [];

  for (const [index, part] of pdfParts.entries()) {
    const filename =
      part.filename || `anexo-${index + 1}.pdf`;

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
      const text = await extractPdfText(buffer);

      results.push({
        filename,
        text,
        status: text.length > 0 ? "success" : "empty",
      });
    } catch (error) {
      results.push({
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
