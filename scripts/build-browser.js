
const esbuild = require('esbuild');

const bundles = [
  {
    label: 'src/test-generation-core.browser.js',
    options: {
      entryPoints: ['src/test-generation-core.js'],
      outfile: 'src/test-generation-core.browser.js',
      bundle: true,
      platform: 'browser',
      format: 'iife',
      globalName: 'TestGenerationCore',
      sourcemap: true,
      logLevel: 'info'
    }
  },
  {
    label: 'src/ts/cy-emulator.js',
    options: {
      entryPoints: ['src/ts/cy-emulator.ts'],
      outfile: 'src/ts/cy-emulator.js',
      bundle: true,
      platform: 'browser',
      format: 'iife',
      globalName: 'CyEmulatorBundle',
      sourcemap: true,
      logLevel: 'info'
    }
  }
];

Promise.all(
  bundles.map(({ label, options }) => {
    console.log(`Building browser bundle: ${label}`);
    return esbuild.build(options);
  })
).catch((err) => {
  console.error('esbuild failed:', err);
  process.exit(1);
});
