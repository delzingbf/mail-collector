const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { extractPdfText } = require('../src/pdf.ts');

// A real, minimal PDF with a text layer; no credentials or Gmail required.
function textPdf() {
  const stream = 'BT /F1 12 Tf 72 720 Td (Hello Windows) Tj ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
test('extracts a real PDF text layer on the current platform', async () => {
  assert.match(await extractPdfText(textPdf()), /Hello Windows/);
});

test('generates DOCX and pending list in an isolated folder with spaces and accents', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mail relatório '));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dir, 'data', 'emails'), { recursive: true });
  await fs.writeFile(path.join(dir, 'data', 'emails', 'test.json'), JSON.stringify({
    id: 'test', from: 'Autor <autor@example.com>', subject: 'Capítulo com acentuação',
    date: '2026-11-10T12:00:00Z', text: 'Mensagem original.\n\nSegue capítulo.',
    pdfs: [{ filename: 'capítulo.pdf', text: 'Conteúdo do capítulo.', status: 'success' }],
    processedAt: '2026-11-10T12:00:00Z',
  }));
  await fs.writeFile(path.join(dir, 'data', 'emails', 'mixed.json'), JSON.stringify({
    id: 'mixed', from: 'Outro autor', subject: 'Word e PDF',
    date: '2026-11-11T12:00:00Z', text: 'Corpo separado.',
    attachments: [
      { type: 'docx', filename: 'capítulo.docx', text: 'Texto exclusivo do Word.', status: 'success' },
      { type: 'pdf', filename: 'novo.pdf', text: 'Texto exclusivo do PDF.', status: 'success' },
      { type: 'docx', filename: 'vazio.docx', text: '', status: 'empty' },
      { type: 'docx', filename: 'ruim.docx', text: '', status: 'error', error: 'Arquivo inválido' },
    ], processedAt: '2026-11-11T12:00:00Z',
  }));
  const result = spawnSync(process.execPath, [
    '--import', pathToFileURL(require.resolve('tsx')).href, path.resolve(__dirname, '../src/report-cli.ts'),
  ], { cwd: dir, encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const files = await fs.readdir(path.join(dir, 'reports'));
  const docx = files.find(name => name.endsWith('.docx'));
  const pending = files.find(name => name.endsWith('.txt'));
  assert.ok(docx);
  assert.ok(pending);
  const data = await fs.readFile(path.join(dir, 'reports', docx));
  assert.equal(data.subarray(0, 2).toString(), 'PK');
  assert.ok(data.length > 1000);
  const reportText = (await require('mammoth').extractRawText({ buffer: data })).value;
  for (const text of ['Conteúdo do capítulo.', 'Texto exclusivo do Word.', 'Texto exclusivo do PDF.', 'Word (.docx) pendente de revisão']) {
    assert.ok(reportText.includes(text), text);
  }
  assert.equal(reportText.split('Texto exclusivo do Word.').length - 1, 1);
  const issues = await fs.readFile(path.join(dir, 'reports', pending), 'utf8');
  assert.match(issues, /vazio.docx/);
  assert.match(issues, /ruim.docx/);
  assert.match(issues, /Arquivo inválido/);
});
