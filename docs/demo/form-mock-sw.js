/**
 * Service Worker to mock CDR server responses for offline form loading.
 * 
 * This intercepts requests to /mock-cdr/* and returns locally-loaded form data.
 * Also handles caching and serving of vendor libraries (Better Form Renderer).
 */

// Cache names
const VENDOR_CACHE = 'kintegrate-vendor-v1';

// Cache for form data that gets passed from the main page
let cachedFormData = null;
let cachedFormEnvironment = null;
let cachedFormName = null;
let cachedFormVersion = null;
let cachedTemplates = null;
let cachedFormLayout = null;
let cachedTemplateId = null;

// Listen for messages from the main page to cache form data
self.addEventListener('message', async (event) => {
  if (event.data.type === 'CACHE_FORM') {
    cachedFormData = event.data.formDescription;
    cachedFormEnvironment = event.data.formEnvironment || { variables: [], externalApis: [] };
    cachedFormName = event.data.formName;
    cachedFormVersion = event.data.formVersion;
    cachedTemplates = event.data.templates || [];
    cachedFormLayout = event.data.formLayout || null;
    cachedTemplateId = event.data.templateId || null;
    console.log('[SW] Cached form data:', cachedFormName, 'v' + cachedFormVersion, 'templateId:', cachedTemplateId);
    
    // Acknowledge receipt
    event.source.postMessage({ type: 'FORM_CACHED', formName: cachedFormName });
  } else if (event.data.type === 'CLEAR_CACHE') {
    cachedFormData = null;
    cachedFormEnvironment = null;
    cachedFormName = null;
    cachedFormVersion = null;
    cachedTemplates = null;
    cachedFormLayout = null;
    cachedTemplateId = null;
    console.log('[SW] Cache cleared');
  } else if (event.data.type === 'CLAIM_CLIENTS') {
    // Take control of all clients immediately
    self.clients.claim();
    console.log('[SW] Claimed all clients');
  } else if (event.data.type === 'CACHE_VENDOR_FILE') {
    // Cache a vendor library file
    try {
      const { filename, content, contentType } = event.data;
      const cache = await caches.open(VENDOR_CACHE);
      const url = `/vendor/${filename}`;
      const response = new Response(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
      await cache.put(url, response);
      console.log('[SW] Cached vendor file:', filename);
      event.source.postMessage({ type: 'VENDOR_FILE_CACHED', filename });
    } catch (error) {
      console.error('[SW] Error caching vendor file:', error);
      event.source.postMessage({ type: 'VENDOR_FILE_CACHE_ERROR', error: error.message });
    }
  } else if (event.data.type === 'CLEAR_VENDOR_CACHE') {
    // Clear vendor cache
    try {
      await caches.delete(VENDOR_CACHE);
      console.log('[SW] Vendor cache cleared');
      event.source.postMessage({ type: 'VENDOR_CACHE_CLEARED' });
    } catch (error) {
      console.error('[SW] Error clearing vendor cache:', error);
    }
  } else if (event.data.type === 'GET_VENDOR_FILES') {
    // List cached vendor files
    try {
      const cache = await caches.open(VENDOR_CACHE);
      const requests = await cache.keys();
      const files = requests.map(req => {
        const url = new URL(req.url);
        return url.pathname.replace('/vendor/', '');
      });
      event.source.postMessage({ type: 'VENDOR_FILES_LIST', files });
    } catch (error) {
      console.error('[SW] Error getting vendor files:', error);
      event.source.postMessage({ type: 'VENDOR_FILES_LIST', files: [] });
    }
  }
});

// Take control immediately on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('[SW] Activated and claimed clients');
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Log ALL requests for debugging
  console.log('[SW] Request:', event.request.method, url.pathname, url.search);
  
  // Handle vendor file requests from cache
  if (url.pathname.startsWith('/vendor/')) {
    event.respondWith(handleVendorRequest(url, event.request));
    return;
  }
  
  // Only intercept requests to our mock CDR path
  if (!url.pathname.startsWith('/mock-cdr/')) {
    return; // Let the request pass through normally
  }
  
  console.log('[SW] Intercepting:', url.pathname, url.search);
  
  // Handle different CDR endpoints
  if (url.pathname.includes('/form/') || url.pathname.includes('/forms/')) {
    event.respondWith(handleFormRequest(url, event.request));
  } else if (url.pathname.includes('/template/')) {
    event.respondWith(handleTemplateRequest(url, event.request));
  } else if (url.pathname.includes('/composition')) {
    event.respondWith(handleCompositionRequest(url, event.request));
  } else {
    // Return a generic OK for other endpoints
    event.respondWith(new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
});

async function handleFormRequest(url, request) {
  console.log('[SW] Form request:', url.pathname, 'Query:', url.search);
  
  // Handle special environment requests (for global variables/APIs)
  if (url.pathname.includes('ZZ__environment_global_variables__ZZ')) {
    console.log('[SW] Returning global variables');
    // Return CDR format: { form: { resources: [...] } }
    const variables = cachedFormEnvironment?.variables || [];
    const response = {
      form: {
        name: 'ZZ__environment_global_variables__ZZ',
        version: '1.0.0',
        resources: [{
          name: 'global-variables',
          content: variables
        }]
      }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  if (url.pathname.includes('ZZ__environment_global_apis__ZZ')) {
    console.log('[SW] Returning global APIs');
    // Return CDR format: { form: { resources: [...] } }
    const apis = cachedFormEnvironment?.externalApis || [];
    const response = {
      form: {
        name: 'ZZ__environment_global_apis__ZZ',
        version: '1.0.0',
        resources: [{
          name: 'global-apis',
          content: apis
        }]
      }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  if (!cachedFormData) {
    return new Response(JSON.stringify({ error: 'No form cached' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check if this is a resources=ALL request
  const hasResourcesAll = url.searchParams.get('resources') === 'ALL';
  
  console.log('[SW] Returning form with ALL resources for:', cachedFormName, 'resources=ALL:', hasResourcesAll);
  
  // Build resources array in CDR format
  // Each resource has: { name: "resource-name", content: {...} }
  const resources = [];
  
  // form-description is the main form definition (MUST have rmType: "FORM_DEFINITION")
  resources.push({
    name: 'form-description',
    content: cachedFormData
  });
  
  // form-environment contains variables and external APIs
  if (cachedFormEnvironment) {
    resources.push({
      name: 'form-environment',
      content: cachedFormEnvironment
    });
  }
  
  // templates contains template instance mappings
  if (cachedTemplates && cachedTemplates.length > 0) {
    resources.push({
      name: 'templates',
      content: cachedTemplates
    });
  }
  
  // form-layout contains grid/visual layout
  if (cachedFormLayout) {
    resources.push({
      name: 'form-layout', 
      content: cachedFormLayout
    });
  }
  
  // app-pages contains page definitions (try to extract from formData if present)
  // The CDR expects this for multi-page forms
  if (cachedFormData?.pages) {
    resources.push({
      name: 'app-pages',
      content: cachedFormData.pages
    });
  }
  
  // The CDR V1 API returns this structure for GET /form/{name}/{version}?resources=ALL
  // IMPORTANT: The response must have a "form" wrapper!
  const response = {
    meta: {
      href: `/mock-cdr/form/${cachedFormName}/${cachedFormVersion}`
    },
    form: {
      name: cachedFormName,
      version: cachedFormVersion || '1.0.0',
      templateId: cachedTemplateId,
      status: 'active',
      resources: resources
    }
  };
  
  console.log('[SW] Response structure:', {
    hasFormWrapper: !!response.form,
    name: response.form.name,
    version: response.form.version,
    templateId: response.form.templateId,
    resourceCount: resources.length,
    resourceNames: resources.map(r => r.name)
  });
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function handleTemplateRequest(url, request) {
  console.log('[SW] Template request:', url.pathname);
  
  // Return a minimal template response
  // The actual form rendering uses form-description, not the raw template
  return new Response(JSON.stringify({
    templateId: cachedFormData?.templateId || 'mock-template',
    tree: {}
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleCompositionRequest(url, request) {
  console.log('[SW] Composition request:', url.pathname, request.method);
  
  if (request.method === 'GET') {
    // Return empty composition for new forms
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } else if (request.method === 'POST' || request.method === 'PUT') {
    // Mock saving a composition
    const compositionId = 'mock-' + Date.now() + '::local::1';
    return new Response(JSON.stringify({
      compositionId: compositionId,
      action: request.method === 'POST' ? 'CREATE' : 'UPDATE'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle requests for vendor files from cache
 */
async function handleVendorRequest(url, request) {
  console.log('[SW] Vendor file request:', url.pathname);
  
  try {
    const cache = await caches.open(VENDOR_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving cached vendor file:', url.pathname);
      return cachedResponse;
    }
    
    // If not in cache, try to fetch from network (for development)
    console.log('[SW] Vendor file not cached, trying network:', url.pathname);
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        // Cache the network response for future use
        const responseClone = networkResponse.clone();
        await cache.put(request, responseClone);
        return networkResponse;
      }
    } catch (networkError) {
      console.log('[SW] Network fetch failed:', networkError.message);
    }
    
    // Return 404 if file not found in cache or network
    return new Response('Vendor file not found. Please upload the Better Form Renderer library.', {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('[SW] Error handling vendor request:', error);
    return new Response('Error loading vendor file: ' + error.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Mock CDR Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Mock CDR Service Worker activated');
  event.waitUntil(clients.claim());
});
