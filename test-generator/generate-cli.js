#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseFormDefinition } = require('./parser');
const { buildDependencySpec } = require('./generator');
const MAX_FILENAME_LENGTH = 80;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--form') {
      args.form = argv[i + 1];
      i += 1;
    } else if (token === '--out') {
      args.out = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function ensureArg(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function toSafeFileName(name) {
  return String(name || 'generated-form')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_FILENAME_LENGTH) || 'generated-form';
}

function main() {
  const args = parseArgs(process.argv);
  ensureArg(args.form, 'Missing required argument: --form <path>');

  const inputPath = path.resolve(process.cwd(), args.form);
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const parsed = parseFormDefinition(raw);
  const specSource = buildDependencySpec(parsed);

  const fileName = `${toSafeFileName(parsed.name)}.generated.cy.js`;
  const outputPath = path.resolve(
    process.cwd(),
    args.out || path.join('cypress', 'e2e', 'generated', fileName)
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, specSource, 'utf8');
  console.log(`Generated ${parsed.dependencies.length} dependency test(s): ${outputPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
