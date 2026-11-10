const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const windows = process.platform === 'win32';

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mail espaço & (teste)!-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.mkdirSync(path.join(dir, 'node_modules', '.bin'), { recursive: true });
  for (const name of ['instalar.bat', 'sincronizar_emails.bat', 'gerar_relatorio.bat', 'abrir_relatorio.bat', 'scripts/verificar_ambiente.bat']) {
    fs.copyFileSync(path.join(root, name), path.join(dir, name));
  }
  fs.writeFileSync(path.join(dir, 'package.json'), '{}');
  fs.writeFileSync(path.join(dir, 'credentials.json'), '{}');
  fs.writeFileSync(path.join(dir, 'node_modules', '.bin', 'tsx.cmd'), '');
  fs.writeFileSync(path.join(dir, 'npm.cmd'), '@echo off\r\n> "%~dp0invoked.txt" echo %*\r\nexit /b %MOCK_NPM_EXIT%\r\n');
  return dir;
}
function run(dir, name, env = {}) {
  const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', `call "${path.join(dir, name)}"`], {
    cwd: os.tmpdir(), encoding: 'utf8', timeout: 15000,
    env: { ...process.env, MAIL_COLLECTOR_NO_PAUSE: '1', MOCK_NPM_EXIT: '0', ...env },
  });
  assert.ifError(result.error);
  return result;
}
for (const [name, command] of [
  ['instalar.bat', 'ci'], ['sincronizar_emails.bat', 'run sync'], ['gerar_relatorio.bat', 'run report'],
]) {
  test(`${name}: runs from another folder with spaces, accents and shell characters`, { skip: !windows }, (t) => {
    const dir = fixture(t);
    const result = run(dir, name);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(fs.readFileSync(path.join(dir, 'invoked.txt'), 'utf8').trim(), command);
  });
  test(`${name}: preserves npm failure code and does not announce success`, { skip: !windows }, (t) => {
    const dir = fixture(t);
    const result = run(dir, name, { MOCK_NPM_EXIT: '7' });
    assert.equal(result.status, 7, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /concluida sem erros/);
  });
}
test('sync refuses to run without credentials', { skip: !windows }, (t) => {
  const dir = fixture(t);
  fs.unlinkSync(path.join(dir, 'credentials.json'));
  assert.equal(run(dir, 'sincronizar_emails.bat').status, 1);
  assert.equal(fs.existsSync(path.join(dir, 'invoked.txt')), false);
});
test('report refuses to run without installed dependencies', { skip: !windows }, (t) => {
  const dir = fixture(t);
  fs.unlinkSync(path.join(dir, 'node_modules', '.bin', 'tsx.cmd'));
  assert.equal(run(dir, 'gerar_relatorio.bat').status, 1);
  assert.equal(fs.existsSync(path.join(dir, 'invoked.txt')), false);
});
test('installer works before dependencies and credentials exist', { skip: !windows }, (t) => {
  const dir = fixture(t);
  fs.rmSync(path.join(dir, 'node_modules'), { recursive: true });
  fs.unlinkSync(path.join(dir, 'credentials.json'));
  assert.equal(run(dir, 'instalar.bat').status, 0);
});
test('missing Node.js produces an actionable error', { skip: !windows }, (t) => {
  const dir = fixture(t);
  const result = run(dir, 'instalar.bat', { PATH: path.join(process.env.SystemRoot, 'System32') });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Node.js nao encontrado/);
});
test('opening reports reports failure when a file blocks the folder', { skip: !windows }, (t) => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, 'reports'), 'blocked');
  assert.equal(run(dir, 'abrir_relatorio.bat').status, 1);
});
