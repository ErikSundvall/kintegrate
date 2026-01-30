/**
 * Build script for Kintegrate
 * Replaces the PowerShell build_docs.ps1 script with a cross-platform Node.js solution
 * 
 * Usage: npm run build
 * Or directly: node scripts/build.js
 * 
 * Options:
 *   --include-vendor  Include vendor folder (proprietary libs) in build
 */

const fs = require('fs');
const path = require('path');

// Check for command line flags
const includeVendor = process.argv.includes('--include-vendor');

// Configuration
const config = {
    sourceDir: 'src',
    outDir: 'docs/demo',
    docsDir: 'docs',
    // Exclude proprietary vendor files, but allow open source ones like codemirror
    excludeDirs: includeVendor ? [] : ['vendor'],
    // Files within vendor that ARE allowed (open source)
    allowedVendorDirs: ['codemirror'],
    excludeFiles: ['index2.html', 'index3.html'],
    topLevelFiles: ['LICENSE', 'README.md']
};

/**
 * Recursively copy directory contents
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirSync(src, dest) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        const relativePath = path.relative(config.sourceDir, srcPath);

        // Check if this is in an excluded directory (but allow specific vendor subdirs)
        const isExcludedDir = config.excludeDirs.some(dir => 
            relativePath.startsWith(dir) || relativePath.startsWith(dir + path.sep)
        );
        
        // Check if this is an allowed vendor subdirectory (open source libs like codemirror)
        const isAllowedVendor = config.allowedVendorDirs && config.allowedVendorDirs.some(allowedDir => {
            const vendorSubPath = 'vendor' + path.sep + allowedDir;
            return relativePath.startsWith(vendorSubPath) || relativePath === 'vendor' + path.sep + allowedDir;
        });

        if (isExcludedDir && !isAllowedVendor) {
            // If we're at the vendor directory level, check for allowed subdirs
            if (relativePath === 'vendor' && entry.isDirectory()) {
                // Copy only allowed vendor subdirectories
                copyAllowedVendorDirs(srcPath, destPath);
            } else {
                console.log(`  Skipping excluded: ${relativePath}`);
            }
            continue;
        }

        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            // Check if this file should be excluded
            if (config.excludeFiles.includes(entry.name)) {
                console.log(`  Skipping excluded file: ${entry.name}`);
                continue;
            }

            fs.copyFileSync(srcPath, destPath);
            console.log(`  Copied: ${entry.name} -> ${destPath}`);
        }
    }
}

/**
 * Copy only allowed subdirectories from vendor folder
 * @param {string} vendorSrc - Source vendor directory
 * @param {string} vendorDest - Destination vendor directory
 */
function copyAllowedVendorDirs(vendorSrc, vendorDest) {
    if (!config.allowedVendorDirs || config.allowedVendorDirs.length === 0) {
        return;
    }
    
    for (const allowedDir of config.allowedVendorDirs) {
        const srcPath = path.join(vendorSrc, allowedDir);
        const destPath = path.join(vendorDest, allowedDir);
        
        if (fs.existsSync(srcPath)) {
            console.log(`  Copying allowed vendor dir: vendor/${allowedDir}`);
            copyDirRecursive(srcPath, destPath);
        }
    }
}

/**
 * Simple recursive directory copy (without exclusion checks)
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  Copied: ${entry.name} -> ${destPath}`);
        }
    }
}

/**
 * Remove directory recursively
 * @param {string} dirPath - Directory to remove
 */
function removeDirSync(dirPath) {
    if (fs.existsSync(dirPath)) {
        try {
            fs.rmSync(dirPath, { recursive: true, force: true });
        } catch (err) {
            console.warn(`  Warning: Could not fully clean ${dirPath}: ${err.message}`);
            console.warn('  Tip: Make sure no other process has files open in this directory.');
            // Continue anyway - files will be overwritten
        }
    }
}

/**
 * Main build function
 */
function build() {
    console.log('='.repeat(60));
    console.log('Kintegrate Build Script');
    console.log('='.repeat(60));
    console.log(`\nBuilding docs demo: copying '${config.sourceDir}' -> '${config.outDir}'\n`);

    // Check if source directory exists
    if (!fs.existsSync(config.sourceDir)) {
        console.error(`Error: Source directory '${config.sourceDir}' not found.`);
        console.error('Run this script from the repository root.');
        process.exit(1);
    }

    // Clean output directory
    if (fs.existsSync(config.outDir)) {
        console.log(`Cleaning existing output directory: ${config.outDir}`);
        removeDirSync(config.outDir);
    }

    // Create docs directory if it doesn't exist
    if (!fs.existsSync(config.docsDir)) {
        fs.mkdirSync(config.docsDir, { recursive: true });
    }

    // Copy source files to output
    console.log('\nCopying site files:');
    copyDirSync(config.sourceDir, config.outDir);

    // Copy top-level assets for the site
    console.log('\nCopying top-level files:');
    for (const file of config.topLevelFiles) {
        if (fs.existsSync(file)) {
            const destPath = path.join(config.docsDir, file);
            fs.copyFileSync(file, destPath);
            console.log(`  Copied: ${file} -> ${destPath}`);
        } else {
            console.log(`  Skipped (not found): ${file}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Build complete!');
    console.log(`Output: ${config.outDir}`);
    console.log('\nYou can now:');
    console.log('  - Publish docs/ via GitHub Pages');
    console.log('  - Serve locally: npm run serve');
    console.log('='.repeat(60));
}

// Run build
build();
