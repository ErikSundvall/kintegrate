# Offline Form Rendering - Technical Guide

> **Status:** ✅ Working  
> **Form Renderer Version:** v3.14.5  
> **Last Updated:** January 31, 2026

## Overview

This document describes how Kintegrate achieves offline rendering of Better Studio forms without requiring a live CDR (Clinical Data Repository) server connection.

## Solution: Service Worker Mock CDR + Vendor Library Caching

The working solution uses a **Service Worker** to:
1. Intercept CDR API requests and return locally-loaded form data
2. Cache and serve the proprietary Better Form Renderer library files
3. Enable completely offline operation without version control of proprietary code

This allows the Form Renderer to function normally while being completely offline, and allows users to upload the proprietary renderer library to their browser cache for offline use.

## Key Features

### 1. CDR API Mocking
The service worker intercepts requests to `/mock-cdr/*` and returns form data that has been loaded by the user.

### 2. Vendor Library Caching
The service worker caches and serves vendor library files from `/vendor/*`:
- Users can upload the Better Form Renderer files via the UI
- Files are cached in the browser's Cache API
- The service worker serves cached files when requested
- Falls back to network in development mode
- No proprietary code needs to be committed to version control

### Architecture

```
┌─────────────────────┐     formMetadata     ┌─────────────────────┐
│   Form Viewer       │ ──────────────────►  │   Form Renderer     │
│   (form-viewer.html)│                      │   (Web Component)   │
└─────────┬───────────┘                      └─────────┬───────────┘
          │                                            │
          │ CACHE_FORM                                 │ HTTP: GET /mock-cdr/form/{name}/{version}?resources=ALL
          ▼                                            ▼
┌─────────────────────┐                      ┌─────────────────────┐
│   Service Worker    │ ◄────────────────────│   SW Fetch Handler  │
│   (form-mock-sw.js) │     INTERCEPT        │                     │
└─────────────────────┘                      └─────────────────────┘
          │
          │ Returns CDR-format JSON response
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  { meta: {...}, form: { name, version, resources: [...] } }     │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works

#### Form Loading Flow
1. **User loads a form package** (ZIP from Better Studio export)
2. **Form Viewer extracts resources** (form-description, form-environment, etc.)
3. **Data sent to Service Worker** via `postMessage`
4. **Form Viewer sets `formMetadata`** on the renderer (name + version)
5. **Renderer makes HTTP request** to `ehrServerUrl` (configured as `/mock-cdr`)
6. **Service Worker intercepts** the request
7. **Service Worker returns cached form data** in CDR API format
8. **Renderer parses and displays** the form

#### Vendor Library Upload Flow (NEW)
1. **User clicks "📚 Upload Renderer"** in form-viewer.html
2. **User selects vendor files** (form-renderer.js, styles.css, styles-theme.css)
3. **Files are sent to Service Worker** via `postMessage` with type `CACHE_VENDOR_FILE`
4. **Service Worker caches files** in Cache API under `kintegrate-vendor-v1`
5. **When page requests `/vendor/form-renderer.js`**, Service Worker serves from cache
6. **Form Renderer loads** from cached files, enabling offline operation

This approach keeps proprietary code out of version control while allowing users to run the application completely offline.

## Using the Vendor Upload Feature

### For End Users

If you're using the GitHub Pages hosted version and want to work offline:

1. **Obtain the Better Form Renderer library files** (requires Better Platform license):
   - `form-renderer.js` (main library)
   - `styles.css` (base styles)
   - `styles-theme.css` (theme styles)

2. **Open the Form Viewer** in Kintegrate

3. **Click "📚 Upload Renderer"** button in the toolbar

4. **Select all three files** when prompted

5. **Wait for upload confirmation** - you'll see "✅ 3 files uploaded"

6. **Reload the page** - the renderer will now load from browser cache

7. **You can now work completely offline!** The uploaded files persist in your browser's cache.

### Clearing the Cache

If you need to update the renderer or clear space:

1. Click **"🗑 Clear Renderer"** button
2. Confirm the action
3. The page will reload and use network files (if available)

### For Developers

When developing locally with the proprietary library:

1. Install the Better Form Renderer: `npm install @better/form-renderer`
2. Copy to vendor folder: `npm run setup:vendor`
3. The service worker will serve files from the network (local file system)
4. End users can upload their own copy via the UI

## Implementation Details

### Service Worker Registration

```javascript
// In form-viewer.html
const swRegistration = await navigator.serviceWorker.register('form-mock-sw.js', { scope: '/' });
await navigator.serviceWorker.ready;

// Request immediate control
if (swRegistration.active) {
  swRegistration.active.postMessage({ type: 'CLAIM_CLIENTS' });
}
```

### Caching Vendor Libraries

```javascript
// Upload vendor file to Service Worker
const fileContent = await file.arrayBuffer();
navigator.serviceWorker.controller.postMessage({
  type: 'CACHE_VENDOR_FILE',
  filename: 'form-renderer.js',
  content: fileContent,
  contentType: 'application/javascript'
});

// Service Worker stores in Cache API
const cache = await caches.open('kintegrate-vendor-v1');
const response = new Response(content, {
  status: 200,
  headers: {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000'
  }
});
await cache.put(`/vendor/${filename}`, response);
```

### Serving Vendor Files from Cache

```javascript
// Service Worker intercepts vendor file requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/vendor/')) {
    event.respondWith(handleVendorRequest(url, event.request));
    return;
  }
  // ... other handlers
});

async function handleVendorRequest(url, request) {
  const cache = await caches.open('kintegrate-vendor-v1');
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse; // Serve from cache
  }
  
  // Fallback to network (for development)
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache for future use
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    // Network failed
  }
  
  return new Response('Vendor file not found', { status: 404 });
}
```

### Caching Form Data

```javascript
// Send form data to Service Worker
navigator.serviceWorker.controller.postMessage({
  type: 'CACHE_FORM',
  formDescription: formDescription,    // Main form definition (JSON)
  formEnvironment: formEnvironment,    // Variables & APIs (JSON)
  formName: 'MyForm',
  formVersion: '1.0.0',
  templateId: 'template.v1',
  templates: templatesArray,
  formLayout: layoutJson
});
```

### Triggering Form Load

```javascript
// Configure renderer to use mock CDR
formRenderer.ehrServerUrl = window.location.origin + '/mock-cdr';
formRenderer.credentials = { username: 'offline', password: 'offline' };

// Trigger form fetch - SW will intercept and return cached data
formRenderer.formMetadata = {
  name: 'MyForm',
  version: '1.0.0'
};
```

## CDR API Response Format

The Service Worker must return responses that match the Better CDR API format exactly.

### Form Fetch Response

**Endpoint:** `GET /form/{name}/{version}?resources=ALL`

```json
{
  "meta": {
    "href": "/mock-cdr/form/FormName/1.0.0"
  },
  "form": {
    "name": "FormName",
    "version": "1.0.0",
    "templateId": "template-id.v1",
    "status": "active",
    "resources": [
      {
        "name": "form-description",
        "content": {
          "formId": "form_root",
          "rmType": "FORM_DEFINITION",
          "templateId": "template-id.v1",
          "viewConfig": { "..." },
          "children": [ "..." ]
        }
      },
      {
        "name": "form-environment",
        "content": {
          "variables": [],
          "externalApis": []
        }
      },
      {
        "name": "app-pages",
        "content": [{ "id": "page1", "firstPage": true }]
      }
    ]
  }
}
```

### Critical: Form Description Validation

The renderer validates that `form-description` has `rmType: "FORM_DEFINITION"` at root:

```javascript
if (rmType !== "FORM_DEFINITION") {
  throw new Error("Root element is not form definition");
}
```

### Global Environment Endpoints

The renderer also fetches global variables and APIs:

- `GET /form/ZZ__environment_global_variables__ZZ?resources=global-variables`
- `GET /form/ZZ__environment_global_apis__ZZ?resources=global-apis`

These must return the same wrapper structure with appropriate resources.

## Form Package Structure

Better Studio exports forms as nested ZIP packages:

```
FormName_1.0.0_FORM.zip (Outer ZIP)
├── package-manifest.json     ← Package index
├── TemplateName_TEMPLATE.opt ← openEHR template (optional)
└── FormName_1.0.0_FORM.zip   ← Inner ZIP (Form Package)
    ├── manifest.json         ← Form metadata
    ├── form-description      ← **MAIN FORM DEFINITION** (JSON)
    ├── form-environment      ← Variables, APIs
    ├── form-layout           ← Visual layout
    ├── app-pages             ← Page definitions
    └── ...                   ← Other resources
```

### Key Files

| File | Purpose |
|------|---------|
| `manifest.json` | Form metadata (name, version, templateId) |
| `form-description` | Main form UI definition (JSON) |
| `form-environment` | Variables and external API configs |
| `form-layout` | Grid/visual layout settings |
| `app-pages` | Multi-page form definitions |

## Troubleshooting

### "Root element is not form definition"
- Ensure `form-description` content has `"rmType": "FORM_DEFINITION"` at root level
- Don't wrap the form-description in another object

### "No form cached" (404 from SW)
- Check SW is registered and controlling the page
- Verify `CACHE_FORM` message was sent before `formMetadata` is set
- Wait for SW to confirm caching before triggering load

### Form not rendering (empty)
- Check browser console for errors
- Verify SW is intercepting requests (look for `[SW]` log messages)
- Ensure response structure matches CDR API format exactly

### Service Worker not controlling
- First page load may not be controlled
- Send `CLAIM_CLIENTS` message to SW
- Or refresh the page after SW registration

## Related Documentation

- [Better Form Renderer Documentation](https://docs.better.care/studio/form-renderer/)
- [openEHR Web Template Specification](https://specifications.openehr.org/releases/ITS-REST/development/simplified_formats.html#_web_template_metadata)
- [better-care/web-template Library](https://github.com/better-care/web-template/tree/4.0)

## Files

- [form-viewer.html](../src/form-viewer.html) - Popup window with form loading UI
- [form-mock-sw.js](../src/form-mock-sw.js) - Service Worker for CDR mocking
