#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { unzipSync, strFromU8 } = require('fflate');
const { parseFormDefinition } = require('./parser');
const { buildDependencySpec } = require('./generator');
const MAX_FILENAME_LENGTH = 80;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--form-file' || token === '--form-file-path' || token === '--formpath') {
      args.form = argv[i + 1];
      i += 1;
    } else if (token === '--categories') {
      args.categories = argv[i + 1];
      i += 1;
    } else if (token === '--out') {
      args.out = argv[i + 1];
      i += 1;
    } else if (token === '--logic-level') {
      args.logicLevel = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (token === '--calc-level') {
      args.calcLevel = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (token === '--validation-level') {
      args.validationLevel = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (token === '--ranges-level') {
      args.rangesLevel = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (token === '--required-level') {
      args.requiredLevel = Number.parseInt(argv[i + 1], 10);
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

function parseBetterFormZip(buffer, inputPath) {
  const outerFiles = unzipSync(buffer);
  const innerZipFileName = Object.keys(outerFiles).find((name) => name.toLowerCase().endsWith('.zip'));

  if (innerZipFileName) {
    const innerFiles = unzipSync(outerFiles[innerZipFileName]);
    if (!innerFiles['form-description']) {
      throw new Error(`ZIP does not contain form-description: ${inputPath}`);
    }
    return JSON.parse(strFromU8(innerFiles['form-description']));
  }

  if (outerFiles['form-description']) {
    return JSON.parse(strFromU8(outerFiles['form-description']));
  }

  throw new Error(`Unsupported ZIP format (missing form-description): ${inputPath}`);
}

function loadFormInput(inputPath) {
  const rawBuffer = fs.readFileSync(inputPath);
  const extension = path.extname(inputPath).toLowerCase();

  if (extension === '.zip') {
    return parseBetterFormZip(rawBuffer, inputPath);
  }

  return JSON.parse(rawBuffer.toString('utf8'));
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
  ensureArg(args.form, 'Missing required argument: --form-file <path>');

  const inputPath = path.resolve(process.cwd(), args.form);
  const raw = loadFormInput(inputPath);
  const parsed = parseFormDefinition(raw);
  const categories = args.categories
    ? args.categories.split(',').map((item) => item.trim()).filter(Boolean)
    : undefined;
  const specSource = buildDependencySpec(parsed, {
    categories,
    logicLevel: args.logicLevel,
    calcLevel: args.calcLevel,
    validationLevel: args.validationLevel,
    rangesLevel: args.rangesLevel,
    requiredLevel: args.requiredLevel,
  });

  const fileName = `${toSafeFileName(parsed.name)}.generated.cy.js`;
  const outputPath = path.resolve(
    process.cwd(),
    args.out || path.join('cypress', 'e2e', 'generated', fileName)
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, specSource, 'utf8');
  console.log(`Generated tests for ${categories ? categories.join(', ') : 'default categories'}: ${outputPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
