
const esbuild = require('esbuild');

console.log('Building browser bundle: src/test-generation-core.browser.js');

esbuild.build({
  entryPoints: ['src/test-generation-core.js'],
  outfile: 'src/test-generation-core.browser.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'TestGenerationCore',
  sourcemap: true,
  logLevel: 'info'
}).catch((err) => {
  console.error('esbuild failed:', err);
  process.exit(1);
});
