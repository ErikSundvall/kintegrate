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

  assert.match(spec, /before\(\(\) => \{ cy\.formViewerReady\(\); \}\);/);
  assert.match(spec, /beforeEach\(\(\) => \{ cy\.resetForm\(\); \}\);/);
  assert.match(spec, /cy\.expectHidden\(/);
  assert.match(spec, /cy\.expectVisible\(/);
  assert.doesNotMatch(spec, /cy\.visit\(/);
});

test('parser extracts every statement-action visibility pair from conditions payloads', () => {
  const parsed = parseFormDefinition({
    name: 'Conditions sample',
    children: [
      {
        id: 'section-a',
        conditions: JSON.stringify({
          expressions: [
            {
              statements: [
                { fieldId: 'toggle-a', condition: { value: { value: true } } },
                { fieldId: 'toggle-b', condition: { value: { value: false } } }
              ],
              actions: [
                { action: 'show', target: 'target-a' },
                { action: 'hide', target: 'target-b' }
              ]
            }
          ]
        })
      }
    ]
  });

  assert.equal(parsed.dependencies.length, 4);
  assert.ok(parsed.dependencies.some((rule) => rule.triggerTag === 'toggle-a' && rule.targetTag === 'target-a' && rule.actionName === 'show'));
  assert.ok(parsed.dependencies.some((rule) => rule.triggerTag === 'toggle-b' && rule.targetTag === 'target-b' && rule.actionName === 'hide'));
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
  assert.match(spec, /it\('captures calculation metadata for bmi'/);
  assert.match(spec, /it\('validates bmi is between 10 and 80'/);
  assert.doesNotMatch(spec, /it\.skip\(/);
  assert.match(spec, /it\('requires bmi'/);
  assert.match(spec, /cy\.assertRangeSamples\(/);
  assert.match(spec, /"validSamples":\[/);
  assert.match(spec, /"invalidSamples":\[/);
});

test('logic level 1 skips obvious hide-style rules while level 2 keeps them', () => {
  const parsed = {
    name: 'Logic level sample',
    dependencies: [
      {
        triggerTag: 'toggle-show',
        targetTag: 'section-show',
        showValue: true,
        hideValue: false,
        actionName: 'show',
        description: 'section-show is shown when toggle-show is true'
      },
      {
        triggerTag: 'toggle-hide',
        targetTag: 'section-hide',
        showValue: false,
        hideValue: true,
        actionName: 'hide',
        description: 'section-hide is hidden when toggle-hide is true'
      }
    ],
    calculations: [],
    validations: [],
    valueRanges: [],
    requiredFields: []
  };

  const level1 = buildDependencySpec(parsed, { logicLevel: 1, calcLevel: 0, validationLevel: 0, rangesLevel: 0, requiredLevel: 0 });
  const level2 = buildDependencySpec(parsed, { logicLevel: 2, calcLevel: 0, validationLevel: 0, rangesLevel: 0, requiredLevel: 0 });

  assert.match(level1, /section-show/);
  assert.doesNotMatch(level1, /section-hide/);
  assert.match(level2, /section-show/);
  assert.match(level2, /section-hide/);
});

test('validation and required levels change generated coverage depth', () => {
  const parsed = {
    name: 'Coverage level sample',
    dependencies: [],
    calculations: [],
    validations: [{ field: 'pulse', min: 30, max: 180, minOp: '>=', maxOp: '<=' }],
    valueRanges: [{ field: 'pulse', min: 30, max: 180, minOp: '>=', maxOp: '<=' }],
    requiredFields: [{ field: 'pulse', min: 2 }]
  };

  const level1 = buildDependencySpec(parsed, { logicLevel: 0, calcLevel: 0, validationLevel: 1, rangesLevel: 1, requiredLevel: 1 });
  const level2 = buildDependencySpec(parsed, { logicLevel: 0, calcLevel: 0, validationLevel: 2, rangesLevel: 2, requiredLevel: 2 });

  assert.match(level1, /"validSamples":\[30\]/);
  assert.doesNotMatch(level1, /describe\('ranges', \(\) => \{/);
  assert.match(level2, /"validSamples":\[30,180,105\]/);
  assert.match(level2, /describe\('ranges', \(\) => \{/);
  assert.match(level1, /Array\.from\(\{ length: 1 \}/);
  assert.match(level2, /x'\.repeat\(1\)/);
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

test('CLI accepts per-category scope levels', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kintegrate-generator-levels-'));
  const outFile = path.join(tmpDir, 'generated.cy.js');
  const zipPath = path.join(repoRoot, 'src', 'example', 'forms', formZipFiles[1]);

  const cliResult = spawnSync(
    process.execPath,
    [
      path.join(repoRoot, 'test-generator', 'generate-cli.js'),
      '--form-file', zipPath,
      '--out', outFile,
      '--logic-level', '2',
      '--calc-level', '0',
      '--validation-level', '1',
      '--ranges-level', '0',
      '--required-level', '1'
    ],
    { encoding: 'utf8' }
  );

  assert.equal(cliResult.status, 0, cliResult.stderr || cliResult.stdout);
  const generated = fs.readFileSync(outFile, 'utf8');
  assert.match(generated, /describe\('logic', \(\) => \{/);
  assert.match(generated, /describe\('validation', \(\) => \{/);
  assert.match(generated, /describe\('required', \(\) => \{/);
  assert.doesNotMatch(generated, /describe\('calc', \(\) => \{/);
  assert.doesNotMatch(generated, /describe\('ranges', \(\) => \{/);
});
