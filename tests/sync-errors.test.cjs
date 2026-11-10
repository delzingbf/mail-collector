const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');

function isolated(code) {
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(require.resolve('tsx')).href, '-e', code], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 15000,
  });
  assert.ifError(result.error);
  return result;
}

test('entry point awaits sync and handles asynchronous errors', () => {
  const result = isolated(`
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function(name, ...args) {
      if (name === './sync') return { syncEmails: async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        throw new Error('Falha simulada');
      }};
      return original.call(this, name, ...args);
    };
    require('./src/index.ts');
  `);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Erro na execução:/);
  assert.match(result.stderr, /Falha simulada/);
});

test('sync signals failure after processing messages that could not be fetched', () => {
  const result = isolated(`
    const assert = require('node:assert/strict');
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function(name, ...args) {
      if (name === 'googleapis') return { google: { gmail: () => ({ users: { messages: {
        list: async () => ({ data: { messages: [{ id: 'failed-id' }] } }),
        get: async () => { throw new Error('Falha simulada de leitura'); },
      }}}) }};
      if (name === './auth') return { getGoogleAuth: async () => ({}) };
      if (name === './storage') return { emailExists: async () => false };
      const mocked = ['extractor', 'attachments'].some(part => name === './' + part);
      if (mocked) return {};
      return original.call(this, name, ...args);
    };
    const { syncEmails } = require('./src/sync.ts');
    assert.rejects(syncEmails(), /1 mensagem.*não puderam ser sincronizadas/)
      .catch(error => { console.error(error); process.exitCode = 1; });
  `);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
