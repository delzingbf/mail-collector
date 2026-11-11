const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Document, Packer, Paragraph, Table, TableRow, TableCell } = require('docx');
const { extractAttachments } = require('../src/attachments.ts');
const { extractWordText } = require('../src/word.ts');

async function wordBuffer(text = 'Capítulo — ação e educação') {
  return Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph(text),
    new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph('Texto na tabela')] })] })] }),
  ] }] }));
}

test('extracts actual DOCX paragraphs and table text with accents', async () => {
  const text = await extractWordText(await wordBuffer());
  assert.match(text, /Capítulo — ação e educação/);
  assert.match(text, /Texto na tabela/);
});

test('collects nested, inline and downloaded DOCX using extension or MIME; isolates failures', async () => {
  const encoded = (await wordBuffer()).toString('base64url');
  const calls = [];
  const gmail = { users: { messages: { attachments: { get: async (args) => {
    calls.push(args);
    return { data: { data: encoded } };
  } } } } };
  const result = await extractAttachments(gmail, { id: 'message1', payload: { parts: [
    { filename: 'capítulo.DOCX', mimeType: 'application/octet-stream', body: { data: encoded } },
    { mimeType: 'multipart/mixed', parts: [
      { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: { attachmentId: 'word1' } },
      { filename: 'danificado.docx', body: { data: Buffer.from('invalid').toString('base64url') } },
      { filename: 'faltando.pdf' },
      { filename: 'antigo.doc', body: { data: encoded } },
      { filename: 'imagem.png', body: { data: encoded } },
    ] },
  ] } });
  assert.equal(result.length, 4);
  assert.deepEqual(result.map(a => [a.type, a.status]), [
    ['docx', 'success'], ['docx', 'success'], ['docx', 'error'], ['pdf', 'error'],
  ]);
  assert.equal(result[1].filename, 'anexo-2.docx');
  assert.match(result[0].text, /educação/);
  assert.ok(result[2].error);
  assert.equal(result[3].error, 'Anexo sem dados disponíveis.');
  assert.deepEqual(calls, [{ userId: 'me', messageId: 'message1', id: 'word1' }]);
});

test('empty DOCX is marked pending instead of successful', async () => {
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('')] }] }));
  const [attachment] = await extractAttachments({}, { id: 'empty', payload: {
    filename: 'vazio.docx', body: { data: buffer.toString('base64url') },
  } });
  assert.equal(attachment.status, 'empty');
  assert.equal(attachment.text, '');
});
