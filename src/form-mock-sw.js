/**
 * Service Worker to mock CDR server responses for offline form loading.
 * 
 * This intercepts requests to /mock-cdr/* and returns locally-loaded form data.
 */

// Cache for form data that gets passed from the main page
let cachedFormData = null;
let cachedFormEnvironment = null;
let cachedFormName = null;
let cachedFormVersion = null;
let cachedTemplates = null;
let cachedFormLayout = null;
let cachedTemplateId = null;

// Listen for messages from the main page to cache form data
self.addEventListener('message', (event) => {
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
  
  // Handle special environment requests
  if (url.pathname.includes('ZZ__environment_global_variables__ZZ')) {
    console.log('[SW] Returning global variables');
    // Return variables from form-environment or empty array
    const variables = cachedFormEnvironment?.variables || [];
    return new Response(JSON.stringify(variables), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  if (url.pathname.includes('ZZ__environment_global_apis__ZZ')) {
    console.log('[SW] Returning global APIs');
    // Return external APIs from form-environment or empty array
    const apis = cachedFormEnvironment?.externalApis || [];
    return new Response(JSON.stringify(apis), {
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
  
  if (hasResourcesAll) {
    // Return form with all resources bundled (CDR format with ?resources=ALL)
    console.log('[SW] Returning form with ALL resources for:', cachedFormName);
    
    // The CDR returns a specific structure when ?resources=ALL is used
    const response = {
      name: cachedFormName,
      version: cachedFormVersion,
      templateId: cachedTemplateId,
      // The form-description is the main form definition
      formDescription: cachedFormData,
      // Include environment data
      formEnvironment: cachedFormEnvironment || { variables: [], externalApis: [] },
      // Include templates (mapping of template instances)
      templates: cachedTemplates || [],
      // Include layout if available
      formLayout: cachedFormLayout,
      // Status
      status: 'active'
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // For requests without ?resources=ALL, return the form-description directly
  // But also include templates if available since renderer might need them
  console.log('[SW] Returning form-description for:', cachedFormName);
  
  return new Response(JSON.stringify(cachedFormData), {
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

// Activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Mock CDR Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Mock CDR Service Worker activated');
  event.waitUntil(clients.claim());
});
