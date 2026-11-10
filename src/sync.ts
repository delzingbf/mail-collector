
import { google } from "googleapis";
import { getGoogleAuth } from "./auth";
import { extractEmail } from "./extractor";
import { extractPdfAttachments } from "./attachments";
import {
  emailExists,
  saveEmail,
  type StoredEmail,
} from "./storage";

export async function syncEmails(): Promise<void> {
  const auth = await getGoogleAuth();

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  let pageToken: string | undefined;

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let pending = 0;

  console.log("Iniciando sincronização...\n");

  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,
      q: "in:inbox",
      pageToken,
    });

    const messages = response.data.messages ?? [];

    for (const message of messages) {
      if (!message.id) continue;

      try {
        if (await emailExists(message.id)) {
          skipped++;
          continue;
        }

        const result = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full",
        });

        const email = extractEmail(result.data);

        const pdfs = await extractPdfAttachments(
          gmail,
          result.data
        );

        const storedEmail: StoredEmail = {
          ...email,
          pdfs,
          processedAt: new Date().toISOString(),
        };

        await saveEmail(storedEmail);

        const hasPdfIssues = pdfs.some(
          (pdf) => pdf.status !== "success"
        );

        if (hasPdfIssues) {
          pending++;
          console.warn(
            `PENDENTE: ${email.subject}`
          );
        } else {
          processed++;
          console.log(
            `SALVO: ${email.subject}`
          );
        }
      } catch (error) {
        failed++;

        console.error(
          `ERRO na mensagem ${message.id}:`,
          error
        );
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  console.log("\nSincronização finalizada.");
  console.log("Processados:", processed);
  console.log("Já armazenados:", skipped);
  console.log("Com pendências:", pending);
  console.log("Falhas:", failed);

  if (failed > 0) {
    throw new Error(`${failed} mensagem(ns) não puderam ser sincronizadas. Execute novamente para tentar os registros que falharam.`);
  }
}
