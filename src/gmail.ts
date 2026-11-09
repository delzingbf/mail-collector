import { google } from "googleapis";
import { getGoogleAuth } from "./auth";
import { extractEmail } from "./extractor";

export async function getEmails() {
  const auth = await getGoogleAuth();

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults: 2,
    q: "in:inbox",
  });

  const messages = response.data.messages ?? [];

  console.log(`Encontradas ${messages.length} mensagens.`);

  for (const message of messages) {
    if (!message.id) continue;

    const result = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full",
    });

    const email = extractEmail(result.data);

    console.log("\n--------------------------");
    console.log("Remetente:", email.from);
    console.log("Assunto:", email.subject);
    console.log("Data:", email.date);
    console.log("Texto:", email.text || "[Sem texto extraído]");
  }
}