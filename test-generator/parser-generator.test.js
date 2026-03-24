const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { unzipSync, strFromU8 } = require('fflate');

const { parseFormDefinition } = require('./parser');
const { buildDependencySpec } = require('./generator');

const repoRoot = path.resolve(__dirname, '..');
const formZipFiles = [
  '24oktDemo_1_0_4_FORM.zip',
  'MDK_Lungcancer_1_0_329_FORM.zip',
  'MDK_Rek_demo_1_0_131_FORM.zip'
];

function loadFormDescriptionFromBetterZip(zipPath) {
  const outerFiles = unzipSync(fs.readFileSync(zipPath));
  const innerZipFileName = Object.keys(outerFiles).find((name) => name.toLowerCase().endsWith('.zip'));

  assert.ok(innerZipFileName, `Expected nested form ZIP in ${path.basename(zipPath)}`);
  const innerFiles = unzipSync(outerFiles[innerZipFileName]);
  assert.ok(innerFiles['form-description'], `Missing form-description in ${path.basename(zipPath)}`);
  return JSON.parse(strFromU8(innerFiles['form-description']));
}

test('parser extracts dependency visibility rules from all bundled Better form ZIP examples', () => {
  for (const fileName of formZipFiles) {
    const zipPath = path.join(repoRoot, 'src', 'example', 'forms', fileName);
    const formDescription = loadFormDescriptionFromBetterZip(zipPath);
    const parsed = parseFormDefinition(formDescription);

    assert.equal(formDescription.rmType, 'FORM_DEFINITION');
    assert.ok(
      parsed.dependencies.length > 0,
      `Expected at least one dependency in parsed output for ${fileName}`
    );
  }
});

test('generator builds Cypress specs with expected command flow from parsed Better conditions', () => {
  const zipPath = path.join(repoRoot, 'src', 'example', 'forms', formZipFiles[0]);
  const formDescription = loadFormDescriptionFromBetterZip(zipPath);
  const parsed = parseFormDefinition(formDescription);
  const spec = buildDependencySpec(parsed);

  assert.match(spec, /cy\.visit\('\/form-viewer\.html#testMode=1&autoLoad=1'\)/);
  assert.match(spec, /cy\.formViewerReady\(\)/);
  assert.match(spec, /cy\.expectHidden\(/);
  assert.match(spec, /cy\.expectVisible\(/);
});

test('parser extracts validation, value range, required and calculation metadata', () => {
  const parsed = parseFormDefinition({
    name: 'Metadata sample',
    id: 'root',
    min: 1,
    children: [
      {
        id: 'calculated-score',
        calculation: 'a + b'
      },
      {
        id: 'vitals/hr',
        min: 1,
        validation: {
          range: {
            min: 30,
            max: 220
          }
        }
      }
    ]
  });

  assert.ok(parsed.requiredFields.some((rule) => rule.field === 'root'));
  assert.ok(parsed.requiredFields.some((rule) => rule.field === 'vitals/hr'));
  assert.ok(parsed.calculations.some((rule) => rule.field === 'calculated-score'));
  assert.ok(parsed.validations.some((rule) => rule.field === 'vitals/hr' && rule.min === 30 && rule.max === 220));
  assert.ok(parsed.valueRanges.some((rule) => rule.field === 'vitals/hr' && rule.min === 30 && rule.max === 220));
});

test('parser deduplicates repeated rules by signature', () => {
  const parsed = parseFormDefinition({
    name: 'Dedup sample',
    children: [
      {
        id: 'pulse',
        min: 1,
        validation: {
          range: {
            min: 30,
            max: 180,
            minOp: '>=',
            maxOp: '<='
          }
        }
      },
      {
        id: 'pulse',
        min: 1,
        validation: {
          range: {
            min: 30,
            max: 180,
            minOp: '>=',
            maxOp: '<='
          }
        }
      }
    ]
  });

  assert.equal(parsed.validations.length, 1);
  assert.equal(parsed.valueRanges.length, 1);
  assert.equal(parsed.requiredFields.length, 1);
});

test('generator includes selected categories in generated Cypress spec output', () => {
  const spec = buildDependencySpec(
    {
      name: 'Category sample',
      dependencies: [],
      calculations: [{ field: 'bmi', expression: 'weight / (height * height)' }],
      validations: [{ field: 'bmi', min: 10, max: 80 }],
      valueRanges: [{ field: 'bmi', min: 10, max: 80 }],
      requiredFields: [{ field: 'bmi', min: 1 }]
    },
    { categories: ['calculations', 'validations', 'value-ranges', 'required-fields'] }
  );

  assert.match(spec, /describe\('calc', \(\) => \{/);
  assert.match(spec, /describe\('validation', \(\) => \{/);
  assert.match(spec, /describe\('required', \(\) => \{/);
  assert.match(spec, /it\('\[calc\] bmi metadata exists'/);
  assert.match(spec, /it\('\[validation\] bmi #1'/);
  assert.doesNotMatch(spec, /it\.skip\(/);
  assert.match(spec, /it\('\[required\] bmi min 1'/);
  assert.match(spec, /cy\.assertRangeSamples\(/);
  assert.match(spec, /"validSamples":\[/);
  assert.match(spec, /"invalidSamples":\[/);
});

test('CLI generates Cypress e2e output from a real Better form-description file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kintegrate-generator-test-'));
  const outFile = path.join(tmpDir, 'generated.cy.js');

  const zipPath = path.join(repoRoot, 'src', 'example', 'forms', formZipFiles[1]);

  const cliResult = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'test-generator', 'generate-cli.js'), '--form-file', zipPath, '--out', outFile],
    { encoding: 'utf8' }
  );

  assert.equal(cliResult.status, 0, cliResult.stderr || cliResult.stdout);
  assert.ok(fs.existsSync(outFile), 'Expected CLI to create output Cypress spec');

  const generated = fs.readFileSync(outFile, 'utf8');
  assert.match(generated, /autogenerated form tests/);
  assert.match(generated, /cy\.fillField\(/);
});
