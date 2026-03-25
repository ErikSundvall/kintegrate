# Test Generation Algorithm

## Purpose

This note documents the current automated test generation flow for Better forms and the scope semantics implemented in the shared generator core.

## Current Inputs

- Better Studio form package as `.zip` or unpacked JSON.
- `form-description` from the Better package.
- Optional `webTemplate` JSON when the source is template-oriented rather than form-definition-oriented.

## Current Code Paths

### Browser tester

- [src/cypress-form-tester.html](src/cypress-form-tester.html)
- Uses the shared core in [src/test-generation-core.js](src/test-generation-core.js).
- Loads JSON or Better ZIP in the browser with `fflate`.
- Keeps manual range rows and editor/table state in browser-local code.
- Generates Cypress code in the editor.
- Can open from [src/form-viewer.html](src/form-viewer.html) and receive loaded form data via `postMessage`.

### CLI generator

- [test-generator/generate-cli.js](test-generator/generate-cli.js)
- Uses [test-generator/parser.js](test-generator/parser.js) and [test-generator/generator.js](test-generator/generator.js).
- Those files are now thin wrappers around [src/test-generation-core.js](src/test-generation-core.js).
- Loads ZIP or JSON from disk.
- Writes generated Cypress specs into `cypress/e2e/generated` by default.

## Important Separation

- The form viewer runtime does not import [test-generator/parser.js](test-generator/parser.js).
- The browser tester no longer keeps a separate parsing/generation algorithm.
- Parser changes in `test-generator/` affect the CLI and unit tests, not the form-viewer runtime directly.
- The main shared maintenance surface is [src/test-generation-core.js](src/test-generation-core.js).

## Current Discovery Algorithm

### Input unpacking

1. If the source is a Better ZIP, unpack the outer ZIP.
2. If an inner ZIP exists, unpack that as well.
3. Read `form-description`.
4. Parse JSON.

### Rule categories discovered today

1. Logic rules
2. Calculation metadata
3. Validation ranges
4. Value-range metadata
5. Required field/cardinality rules

### Logic rule extraction

- Reads `viewConfig.annotations.conditions`.
- Parses `conditions.expressions`.
- Iterates all statement/action pairs in each expression when they can be normalized into a simple visibility rule.
- Extracts:
	- triggering field id
	- target field id
	- show/hide trigger values
	- action name
	- simple description text

### Validation and range extraction

- Reads `node.validation.range`.
- Reads `node.inputs[].validation.range`.
- Creates min/max-based validation and value-range rules.
- DV_QUANTITY is handled specially in the CLI parser by splitting unit-specific ranges.

### Calculation extraction

- Scans object keys matching `calculation|formula|derived`.
- Keeps field identifier and expression text.

### Required rule extraction

- Uses `node.min > 0`.
- Stores the field and its minimum cardinality.

### Deduplication

- Shared core deduplicates by signatures per rule type.

## Current Generation Algorithm

### Category selection

- UI scope levels exist for `logic`, `calc`, `validation`, `ranges`, and `required`.
- `0` means off.
- `1` means baseline review-friendly coverage.
- `2` means broader coverage.
- `3` is still reserved and not implemented with distinct behavior yet.

### Test emission

- Logic:
	- level 1 includes non-obvious `show`-style visibility rules
	- level 2 also includes the more obvious `hide`-style reversals
- Calculations: generate metadata existence checks from the shared core.
- Validation:
	- level 1 emits one representative valid sample and one invalid sample
	- level 2 emits richer lower/upper/midpoint coverage and respects inclusive/exclusive bounds
- Ranges:
	- level 1 stays out of the way when validation coverage is already enabled
	- level 2 emits metadata-oriented range assertions, including DV_QUANTITY unit expectations
	- manual browser-entered range cases are still appended when range generation is enabled
- Required:
	- level 1 emits concise baseline cardinality checks
	- level 2 also distinguishes string and collection cardinality behavior more explicitly

### Browser output structure

- Produces grouped `describe()` sections named by category.
- Preserves non-generated custom groups already present in the editor.
- Appends custom-step comments after generated sections.

## Current Limitations

1. Default visibility state is still not modeled explicitly.
2. Logic generation still uses a generic hide-then-show execution pattern once a rule is selected.
3. Calculation tests are still metadata checks rather than behavioral verification.
4. Level 3 remains intentionally unimplemented.

## Why Level 1 Needs To Change

Level 1 should represent sensible coverage, not maximal coverage.

That means:

- Do not generate tests that only prove the obvious default rendering of already-visible content.
- Prefer tests that exercise meaningful logic transitions, constraints, or derived behavior.
- Keep generated tests readable enough for informaticians to review.

Example:

- If a field is visible by default and no realistic level-1 scenario should make it invisible, do not generate a level-1 test that first forces it hidden just to prove it can become visible again.

## Proposed Scope Semantics

### Level 0

- Do not generate that category.

### Level 1

- Generate non-obvious, review-friendly baseline tests.
- Favor clinically or behaviorally meaningful transitions.
- Avoid synthetic reversals that only test UI defaults.

Suggested per category:

- Logic:
	- Include rules where a trigger causes a meaningful visibility change.
	- Prefer cases where the target is conditionally revealed or suppressed in normal use.
	- Exclude trivial “already visible by default” proofs unless the form definition indicates real conditional visibility.
- Validation:
	- Include one representative valid case and one representative invalid case per meaningful constraint.
	- Avoid exhaustive boundary permutations.
- Ranges:
	- Include one concise metadata/range check when it adds value.
	- Avoid duplicating validation coverage if the validation test already proves the rule well enough (and validation test generation level is not set to 0).
- Required:
	- Include only truly required inputs with clear user-facing importance.
	- Skip weak or purely structural requirements that are not useful to review at baseline.
- Calculations:
	- Prefer smoke-level checks for important derived fields.
	- Avoid generating large numbers of metadata-only checks for minor derived expressions.

### Level 2

- Generate broader behavioral coverage.
- Add more boundary and transition cases.

Suggested per category:

- Logic:
	- Include both enabling and disabling transitions when both are meaningful.
	- Add checks for state restoration or dependent section combinations where useful.
- Validation:
	- Add lower and upper boundary cases.
	- Include exclusive vs inclusive boundary distinctions where known.
- Ranges:
	- Include unit-specific cases for DV_QUANTITY when present.
- Required:
	- Add collection/string cardinality distinctions.
- Calculations:
	- Add a few behavioral input/output examples for high-value formulas.

### Level 3

- Generate exhaustive or edge-oriented coverage.
- Accept more synthetic cases and broader combinatorics.

Suggested per category:

- Logic:
	- Include more permutations across multiple dependencies.
	- Include explicit reverse transitions and reset scenarios.
- Validation:
	- Include dense boundary and edge-case sampling.
	- Include malformed input classes where supported.
- Ranges:
	- Include exhaustive unit/range combinations.
- Required:
	- Include more edge representations of missing/partial values.
- Calculations:
	- Include edge-case arithmetic, null propagation, and dependent recalculation sequences.

## Suggested Near-Term Algorithm Refinements

1. Keep the discovered-rules table as the review surface.
2. Use row-level enable/disable to suppress unhelpful generated tests before export.
3. Introduce explicit per-rule metadata for:
	 - rule kind
	 - field/trigger/target identifiers
	 - form/template path
	 - default inclusion recommendation per scope level
4. Add a future pass that estimates whether a logic rule is meaningful at level 1 by considering default visibility and realistic transitions.
5. Align the browser and CLI parser outputs around a shared normalized rule shape even if implementation remains in two code paths.
5. Keep manual browser-only range cases outside the shared core so CLI and browser stay aligned on normalized discovered rules without mixing in DOM state.

## In Scope For The Current Refactor

- Make discovered rules easier to sort and group.
- Add row-level enable/disable.
- Unify browser and CLI parsing/generation in one shared core.
- Implement distinct level 0, 1, and 2 semantics.

## Out Of Scope For This Pass

- Cross-form or cross-template reasoning.
- Deep behavioral calculation verification.
- Default-visibility inference from rendered form state.
- Level 3 coverage expansion.
