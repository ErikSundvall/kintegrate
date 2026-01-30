/**
 * Download Better Form Renderer Documentation
 * 
 * This script downloads the Better Platform Form Renderer documentation
 * for offline reference by AI agents and developers.
 * 
 * Usage: npm run download:docs
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Configuration
const config = {
    baseUrl: 'https://docs.better.care/studio/form-renderer/',
    outputDir: 'docs-cache/form-renderer',
    maxDepth: 5,
    delay: 500, // ms between requests to be respectful
    visited: new Set(),
    queue: []
};

/**
 * Make an HTTP(S) request
 */
function fetch(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        protocol.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                // Follow redirects
                return resolve(fetch(res.headers.location));
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Status ${res.statusCode} for ${url}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

/**
 * Extract links from HTML content
 */
function extractLinks(html, baseUrl) {
    const links = [];
    // Simple regex to find href attributes
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;
    
    while ((match = hrefRegex.exec(html)) !== null) {
        try {
            const href = match[1];
            // Skip anchors, external links, and non-HTML links
            if (href.startsWith('#') || href.startsWith('mailto:') || 
                href.startsWith('tel:') || href.includes('://') && !href.includes('docs.better.care')) {
                continue;
            }
            
            // Resolve relative URLs
            const fullUrl = new URL(href, baseUrl).href;
            
            // Only include links within the form-renderer documentation
            if (fullUrl.startsWith(config.baseUrl)) {
                links.push(fullUrl);
            }
        } catch (err) {
            // Invalid URL, skip
        }
    }
    
    return [...new Set(links)]; // Remove duplicates
}

/**
 * Save content to file
 */
function saveToFile(url, content) {
    try {
        const urlObj = new URL(url);
        let relativePath = urlObj.pathname.replace('/studio/form-renderer/', '');
        
        // If the path ends with /, treat it as index.html
        if (relativePath.endsWith('/')) {
            relativePath += 'index.html';
        } else if (!relativePath.includes('.')) {
            relativePath += '.html';
        }
        
        const filePath = path.join(config.outputDir, relativePath);
        const dirPath = path.dirname(filePath);
        
        // Create directory if needed
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Saved: ${relativePath}`);
    } catch (err) {
        console.error(`  Error saving ${url}:`, err.message);
    }
}

/**
 * Process a URL: fetch, save, and extract links
 */
async function processUrl(url, depth) {
    if (depth > config.maxDepth || config.visited.has(url)) {
        return;
    }
    
    config.visited.add(url);
    
    try {
        console.log(`Fetching: ${url} (depth: ${depth})`);
        const html = await fetch(url);
        
        // Save the HTML content
        saveToFile(url, html);
        
        // Extract and queue new links
        if (depth < config.maxDepth) {
            const links = extractLinks(html, url);
            for (const link of links) {
                if (!config.visited.has(link)) {
                    config.queue.push({ url: link, depth: depth + 1 });
                }
            }
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, config.delay));
        
    } catch (err) {
        console.error(`  Error fetching ${url}:`, err.message);
    }
}

/**
 * Main download function
 */
async function downloadDocs() {
    console.log('='.repeat(60));
    console.log('Better Form Renderer Documentation Downloader');
    console.log('='.repeat(60));
    console.log(`Base URL: ${config.baseUrl}`);
    console.log(`Output directory: ${config.outputDir}`);
    console.log(`Max depth: ${config.maxDepth}`);
    console.log('');
    
    // Create output directory
    if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Start with the base URL
    config.queue.push({ url: config.baseUrl, depth: 0 });
    
    // Process queue
    while (config.queue.length > 0) {
        const { url, depth } = config.queue.shift();
        await processUrl(url, depth);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log(`Download complete!`);
    console.log(`Total pages downloaded: ${config.visited.size}`);
    console.log(`Location: ${config.outputDir}`);
    console.log('='.repeat(60));
    
    // Create an index file
    const indexContent = `# Better Form Renderer Documentation (Cached)

Downloaded on: ${new Date().toISOString()}
Total pages: ${config.visited.size}
Source: ${config.baseUrl}

## Downloaded URLs:
${Array.from(config.visited).sort().map(url => `- ${url}`).join('\n')}

## Note
This is a cached copy of the Better Platform Form Renderer documentation
for offline reference by AI agents and developers. 

For the latest documentation, visit: ${config.baseUrl}
`;
    
    fs.writeFileSync(path.join(config.outputDir, 'INDEX.md'), indexContent, 'utf8');
    console.log('\nIndex file created: INDEX.md');
}

// Run the downloader
downloadDocs().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
