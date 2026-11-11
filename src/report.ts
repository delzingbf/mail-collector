
import fs from "node:fs/promises";
import path from "node:path";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

import { getStoredEmails } from "./storage";

const REPORTS_DIR = path.resolve("reports");

const COLORS = {
  title: "000000",
  text: "252525",
  secondary: "667085",
};

function makeParagraphs(text: string): Paragraph[] {
  if (!text.trim()) {
    return [
      new Paragraph({
        text: "[Sem texto]",
        style: "BodyText",
      }),
    ];
  }

  // Blank lines become paragraph spacing in the report only.
  // Preserve every nonblank line verbatim; never rewrite the stored content.
  const paragraphs: Paragraph[] = [];
  let blankBefore = false;
  for (const line of text.split(/\r\n|\n|\r/)) {
    if (!line.trim()) {
      blankBefore = paragraphs.length > 0;
      continue;
    }
    paragraphs.push(new Paragraph({
      text: line,
      style: "BodyText",
      spacing: { before: blankBefore ? 100 : 0 },
    }));
    blankBefore = false;
  }
  return paragraphs;
}

function metadata(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    keepNext: true,
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        color: COLORS.secondary,
        size: 18,
      }),
      new TextRun({
        text: value,
        color: COLORS.secondary,
        size: 18,
      }),
    ],
  });
}

function sectionTitle(title: string): Paragraph {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: {
      before: 180,
      after: 80,
    },
  });
}

export async function generateReport(): Promise<void> {
  const emails = await getStoredEmails();

  if (emails.length === 0) {
    console.log("Nenhum e-mail armazenado.");
    return;
  }

  await fs.mkdir(REPORTS_DIR, { recursive: true });

  emails.sort((a, b) => {
    const dateA = Date.parse(a.date) || 0;
    const dateB = Date.parse(b.date) || 0;

    return dateA - dateB;
  });

  const paragraphs: Paragraph[] = [];
  const pending: string[] = [];

  paragraphs.push(
    new Paragraph({
      text: "MAIL COLLECTOR",
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 100 },
      style: "CoverLabel",
    }),
    new Paragraph({
      text: "Relatório de E-mails Coletados",
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 180 },
    }),
    new Paragraph({
      text: `${emails.length} mensagens coletadas`,
      alignment: AlignmentType.CENTER,
      style: "Metadata",
    }),
    new Paragraph({
      text: `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      alignment: AlignmentType.CENTER,
      style: "Metadata",
    })
  );

  for (const [emailIndex, email] of emails.entries()) {
    const recordId = String(emailIndex + 1).padStart(3, "0");
    paragraphs.push(
      new Paragraph({
        text: `REGISTRO ${recordId}`,
        heading: HeadingLevel.HEADING_1,
        keepNext: true,
        spacing: { before: 280, after: 100 },
      }),
      new Paragraph({
        text: email.subject || "Sem assunto",
        style: "Subject",
        keepNext: true,
      }),
      metadata("Remetente", email.from),
      metadata("Recebido em", email.date),
      metadata("ID Gmail", email.id),
      sectionTitle("CORPO DO E-MAIL"),
      ...makeParagraphs(email.text)
    );

    // Prefer the new collection; legacy JSONs remain usable offline.
    const attachments = email.attachments ?? (email.pdfs ?? []).map(
      (pdf) => ({ ...pdf, type: "pdf" as const })
    );
    for (const [attachmentIndex, attachment] of attachments.entries()) {
      const label = attachment.type === "docx" ? "Word (.docx)" : "PDF";
      paragraphs.push(
        sectionTitle(`ANEXO ${String(attachmentIndex + 1).padStart(2, "0")} — ${attachment.filename}`)
      );

      if (attachment.status === "success") {
        paragraphs.push(
          new Paragraph({ text: `Texto extraído do ${label}:`, style: "Metadata", keepNext: true }),
          ...makeParagraphs(attachment.text)
        );
      } else {
        paragraphs.push(
          new Paragraph({
            text: `[${label} pendente de revisão]`,
            style: "Metadata",
          })
        );

        pending.push(
          [
            `Registro: ${recordId}`,
            `Anexo: ${String(attachmentIndex + 1).padStart(2, "0")}`,
            `Assunto: ${email.subject}`,
            `Remetente: ${email.from}`,
            `ID Gmail: ${email.id}`,
            `Arquivo: ${attachment.filename}`,
            `Status: ${attachment.status}`,
            `Erro: ${attachment.error ?? "Sem texto extraível"}`,
          ].join("\n")
        );
      }
    }

    paragraphs.push(
      new Paragraph({
        text: `FIM DO REGISTRO ${recordId}`,
        style: "Metadata",
        spacing: { before: 160, after: 120 },
      })
    );
  }

  const document = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22,
            color: COLORS.text,
          },
        },
      },
      paragraphStyles: [
        {
          id: "Subject",
          name: "Assunto",
          basedOn: "Normal",
          run: { bold: true, size: 26, color: COLORS.title },
          paragraph: { spacing: { after: 100 }, keepNext: true },
        },
        {
          id: "CoverLabel",
          name: "Cover Label",
          basedOn: "Normal",
          run: {
            bold: true,
            size: 22,
            color: COLORS.secondary,
          },
        },
        {
          id: "BodyText",
          name: "Body Text Custom",
          basedOn: "Normal",
          run: {
            font: "Calibri",
            size: 22,
            color: COLORS.text,
          },
          paragraph: {
            spacing: {
              after: 40,
              line: 260,
            },
          },
        },
        {
          id: "Metadata",
          name: "Metadata",
          basedOn: "Normal",
          run: {
            size: 18,
            color: COLORS.secondary,
          },
          paragraph: {
            spacing: { after: 100 },
          },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: {
            bold: true,
            size: 28,
            color: COLORS.title,
          },
          paragraph: {
            spacing: {
              after: 220,
            },
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: {
            bold: true,
            size: 24,
            color: COLORS.title,
          },
        },
      ],
    },

    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1100,
              bottom: 1100,
              left: 1200,
              right: 1200,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const reportPath = path.join(
    REPORTS_DIR,
    `relatorio-${timestamp}.docx`
  );

  await fs.writeFile(
    reportPath,
    await Packer.toBuffer(document)
  );

  const pendingPath = path.join(
    REPORTS_DIR,
    `pendencias-${timestamp}.txt`
  );

  await fs.writeFile(
    pendingPath,
    pending.length
      ? pending.join("\n\n----------------\n\n")
      : "Nenhuma pendência de anexo encontrada.",
    "utf8"
  );

  console.log("\nRelatório gerado com sucesso!");
  console.log("DOCX:", reportPath);
  console.log("Pendências:", pendingPath);
  console.log("Total de mensagens:", emails.length);
  console.log("Anexos pendentes:", pending.length);
}