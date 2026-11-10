const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractEmail } = require('../src/extractor.ts');
const part = (mimeType, text, extra = {}) => ({
  mimeType, body: { data: Buffer.from(text).toString('base64url') }, ...extra,
});
const extract = (parts) => extractEmail({
  id: 'example', payload: { mimeType: 'multipart/alternative', parts },
}).text;

test('prefers clean HTML over a plain-text alternative containing CSS', () => {
  const html = '<html><head><style>h1 {font-weight:700}</style></head>' +
    '<body><style>td {vertical-align:top}</style><script>alert(1)</script>' +
    '<template>oculto</template><p>Notícia original &amp; completa.</p></body></html>';
  assert.equal(extract([
    part('text/plain', 'h1 {font-weight:700}\nNotícia original & completa.'),
    part('text/html', html),
  ]), 'Notícia original & completa.');
});

test('falls back to plain text when HTML has no readable text', () => {
  assert.equal(extract([
    part('text/html', '<style>body {color:red}</style><img src="x">'),
    part('text/plain', 'Mensagem original'),
  ]), 'Mensagem original');
});

test('preserves legitimate code in plain-text-only messages', () => {
  const text = 'Exemplo de CSS:\nbody { color: red; }';
  assert.equal(extract([part('text/plain', text)]), text);
});

test('ignores attachments and finds HTML in nested MIME parts', () => {
  assert.equal(extract([
    part('text/html', '<p>Anexo</p>', { filename: 'anexo.html' }),
    part('text/html', '<p>Outro anexo</p>', {
      headers: [{ name: 'Content-Disposition', value: 'attachment' }],
    }),
    { mimeType: 'multipart/related', parts: [part('text/html', '<p>Corpo</p>')] },
  ]), 'Corpo');
});

test('returns empty text when the message has no body', () => {
  assert.equal(extract([]), '');
});
