import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const hacs = JSON.parse(await readFile('hacs.json', 'utf8'));
assert.equal(hacs.filename, 'ha-amazing-stock.js');
const bundle = await readFile(hacs.filename, 'utf8');
assert.match(bundle, /customCards/);
assert.match(bundle, /amazing-stock-card-editor/);
assert.ok((await stat(hacs.filename)).size < 100000, 'Keep the card small and self-contained');
assert.doesNotMatch(bundle, /\b(?:eval\s*\(|new Function\s*\(|fetch\s*\(|XMLHttpRequest)/, 'No evaluation or external data fetching');
for (const path of ['src/card.js', 'src/editor.js', 'src/data.js', 'src/history.js', hacs.filename]) {
  const check = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
}
console.log('Syntax, standalone bundle and HACS metadata verified');
