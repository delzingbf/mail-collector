
import fs from "node:fs/promises";
import path from "node:path";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

import { getStoredEmails } from "./storage";

const REPORTS_DIR = path.resolve("reports");

const COLORS = {
  title: "243247",
  text: "252525",
  secondary: "667085",
  divider: "D9DEE5",
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

  return text.split(/\r?\n/).map(
    (line) =>
      new Paragraph({
        text: line || " ",
        style: "BodyText",
      })
  );
}

function metadata(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
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
    spacing: {
      before: 300,
      after: 140,
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
      spacing: { before: 2200, after: 250 },
      style: "CoverLabel",
    }),
    new Paragraph({
      text: "Relatório de E-mails Coletados",
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 350 },
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

  for (const email of emails) {
    paragraphs.push(
      new Paragraph({
        text: email.subject || "Sem assunto",
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      })
    );

    paragraphs.push(
      metadata("Remetente", email.from),
      metadata("Recebido em", email.date)
    );

    paragraphs.push(
      new Paragraph({
        border: {
          bottom: {
            color: COLORS.divider,
            style: BorderStyle.SINGLE,
            size: 6,
            space: 8,
          },
        },
        spacing: { after: 200 },
      })
    );

    if (email.text.trim()) {
      paragraphs.push(sectionTitle("Corpo do e-mail"));
      paragraphs.push(...makeParagraphs(email.text));
    }

    for (const pdf of email.pdfs) {
      paragraphs.push(
        sectionTitle(`Anexo: ${pdf.filename}`)
      );

      if (pdf.status === "success") {
        paragraphs.push(...makeParagraphs(pdf.text));
      } else {
        paragraphs.push(
          new Paragraph({
            text: "[PDF pendente de revisão]",
            style: "Metadata",
          })
        );

        pending.push(
          [
            `Assunto: ${email.subject}`,
            `Remetente: ${email.from}`,
            `ID Gmail: ${email.id}`,
            `Arquivo: ${pdf.filename}`,
            `Status: ${pdf.status}`,
            `Erro: ${pdf.error ?? "Sem texto extraível"}`,
          ].join("\n")
        );
      }
    }

    paragraphs.push(
      new Paragraph({
        text: `ID Gmail: ${email.id}`,
        style: "Metadata",
        spacing: { before: 400 },
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
              after: 120,
              line: 300,
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
            size: 34,
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
      : "Nenhuma pendência de PDF encontrada.",
    "utf8"
  );

  console.log("\nRelatório gerado com sucesso!");
  console.log("DOCX:", reportPath);
  console.log("Pendências:", pendingPath);
  console.log("Total de mensagens:", emails.length);
  console.log("PDFs pendentes:", pending.length);
}