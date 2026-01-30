# Implementation Plan: Form Renderer Popup Integration (v3)

**Goal:** Add Better Form Renderer functionality to Kintegrate using a popup window approach, with real-time sync mode for instant feedback loop.

**Status:** Phases 1, 2 & 3 ✅ COMPLETE

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN APP (3 columns)                           │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   INPUT COLUMN      │  CONVERSION COLUMN  │      OUTPUT COLUMN              │
│                     │                     │                                 │
│  ┌───────────────┐  │  ┌───────────────┐  │  ┌───────────────────────────┐  │
│  │ Composition   │  │  │  Handlebars   │  │  │   Converted Output        │  │
│  │ Instance      │◄─┼──┼─ Template     ─┼──┼─►│   (JSON/XML/etc)          │  │
│  │ (JSON)        │  │  │               │  │  │                           │  │
│  └───────┬───────┘  │  └───────────────┘  │  └───────────────────────────┘  │
│          │          │                     │                                 │
│    ▲     │ Push     │                     │                                 │
│    │     ▼          │                     │                                 │
│  SYNC  ┌────┐       │                     │                                 │
│  MODE  │Send│       │                     │                                 │
│    │   │ to │       │                     │                                 │
│    │   │Form│       │                     │                                 │
└────┼───┴────┴───────┴─────────────────────┴─────────────────────────────────┘
     │
     │ postMessage API
     ▼
┌─────────────────────────────────────────┐
│        POPUP: Form Viewer               │
│  ┌───────────────────────────────────┐  │
│  │  📦 Load Form Package (.zip/.json)│  │  ◄── Form loading happens HERE
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │    Better Form Renderer           │  │
│  │    (Web Component)                │  │
│  │                                   │  │
│  │    On any change ──────────────►  │  │ ──► Sends COMPOSITION_CHANGED
│  │                                   │  │      to main app (if in sync mode)
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Input column = Composition instances** (not form definitions)
- **Form loading in popup** (decoupled, swappable renderer)
- **Sync mode** = real-time updates from form → input → conversion → output
- **Manual mode** = explicit push/pull with buttons

---

## Phase 1: Basic Popup Infrastructure (Test Communication) ✅ COMPLETE

### Step 1.1: Add "Open Form Viewer" Button to Main App ✅

**File:** `src/index.html`

**Changes:**
Add a button to the input column header area for launching the form viewer popup.

**Location:** Near the example-select button in input column

**Code to add:**
```html
<button id="open-form-viewer-btn" title="Open EHR form viewer in popup window">
  📋 Form Viewer
</button>
```

### Step 1.2: Add Basic Popup Communication Code

**File:** `src/index.html` (in script section)

**Code to add:**
```javascript
// ============================================
// Form Viewer Popup Management
// ============================================
let formViewerWindow = null;
let syncModeEnabled = false;

function openFormViewer() {
  // Focus existing if open
  if (formViewerWindow && !formViewerWindow.closed) {
    formViewerWindow.focus();
    return;
  }
  
  // Open new popup
  const width = 900;
  const height = 700;
  const left = window.screenX + window.innerWidth - 50;
  const top = window.screenY + 50;
  
  formViewerWindow = window.open(
    'form-viewer.html',
    'FormViewer',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

// Listen for messages from popup
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  
  const { type, payload } = event.data || {};
  console.log('[Main] Received message:', type);
  
  switch (type) {
    case 'FORM_VIEWER_READY':
      console.log('[Main] Form viewer is ready');
      // Notify popup of current sync mode
      sendToFormViewer('SYNC_MODE_STATUS', { enabled: syncModeEnabled });
      break;
      
    case 'COMPOSITION_CHANGED':
      // Real-time update from form (sync mode)
      if (syncModeEnabled) {
        updateInputFromComposition(payload.composition);
      }
      break;
      
    case 'COMPOSITION_DATA':
      // Response to explicit REQUEST_COMPOSITION
      updateInputFromComposition(payload.composition);
      break;
      
    case 'REQUEST_PING':
      sendToFormViewer('PONG', { timestamp: Date.now() });
      break;
  }
});

function sendToFormViewer(type, payload) {
  if (formViewerWindow && !formViewerWindow.closed) {
    formViewerWindow.postMessage({ type, payload }, window.location.origin);
  }
}
```

### Step 1.3: Wire Up the Button

**File:** `src/index.html` (in DOMContentLoaded)

```javascript
document.getElementById('open-form-viewer-btn')?.addEventListener('click', openFormViewer);
```

### Step 1.4: Test Communication

**Manual test:**
1. Run `npm run dev`
2. Click "Form Viewer" button
3. Popup should open with form-viewer.html
4. Check browser console for `FORM_VIEWER_READY` message
5. Verify ping/pong works

**Checkpoint:** ✅ Button opens popup, console shows message exchange

---

## Phase 2: Input Column Enhancements (Composition Handling) ✅ COMPLETE

### Step 2.1: Add Download Button for Current Instance ✅

**File:** `src/index.html`

**Changes:** Add a download button in input column to save current composition

**Code to add (near input controls):**
```html
<button id="download-instance-btn" title="Download current instance as JSON file">
  💾 Download
</button>
```

### Step 2.2: Implement Download Function

**File:** `src/index.html` (script section)

```javascript
function downloadCurrentInstance() {
  const content = inputEditor ? inputEditor.getValue() : 
                  document.getElementById('inputInstance').value;
  
  if (!content || content.trim() === '') {
    alert('No instance data to download');
    return;
  }
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const filename = `composition-${timestamp}.json`;
  
  // Create download
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('download-instance-btn')?.addEventListener('click', downloadCurrentInstance);
```

### Step 2.3: Add "Push to Form" Button

**File:** `src/index.html`

**Code to add (in input column controls):**
```html
<button id="push-to-form-btn" title="Send current instance to form viewer">
  → Push to Form
</button>
```

### Step 2.4: Add "Pull from Form" Button

**File:** `src/index.html`

**Code to add (in input column controls):**
```html
<button id="pull-from-form-btn" title="Get current composition from form viewer">
  ← Pull from Form
</button>
```

### Step 2.5: Implement Push Function

**File:** `src/index.html` (script section)

```javascript
function pushToForm() {
  const content = inputEditor ? inputEditor.getValue() : 
                  document.getElementById('inputInstance').value;
  
  if (!content || content.trim() === '') {
    alert('No instance data to push');
    return;
  }
  
  try {
    const composition = JSON.parse(content);
    
    // Open form viewer if not open
    if (!formViewerWindow || formViewerWindow.closed) {
      openFormViewer();
      // Wait for window to load, then send
      setTimeout(() => {
        sendToFormViewer('LOAD_COMPOSITION', { composition });
      }, 1500);
    } else {
      sendToFormViewer('LOAD_COMPOSITION', { composition });
    }
  } catch (e) {
    alert('Instance is not valid JSON: ' + e.message);
  }
}

document.getElementById('push-to-form-btn')?.addEventListener('click', pushToForm);
```

### Step 2.6: Implement Pull Function

**File:** `src/index.html` (script section)

```javascript
function pullFromForm() {
  if (!formViewerWindow || formViewerWindow.closed) {
    alert('Form viewer is not open');
    return;
  }
  
  // Request composition from popup
  sendToFormViewer('REQUEST_COMPOSITION', {});
  // Response will be handled by message listener (COMPOSITION_DATA)
}

document.getElementById('pull-from-form-btn')?.addEventListener('click', pullFromForm);
```

**Checkpoint:** ✅ Can download instance, push to form, pull from form

---

## Phase 3: Form Loading in Popup (Decoupled) ✅ COMPLETE

*Moved earlier because we need a form loaded to properly test Push/Pull and Sync features.*

### Step 3.1: Add JSZip Library to Popup

**File:** `src/form-viewer.html` (head section)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
```

### Step 3.2: Add Form Loading UI to Popup Toolbar

**File:** `src/form-viewer.html`

**Changes:** Add file input button in popup toolbar

**Code to add in toolbar:**
```html
<input type="file" id="form-package-input" accept=".zip,.json" style="display: none;">
<button id="load-form-btn" title="Load Better Studio form package">
  📦 Load Form
</button>
```

### Step 3.3: Implement Form Package Loading

**File:** `src/form-viewer.html` (script section)

```javascript
// Wire up load button
document.getElementById('load-form-btn')?.addEventListener('click', () => {
  document.getElementById('form-package-input')?.click();
});

document.getElementById('form-package-input')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  try {
    setStatus('Loading form package...', '');
    
    if (file.name.endsWith('.zip')) {
      await loadFormPackageZip(file);
    } else if (file.name.endsWith('.json')) {
      await loadFormPackageJson(file);
    }
  } catch (err) {
    console.error('[Popup] Error loading form package:', err);
    setStatus('Failed to load: ' + err.message, 'error');
  }
});

async function loadFormPackageZip(file) {
  const arrayBuffer = await file.arrayBuffer();
  const outerZip = await JSZip.loadAsync(arrayBuffer);
  
  // Better Studio exports nested ZIP structure
  let innerZipFile = null;
  for (const filename of Object.keys(outerZip.files)) {
    if (filename.endsWith('.zip') && !outerZip.files[filename].dir) {
      innerZipFile = outerZip.files[filename];
      break;
    }
  }
  
  let packageZip = innerZipFile 
    ? await JSZip.loadAsync(await innerZipFile.async('arraybuffer'))
    : outerZip;
  
  // Read package-manifest.json
  const manifestFile = packageZip.file('package-manifest.json');
  if (!manifestFile) {
    throw new Error('No package-manifest.json found');
  }
  
  const manifest = JSON.parse(await manifestFile.async('text'));
  console.log('[Popup] Manifest:', manifest);
  
  // Read main form definition
  const formDefFile = packageZip.file(manifest.main);
  if (!formDefFile) {
    throw new Error(`Form file not found: ${manifest.main}`);
  }
  
  const formDefinition = JSON.parse(await formDefFile.async('text'));
  
  // Load into renderer
  loadFormDefinitionIntoRenderer(formDefinition, manifest);
}

async function loadFormPackageJson(file) {
  const text = await file.text();
  const formDefinition = JSON.parse(text);
  loadFormDefinitionIntoRenderer(formDefinition, { name: file.name, version: '1.0.0' });
}

function loadFormDefinitionIntoRenderer(formDefinition, manifest) {
  console.log('[Popup] Loading form definition:', manifest.name);
  
  // The form renderer uses webTemplate property for the form definition
  formRenderer.webTemplate = formDefinition;
  
  // Update UI
  formNameEl.textContent = `${manifest.name} v${manifest.version}`;
  document.title = `Form: ${manifest.name} - Kintegrate`;
  
  console.log('[Popup] Form loaded:', manifest.name);
}
```

**Checkpoint:** ✅ Can load .zip/.json form packages in popup, form renders

---

## Phase 4: Sync Mode (Real-time Updates) ⬅️ CURRENT

### Step 3.1: Add Sync Mode Toggle

**File:** `src/index.html`

**Changes:** Add toggle button for sync mode in input column

**Code to add:**
```html
<button id="sync-mode-btn" class="sync-off" title="Toggle sync mode - auto-update from form changes">
  🔄 Sync: OFF
</button>
```

**CSS to add (in styles or kintegrate.css):**
```css
#sync-mode-btn.sync-off {
  background: #f5f5f5;
  color: #666;
}
#sync-mode-btn.sync-on {
  background: #4CAF50;
  color: white;
}
```

### Step 3.2: Implement Sync Mode Toggle

**File:** `src/index.html` (script section)

```javascript
function toggleSyncMode() {
  syncModeEnabled = !syncModeEnabled;
  
  const btn = document.getElementById('sync-mode-btn');
  if (syncModeEnabled) {
    btn.textContent = '🔄 Sync: ON';
    btn.classList.remove('sync-off');
    btn.classList.add('sync-on');
  } else {
    btn.textContent = '🔄 Sync: OFF';
    btn.classList.remove('sync-on');
    btn.classList.add('sync-off');
  }
  
  // Notify popup of sync mode change
  sendToFormViewer('SYNC_MODE_STATUS', { enabled: syncModeEnabled });
  
  console.log('[Main] Sync mode:', syncModeEnabled ? 'ON' : 'OFF');
}

document.getElementById('sync-mode-btn')?.addEventListener('click', toggleSyncMode);
```

### Step 3.3: Update Input from Composition (shared function)

**File:** `src/index.html` (script section)

```javascript
function updateInputFromComposition(composition) {
  if (!composition) return;
  
  const jsonStr = JSON.stringify(composition, null, 2);
  
  // Update input editor
  if (typeof inputEditor !== 'undefined' && inputEditor) {
    inputEditor.setValue(jsonStr);
  } else {
    document.getElementById('inputInstance').value = jsonStr;
  }
  
  // Trigger conversion pipeline (this will update output)
  if (typeof processInput === 'function') {
    processInput();
  }
  
  console.log('[Main] Input updated from composition');
}
```

### Step 3.4: Update form-viewer.html to Send Changes

**File:** `src/form-viewer.html`

The popup needs to:
1. Listen for `SYNC_MODE_STATUS` messages
2. When sync is ON, send `COMPOSITION_CHANGED` on every form change
3. Use form-renderer's `valueChange` event

**Code to add/update in form-viewer.html:**
```javascript
let syncModeEnabled = false;

// Listen for messages from main window
window.addEventListener('message', (event) => {
  if (event.source !== window.opener) return;
  
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SYNC_MODE_STATUS':
      syncModeEnabled = payload.enabled;
      updateSyncIndicator();
      break;
    // ... other handlers
  }
});

// When form renderer emits valueChange
formRenderer.addEventListener('valueChange', (event) => {
  if (syncModeEnabled) {
    const composition = formRenderer.getComposition();
    window.opener.postMessage({
      type: 'COMPOSITION_CHANGED',
      payload: { composition }
    }, window.location.origin);
  }
});
```

**Checkpoint:** ✅ Sync mode toggle works, form changes flow to input in real-time

---

## ~~Phase 4: Form Loading in Popup (Decoupled)~~ *MOVED TO PHASE 3*

---

## Phase 5: Polish and Full Integration

### Step 5.1: Group Form Controls in Input Column

**File:** `src/index.html`

Create a small toolbar grouping form-related buttons:

```html
<div id="form-toolbar" class="form-toolbar">
  <button id="open-form-viewer-btn" title="Open form viewer popup">📋 Form</button>
  <button id="push-to-form-btn" title="Push instance to form">→</button>
  <button id="pull-from-form-btn" title="Pull from form">←</button>
  <button id="sync-mode-btn" class="sync-off" title="Toggle sync mode">🔄</button>
  <span id="form-connection-status" class="disconnected">●</span>
</div>
```

### Step 5.2: Add Connection Status Indicator

**File:** `src/index.html` (script section)

```javascript
function updateConnectionStatus() {
  const indicator = document.getElementById('form-connection-status');
  if (formViewerWindow && !formViewerWindow.closed) {
    indicator.classList.remove('disconnected');
    indicator.classList.add('connected');
    indicator.title = 'Form viewer connected';
  } else {
    indicator.classList.remove('connected');
    indicator.classList.add('disconnected');
    indicator.title = 'Form viewer disconnected';
  }
}

// Check connection status periodically
setInterval(updateConnectionStatus, 1000);
```

**CSS:**
```css
.form-connection-status.connected { color: #4CAF50; }
.form-connection-status.disconnected { color: #999; }
```

### Step 5.3: Visual Feedback for Sync Updates

- Add brief highlight when input (in input column) is updated from form in sync mode.
- Add inciator in popup showing if we are in manual os sync mode

---

## Data Flow Summary

### Manual Mode (Sync OFF):
```
Provided that the form popup is already open and a suitable form loaded:
1. Load instance file in main app → Shows in Input column
2. Click "→ Push to Form" → Sends to popup, form displays it
3. Edit data in form manually
4. Click "← Pull from Form" → Gets current composition back to Input
5. Conversion runs → Output updates
```

### Sync Mode (Sync ON):
```
1. Load form in popup
2. Enable sync mode in main app
3. Any form change → COMPOSITION_CHANGED message → Input updates (and already existing fuctionality lead to that: → Conversion runs → Output updates)
4. Real-time feedback loop! ✨
```

### Full Round-Trip Demo:
```
1a. Load form in popup
1b. (optional) louad suitable instance data example and push manually to form
2. Enable sync mode
3. Fill out form fields
4. See composition JSON in input column (auto-updated)
5. Handlebars template converts to desired output format
6. Output shows instantly!
```

---

## Testing Checklist

After each phase, verify:

- [ ] Main app layout unchanged (3 columns)
- [ ] Resizers still function
- [ ] CodeMirror editors work
- [ ] Existing example loading works
- [ ] New feature works as expected
- [ ] No console errors

**Sync mode specific tests:**
- [ ] Toggle shows correct state
- [ ] Form changes update input immediately
- [ ] Conversion runs automatically
- [ ] Output updates in real-time
- [ ] Disabling sync stops updates

---

## Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `src/index.html` | 1-5 | Add buttons, postMessage, sync logic |
| `src/form-viewer.html` | 3-4 | Add valueChange listener, form loading |
| `src/kintegrate.css` | 5 | Style sync button, status indicator |

---

## Rollback Strategy

If any phase breaks the app:
1. `git status` to see changes
2. `git checkout HEAD -- src/index.html` to restore
3. Or use backup in `src/backup-broken-2026-01-29/`

---

## Future Extensions

This architecture supports:
- **Other form renderers**: Swap out form-viewer.html internals
- **Multiple popups**: Track multiple form windows
- **Remote forms**: Load from server URLs
- **Form ↔ Template mapping**: Auto-generate conversion templates

---

Ready to start? Please review and confirm:
1. Does the architecture look right?
2. Is the data flow clear?
3. Ready to begin Phase 1?
