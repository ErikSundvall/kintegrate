# Better Form Renderer - Quick Reference

> **Version:** v3.14.5 | **For:** Kintegrate Integration | **Last Updated:** January 30, 2026

## Overview

The Better Form Renderer is a Web Components library that renders clinical forms built in Better Studio. This reference covers the essential APIs used in Kintegrate's offline form viewing implementation.

For complete documentation, see: **https://docs.better.care/studio/form-renderer/**

---

## Installation

The renderer requires files from Better's private NPM registry:

```bash
npm install @better/form-renderer
```

**Registry configuration (`.npmrc`):**
```
//hub.better.care/npm/:_authToken=${NPM_BETTER_AUTH}
@better:registry=https://hub.better.care/npm/
```

### Required Files
```html
<link rel="stylesheet" href="vendor/styles.css">
<link rel="stylesheet" href="vendor/styles-theme.css">
<script src="vendor/form-renderer.js"></script>
```

---

## Basic Usage

```html
<form-renderer id="fr"></form-renderer>
```

```javascript
const fr = document.getElementById('fr');

// Configure CDR connection
fr.ehrServerUrl = 'https://ehr.example.com/rest/v1';
fr.credentials = { username: 'user', password: 'pass' };

// Load form
fr.formMetadata = { name: 'my-form', version: '1.0.0' };

// Set patient context
fr.formEnvironment = {
  variables: [{ name: 'ehrId', value: 'patient-ehr-uuid' }]
};
```

---

## Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `ehrServerUrl` | string | CDR server base URL |
| `credentials` | object | Auth: `{ username, password }` or `{ authType: 'oauth2', token }` |
| `formMetadata` | object | `{ name, version }` - triggers form fetch from CDR |
| `formEnvironment` | object | Variables for the form |
| `composition` | object | Get/set the current composition data |
| `context` | object | Form settings (language, readonly, etc.) |

### Context Options

```javascript
fr.context = {
  language: 'sv',           // UI language
  territory: 'SE',          // Locale
  readonly: false,          // Read-only mode
  validationDisabled: true, // Disable validation
  formDataFormat: 'FLAT'    // 'FLAT' or 'STRUCTURED'
};
```

---

## Events

```javascript
// Form ready
fr.onFormRendered = (payload) => {
  console.log('Form loaded');
  const api = payload.source.getScriptApi();
};

// Value changed
fr.onValueChange = (payload) => {
  console.log(payload.data.path, payload.data.value);
};

// Error occurred
fr.onFormError = (error) => {
  console.error('Error:', error);
};
```

---

## ScriptApi (Common Methods)

Access via `fr.getScriptApi()`:

```javascript
const api = fr.getScriptApi();

// Get/set values
api.getFieldValue('field-tag');
api.setFieldValue('field-tag', value);

// Visibility
api.showFormElement('field-tag');
api.hideFormElement('field-tag');
api.hideAndClear('field-tag');

// Enable/disable
api.enableFormElement('field-tag');
api.disableFormElement('field-tag');

// Get composition
api.getComposition();

// Clear form
api.clearValues();
```

---

## Composition Operations

```javascript
// Get current data
const data = fr.composition;

// Set data (pre-populate)
fr.composition = existingData;

// Validate
const isValid = await fr.validate();

// Save (requires live CDR)
const result = await fr.saveComposition(true);
```

---

## CDR API Format

When the renderer fetches a form via `formMetadata`, it expects this response structure:

```json
{
  "meta": { "href": "..." },
  "form": {
    "name": "FormName",
    "version": "1.0.0",
    "templateId": "template.v1",
    "status": "active",
    "resources": [
      {
        "name": "form-description",
        "content": {
          "formId": "...",
          "rmType": "FORM_DEFINITION",
          "children": [...]
        }
      },
      {
        "name": "form-environment",
        "content": { "variables": [], "externalApis": [] }
      }
    ]
  }
}
```

**Critical:** The `form-description` must have `"rmType": "FORM_DEFINITION"` at root.

---

## Form Package Structure

Better Studio exports nested ZIPs:

```
Outer ZIP:
├── package-manifest.json
├── *.opt (openEHR template)
└── Inner_FORM.zip
    ├── manifest.json
    ├── form-description   ← Main form definition
    ├── form-environment
    ├── form-layout
    └── app-pages
```

---

## Kintegrate Form Viewer Integration

The Kintegrate Form Viewer (`form-viewer.html`) provides additional control for automated testing and development.

### URL Query Parameters

The viewer's behavior can be controlled via URL parameters (supports both `?param=val` and `#param=val` syntax):

| Parameter | Value | Effect |
|-----------|-------|--------|
| `testMode` | `1` | Enables **Test Mode**. Overlays a badge and exposes `window.formTestApi`. |
| `autoLoad` | `0` | (Requires `testMode=1`) Disables the default behavior of auto-loading sample forms on startup. |

### Test API (`window.formTestApi`)

When `testMode=1` is active, the viewer exposes a stable API for testing tools like Cypress:

- `isReady()`: Returns true if the renderer is loaded and initialized.
- `setFieldValue(tagOrPath, value)`: Updates a field value.
- `getFieldValue(tagOrPath)`: Retrieves a field value.
- `getComposition()`: Returns the full composition JSON.
- `validate()`: Triggers form validation.

---

## Related Resources

- **Official Docs:** https://docs.better.care/studio/form-renderer/
- **openEHR Web Template:** https://specifications.openehr.org/releases/ITS-REST/development/simplified_formats.html
- **Kintegrate Offline Guide:** [OFFLINE-FORM-RENDERING.md](./OFFLINE-FORM-RENDERING.md)
