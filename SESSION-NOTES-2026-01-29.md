# Session Notes - January 29, 2026

## Summary

This session focused on several areas building up to form renderer integration:
1. Setting up documentation caching infrastructure for Better Form Renderer
2. Creating AI agent guidelines and reference documentation
3. Implementing form loading from ZIP packages (Better Studio format)
4. Creating a popup window form viewer for CSS isolation
5. Fixing layout issues after changes broke the original app
6. Moving CodeMirror from CDN to local vendor files

---

## Part 1: Documentation Caching Infrastructure

### Created `docs-cache/` Directory Structure

**Purpose:** Cache Better Platform documentation for offline AI agent reference (excluded from Git).

```
docs-cache/
├── BETTER-FORM-RENDERER-REFERENCE.md   # AI-optimized comprehensive reference
├── form-renderer/                       # Downloaded HTML docs from Better
│   ├── overview.html
│   ├── installation.html
│   ├── events.html
│   ├── form-context.html
│   ├── script-api/
│   ├── angular/, react/, vue/
│   └── framework-agnostic/
└── tietoevry-cdr/                      # Manually saved TietoEvry docs
    └── Developer guide _ Lifecare Open Platform.html
```

### Created `scripts/download-docs.js`

**Purpose:** Automated script to download Better Form Renderer documentation.

**Features:**
- Crawls `https://docs.better.care/studio/form-renderer/` recursively
- Saves HTML files preserving directory structure
- Rate-limited (500ms between requests)
- Creates index file listing all downloaded pages

**Usage:** `npm run download:docs`

### Created `FETCHING-DOCS.md`

**Purpose:** Instructions for refreshing cached documentation.

**Contents:**
- Automated download instructions for Better docs
- Manual download instructions for TietoEvry (JS-based site can't be scripted)
- Notes about recreating the AI reference document

### Created `docs-cache/BETTER-FORM-RENDERER-REFERENCE.md`

**Purpose:** Comprehensive AI-optimized reference synthesized from cached docs.

**Sections:**
- Overview and key concepts
- Installation (npm, private registry)
- Basic usage patterns
- Configuration (`EhrFormContext`) properties table
- Events (onValueChange, onFormRendered, onFormError, etc.)
- Composition operations (save, update, validate)
- ScriptApi reference (getValue, setValue, subscribe, etc.)
- Form package structure (ZIP format)
- Offline mode usage

**Created by prompt:**
> "Make a comprehensive but efficiently/compactly worded markdown file in docs-cache for use/reading by AI agents intended for understanding Better's form format and form-renderer usage."

### Created `AGENTS.md`

**Purpose:** Guidelines for AI agents working with this project.

**Contents:**
- Pointer to Better Form Renderer documentation
- Form Renderer integration notes (package, auth, vendor files)
- Build system commands
- Project structure overview
- Useful external resources (Handlebars, CodeMirror, Tree.js)
- Contributing guidelines

---

## Part 2: Vendor File Setup

### Better Form Renderer Files

**Source:** `@better/form-renderer` npm package (private registry)

**Destination:** `src/vendor/`
```
src/vendor/
├── form-renderer.js      # Main renderer script
├── styles.css            # Base styles
├── styles-theme.css      # Theme styles
├── package.json          # Package metadata
└── Roboto-Regular.woff2  # Font file
```

**Setup command:** `npm run setup:vendor` (copies from node_modules)

**Note:** These files are proprietary and excluded from Git.

### Created `.npmrc`

**Purpose:** Configure npm to use Better's private registry.

```
//hub.better.care/npm/:_authToken=${NPM_BETTER_AUTH}
@better:registry=https://hub.better.care/npm/
```

---

## Part 3: Form ZIP Package Loading

## Part 3: Form ZIP Package Loading

### Better Studio Form Package Structure

Discovered that Better Studio exports forms as nested ZIP packages:

```
FormName_VERSION_FORM.zip (outer package)
├── package-manifest.json           # Package index, points to inner ZIP
├── FormName_VERSION_FORM.zip       # Inner ZIP with actual form files
└── TemplateName_TEMPLATE.opt       # Optional openEHR template

Inner FORM.zip contains:
├── manifest.json                   # Form metadata (name, version, etc.)
├── form-description                # Main UI definition (JSON)
├── form-environment                # Variables, APIs, dependencies
├── form-layout                     # Layout settings
├── app-pages                       # Multi-page form structure
├── widget-configuration            # Widget settings
└── summary-pages                   # Summary page definitions
```

### Implemented ZIP Loading Functions

**In `src/index.html`:**

1. `loadFormFromZip(file)` - Entry point, detects package type
2. `loadBetterFormPackage(zip)` - Handles nested ZIP structure
3. `loadFormFromInnerZip(innerZip, packageManifest)` - Extracts all form components
4. `loadSimpleFormZip(zip)` - Fallback for non-Better ZIP files

**Test file:** `src/example/forms/24oktDemo_1_0_4_FORM.zip`

---

## Part 4: Form Viewer Implementation

## Files Modified

### New Files Created

| File | Purpose |
|------|---------|
| `AGENTS.md` | AI agent guidelines for working with this project |
| `FETCHING-DOCS.md` | Instructions for refreshing cached documentation |
| `docs-cache/BETTER-FORM-RENDERER-REFERENCE.md` | Comprehensive AI reference |
| `scripts/download-docs.js` | Script to download Better docs |
| `src/form-viewer.html` | Standalone popup window for rendering Better forms with CSS isolation |
| `scripts/build.js` | Node.js build script (replaces PowerShell) with vendor file handling |
| `src/vendor/codemirror/` | Local CodeMirror 5 files (MIT licensed) |
| `.npmrc` | NPM configuration for Better's private registry |

### Modified Files

| File | Changes |
|------|---------|
| `src/index.html` | Form loading logic, ZIP extraction, popup window support, CodeMirror local paths |
| `src/kintegrate.css` | Added `#form-container` and `#form-footer` styles |
| `scripts/build.js` | Added `allowedVendorDirs` config to include open-source vendor files |
| `package.json` | Added `codemirror@5.65.16` dependency, npm scripts for docs/vendor |
| `.gitignore` | Added `docs-cache/`, `src/vendor/` exclusions |
| `README.md` | Updated with form renderer setup instructions |

---

## Part 5: Detailed Code Changes

### 1. Form Viewer Popup Window (`src/form-viewer.html`)

**Purpose:** Render Better forms in a separate browser window to avoid CSS conflicts with the main app and enable easier Cypress testing.

**Features:**
- Standalone HTML page with Better Form Renderer
- Receives form data via `postMessage` from parent window
- Toolbar buttons: "Get Data" (clipboard), "Send to Kintegrate" (postMessage), "Clear"
- Handles message types: `loadForm`, `getComposition`
- Sends back: `formViewerReady`, `formLoaded`, `formComposition`, `formViewerClosed`, `formError`

**Communication Protocol:**
```javascript
// Parent → Popup
{ type: 'loadForm', formData: {...}, formName: '...' }
{ type: 'getComposition' }

// Popup → Parent
{ type: 'formViewerReady' }
{ type: 'formComposition', composition: {...} }
{ type: 'formViewerClosed' }
```

### 2. Main App Form Integration (`src/index.html`)

**Form Column UI:**
- Restored embedded `<form-renderer>` web component (was accidentally removed)
- Added "🔲 Popup" button to open form in separate window
- Kept "Get Data →" button for embedded renderer
- "Load from File" loads into embedded renderer AND stores for popup

**JavaScript Changes:**
- Added `formViewerWindow`, `currentFormData`, `currentFormName` state variables
- Added `openFormViewerWindow()` function
- Added `loadFormIntoRenderer()` function for embedded renderer
- Added `window.addEventListener('message', ...)` for popup communication
- ZIP loading logic unchanged (handles Better Studio nested ZIP packages)

**Key Functions:**
- `loadFormFromZip(file)` - Detects Better Studio package format
- `loadBetterFormPackage(zip)` - Handles nested ZIP structure
- `loadFormFromInnerZip(innerZip, packageManifest)` - Extracts form-description, manifest, form-environment, etc.

### 3. CodeMirror Local Loading

**Problem:** CDN loading was unreliable, causing layout issues.

**Solution:** Installed CodeMirror via npm and copied to vendor folder.

**Files in `src/vendor/codemirror/`:**
```
codemirror.css
codemirror.js
addon/mode/simple.js
mode/xml/xml.js
mode/javascript/javascript.js
mode/htmlmixed/htmlmixed.js
mode/handlebars/handlebars.js
```

**HTML Changes:**
```html
<!-- Before (CDN) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>

<!-- After (Local) -->
<link rel="stylesheet" href="vendor/codemirror/codemirror.css">
<script src="vendor/codemirror/codemirror.js"></script>
```

### 4. Build Script Updates (`scripts/build.js`)

**New Config:**
```javascript
const config = {
    excludeDirs: includeVendor ? [] : ['vendor'],
    allowedVendorDirs: ['codemirror'],  // NEW: Open source libs to include
    // ...
};
```

**New Functions:**
- `copyAllowedVendorDirs(vendorSrc, vendorDest)` - Copies only allowed vendor subdirectories
- `copyDirRecursive(src, dest)` - Simple recursive copy without exclusion checks

**Behavior:**
- Default build excludes proprietary `vendor/` files (form-renderer, styles)
- BUT includes open-source `vendor/codemirror/` files
- Use `--include-vendor` flag for full build with proprietary files

---

## Commands Used

```powershell
# Install CodeMirror
npm install codemirror@5.65.16

# Create vendor directories
mkdir src/vendor/codemirror
mkdir src/vendor/codemirror/mode
mkdir src/vendor/codemirror/addon/mode

# Copy CodeMirror files from node_modules
Copy-Item node_modules/codemirror/lib/codemirror.js src/vendor/codemirror/
Copy-Item node_modules/codemirror/lib/codemirror.css src/vendor/codemirror/
Copy-Item -Recurse node_modules/codemirror/mode/xml src/vendor/codemirror/mode/
Copy-Item -Recurse node_modules/codemirror/mode/javascript src/vendor/codemirror/mode/
Copy-Item -Recurse node_modules/codemirror/mode/htmlmixed src/vendor/codemirror/mode/
Copy-Item -Recurse node_modules/codemirror/mode/handlebars src/vendor/codemirror/mode/
Copy-Item node_modules/codemirror/addon/mode/simple.js src/vendor/codemirror/addon/mode/

# Build and test
npm run build
npm run dev
```

---

## NPM Scripts Added

```json
{
  "scripts": {
    "build": "node scripts/build.js",
    "build:full": "node scripts/build.js --include-vendor",
    "serve": "npx serve docs/demo",
    "dev": "npx serve src",
    "setup:vendor": "node -e \"...copies @better/form-renderer to src/vendor...\"",
    "download:docs": "node scripts/download-docs.js"
  }
}
```

---

## Issues Encountered & Resolutions

### Issue 1: Layout Broken After Popup Changes
**Cause:** Accidentally replaced the embedded `<form-renderer>` with an info panel, breaking the original column structure.
**Fix:** Restored the original HTML structure with `<form-renderer>` inside `#form-renderer-wrapper`.

### Issue 2: Form Not Visible
**Cause:** Multiple potential issues - CSS conflicts, missing `ehrServerUrl` initialization, CDN loading failures.
**Fix:** 
1. Added popup window option for CSS isolation
2. Ensured `ehrServerUrl` is set before loading forms
3. Moved CodeMirror to local files

### Issue 3: CodeMirror Not Loading
**Cause:** CDN requests may have been blocked or slow.
**Fix:** Installed via npm and served locally from `vendor/codemirror/`.

---

## Testing Notes

- Dev server: `npm run dev` (serves from `src/`)
- Production build: `npm run build` (outputs to `docs/demo/`)
- Form test file: `src/example/forms/24oktDemo_1_0_4_FORM.zip`

---

## Next Steps (TODO)

1. Test form rendering in both embedded and popup modes
2. Verify Cypress can target the popup window
3. Consider making popup the default if CSS conflicts persist
4. Add error handling for when popup is blocked
5. Investigate why forms don't render visibly (may need further debugging)

---

## Git Status at End of Session

```
Modified:
 M .gitignore
 M README.md
 M docs/demo/index.html
 M docs/demo/kintegrate.css
 M src/index.html
 M src/kintegrate.css

New (untracked):
 ?? .npmrc
 ?? AGENTS.md
 ?? FETCHING-DOCS.md
 ?? docs-cache/                    (ignored, not in git)
 ?? package.json
 ?? package-lock.json
 ?? scripts/build.js
 ?? scripts/download-docs.js
 ?? src/example/forms/
 ?? src/form-viewer.html
 ?? src/vendor/                    (partially ignored)
```

**Note:** `docs-cache/` and proprietary `src/vendor/` files are in `.gitignore`
