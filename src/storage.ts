
import fs from "node:fs/promises";
import path from "node:path";

const EMAILS_DIR = path.resolve("data/emails");

export interface StoredPdf {
  filename: string;
  text: string;
  status: "success" | "empty" | "error";
  error?: string;
}

export interface StoredAttachment extends StoredPdf {
  type: "pdf" | "docx";
}

export interface StoredEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  text: string;
  pdfs?: StoredPdf[]; // Registros anteriores ao suporte a Word.
  attachments?: StoredAttachment[];
  processedAt: string;
}

function getEmailPath(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("ID de e-mail inválido.");
  }

  return path.join(EMAILS_DIR, `${id}.json`);
}

export async function emailExists(
  id: string
): Promise<boolean> {
  try {
    const content = await fs.readFile(getEmailPath(id), "utf8");
    const email = JSON.parse(content) as StoredEmail;
    // Revisit legacy records once to collect Word attachments previously ignored.
    // Failed/empty attachments are retried on the next sync as well.
    return Array.isArray(email.attachments) &&
      email.attachments.every((attachment) => attachment.status === "success");
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

export async function saveEmail(
  email: StoredEmail
): Promise<void> {
  await fs.mkdir(EMAILS_DIR, { recursive: true });

  const destination = getEmailPath(email.id);
  const temporary = `${destination}.tmp`;

  await fs.writeFile(
    temporary,
    JSON.stringify(email, null, 2),
    "utf8"
  );

  await fs.rename(temporary, destination);
}

export async function getStoredEmails(): Promise<StoredEmail[]> {
  try {
    const files = await fs.readdir(EMAILS_DIR);

    const emails: StoredEmail[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const content = await fs.readFile(
        path.join(EMAILS_DIR, file),
        "utf8"
      );

      emails.push(JSON.parse(content) as StoredEmail);
    }

    return emails;
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}
