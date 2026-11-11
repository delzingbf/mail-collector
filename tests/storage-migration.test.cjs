const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

test('sync revisits legacy and pending records, then skips complete migrated records', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mail-migration-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const storagePath = path.resolve(__dirname, '../src/storage.ts');
  const syncPath = path.resolve(__dirname, '../src/sync.ts');
  const code = `
    const assert = require('node:assert/strict');
    const storage = require(${JSON.stringify(storagePath)});
    let fetched = 0;
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function(name, ...args) {
      if (name === 'googleapis') return { google: { gmail: () => ({ users: { messages: {
        list: async () => ({ data: { messages: [{ id: 'legacy' }, { id: 'pending' }] } }),
        get: async ({ id }) => { fetched++; return { data: { id } }; },
      }}}) }};
      if (name === './auth') return { getGoogleAuth: async () => ({}) };
      if (name === './extractor') return { extractEmail: (message) => ({ id: message.id, text: 'body' }) };
      if (name === './attachments') return { extractAttachments: async () => [
        { type: 'docx', filename: 'chapter.docx', text: 'Recovered chapter', status: 'success' },
      ] };
      return original.call(this, name, ...args);
    };
    (async () => {
      await storage.saveEmail({ id: 'legacy', pdfs: [] });
      await storage.saveEmail({ id: 'pending', attachments: [{ type: 'docx', status: 'error' }] });
      const { syncEmails } = require(${JSON.stringify(syncPath)});
      await syncEmails();
      assert.equal(fetched, 2);
      const saved = await storage.getStoredEmails();
      assert.equal(saved.length, 2);
      assert.equal(saved[0].attachments[0].text, 'Recovered chapter');
      await syncEmails();
      assert.equal(fetched, 2);
      assert.equal(await storage.emailExists('missing'), false);
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(require.resolve('tsx')).href, '-e', code], {
    cwd: dir, encoding: 'utf8', timeout: 30000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
