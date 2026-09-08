import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
await build({
  entryPoints: ['src/card.js'], outfile: 'ha-amazing-stock.js', bundle: true,
  format: 'esm', target: ['es2022'], minify: true, legalComments: 'none',
  banner: { js: `/*! Amazing Stock Card v${version} | MIT | https://github.com/raunosr/ha-amazing-stock */` },
});
console.log(`Built ha-amazing-stock.js v${version}`);
