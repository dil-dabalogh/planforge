#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');

/**
 * Build script for PlanForge - Creates optimized single-file distribution
 * 
 * This script:
 * 1. Inlines all CSS and JS files
 * 2. Embeds fonts as base64 data URIs
 * 3. Creates a single HTML file for easy distribution
 * 4. Generates both full and minimal versions
 */

const SRC_DIR = './src';
const DIST_DIR = './dist';

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

/**
 * Read and inline CSS file
 */
function inlineCSS(filePath, minify = false) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (minify) {
      const cleanCSS = new CleanCSS({
        level: 2,
        format: 'beautify'
      });
      const result = cleanCSS.minify(content);
      if (result.errors.length === 0) {
        content = result.styles;
      }
    }
    
    return `<style>\n${content}\n</style>`;
  } catch (error) {
    console.warn(`Warning: Could not read CSS file ${filePath}:`, error.message);
    return '';
  }
}

/**
 * Read and inline JavaScript file
 */
function inlineJS(filePath, obfuscate = false) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (obfuscate) {
      const obfuscationResult = JavaScriptObfuscator.obfuscate(content, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: false,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: false,
        stringArray: true,
        stringArrayCallsTransform: false,
        stringArrayEncoding: [],
        stringArrayIndexShift: false,
        stringArrayRotate: false,
        stringArrayShuffle: false,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: false,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'variable',
        stringArrayThreshold: 0.5,
        transformObjectKeys: false,
        unicodeEscapeSequence: false
      });
      
      content = obfuscationResult.getObfuscatedCode();
    }
    
    return `<script>\n${content}\n</script>`;
  } catch (error) {
    console.warn(`Warning: Could not read JS file ${filePath}:`, error.message);
    return '';
  }
}

/**
 * Convert font file to base64 data URI
 */
function fontToDataURI(fontPath, mimeType) {
  try {
    const fontBuffer = fs.readFileSync(fontPath);
    const base64 = fontBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.warn(`Warning: Could not read font file ${fontPath}:`, error.message);
    return '';
  }
}

/**
 * Build the main HTML file
 */
function buildHTML(includeFonts = true, obfuscate = false, minifyCSS = false) {
  const buildType = obfuscate ? 'obfuscated' : 'standard';
  console.log(`Building ${buildType} HTML file...`);
  
  // Read the main HTML file
  const htmlContent = fs.readFileSync(path.join(SRC_DIR, 'index.html'), 'utf8');
  
  // Extract the head and body content
  const headMatch = htmlContent.match(/<head>([\s\S]*?)<\/head>/);
  const bodyMatch = htmlContent.match(/<body>([\s\S]*?)<\/body>/);
  
  if (!headMatch || !bodyMatch) {
    throw new Error('Could not parse HTML structure');
  }
  
  let headContent = headMatch[1];
  let bodyContent = bodyMatch[1];
  
  // Remove external CSS links and inline them
  headContent = headContent.replace(
    /<link rel="stylesheet" href="([^"]+)"[^>]*>/g,
    (match, href) => {
      const cssPath = path.join(SRC_DIR, href);
      return inlineCSS(cssPath, minifyCSS);
    }
  );
  
  // Remove external script tags and inline them
  bodyContent = bodyContent.replace(
    /<script src="([^"]+)"[^>]*><\/script>/g,
    (match, src) => {
      const jsPath = path.join(SRC_DIR, src);
      return inlineJS(jsPath, obfuscate);
    }
  );
  
  // Handle fonts if requested
  if (includeFonts) {
    // Replace font CSS with embedded fonts
    const materialIconsCSS = fs.readFileSync(path.join(SRC_DIR, 'assets/fonts/css/material-icons.css'), 'utf8');
    const materialSymbolsCSS = fs.readFileSync(path.join(SRC_DIR, 'assets/fonts/css/material-symbols-outlined-simple.css'), 'utf8');
    
    // Convert fonts to data URIs
    const materialIconsFont = fontToDataURI(
      path.join(SRC_DIR, 'assets/fonts/woff2/material-icons.ttf'),
      'font/ttf'
    );
    const materialSymbolsFont = fontToDataURI(
      path.join(SRC_DIR, 'assets/fonts/woff2/material-symbols-400.ttf'),
      'font/ttf'
    );
    
    // Replace font URLs in CSS with data URIs
    const embeddedMaterialIconsCSS = materialIconsCSS.replace(
      /url\([^)]+material-icons\.ttf[^)]*\)/g,
      `url(${materialIconsFont})`
    );
    const embeddedMaterialSymbolsCSS = materialSymbolsCSS.replace(
      /url\([^)]+material-symbols-400\.ttf[^)]*\)/g,
      `url(${materialSymbolsFont})`
    );
    
    // Add embedded font CSS to head
    headContent += `<style>\n${embeddedMaterialIconsCSS}\n</style>`;
    headContent += `<style>\n${embeddedMaterialSymbolsCSS}\n</style>`;
  } else {
    // For minimal version, use system fonts as fallback
    headContent += `<style>
      .material-icons, .material-symbols-outlined {
        font-family: 'Material Icons', 'Material Symbols Outlined', sans-serif;
        font-weight: normal;
        font-style: normal;
        font-size: 24px;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        -webkit-font-feature-settings: 'liga';
        -webkit-font-smoothing: antialiased;
      }
    </style>`;
  }
  
  // Construct the final HTML
  const finalHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PlanForge MVP</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z' fill='%231976d2'/%3E%3C/svg%3E">
  ${headContent}
</head>
<body>
  ${bodyContent}
</body>
</html>`;
  
  return finalHTML;
}

/**
 * Create distribution packages
 */
function createDistribution(obfuscate = false) {
  const suffix = obfuscate ? '-obfuscated' : '';
  console.log(`Creating distribution packages${obfuscate ? ' (obfuscated)' : ''}...`);
  
  // Create full version with embedded fonts
  console.log(`Building full version with embedded fonts${obfuscate ? ' (obfuscated)' : ''}...`);
  const fullHTML = buildHTML(true, obfuscate, true);
  fs.writeFileSync(path.join(DIST_DIR, `planforge-full${suffix}.html`), fullHTML);
  
  // Create minimal version without fonts (uses system fonts)
  console.log(`Building minimal version without fonts${obfuscate ? ' (obfuscated)' : ''}...`);
  const minimalHTML = buildHTML(false, obfuscate, true);
  fs.writeFileSync(path.join(DIST_DIR, `planforge-minimal${suffix}.html`), minimalHTML);
  
  // Create a simple launcher HTML that detects capabilities
  const launcherHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PlanForge Launcher</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #1976d2; margin-bottom: 20px; }
    .option { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .option h3 { margin-top: 0; color: #333; }
    .option p { margin-bottom: 10px; color: #666; }
    .btn { background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; }
    .btn:hover { background: #1565c0; }
    .size { font-size: 0.9em; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>PlanForge MVP</h1>
    <p>Choose your preferred version:</p>
    
    <div class="option">
      <h3>Full Version</h3>
      <p>Complete application with embedded fonts. Best visual experience.</p>
      <a href="planforge-full.html" class="btn">Launch Full Version</a>
      <div class="size">~1.3MB</div>
    </div>
    
    <div class="option">
      <h3>Minimal Version</h3>
      <p>Lightweight version using system fonts. Faster loading.</p>
      <a href="planforge-minimal.html" class="btn">Launch Minimal Version</a>
      <div class="size">~100KB</div>
    </div>
    
    <div class="option">
      <h3>Obfuscated Full Version</h3>
      <p>Full version with obfuscated code. Protected and optimized.</p>
      <a href="planforge-full-obfuscated.html" class="btn">Launch Obfuscated Full</a>
      <div class="size">~2.5MB</div>
    </div>
    
    <div class="option">
      <h3>Obfuscated Minimal Version</h3>
      <p>Minimal version with obfuscated code. Protected and compact.</p>
      <a href="planforge-minimal-obfuscated.html" class="btn">Launch Obfuscated Minimal</a>
      <div class="size">~940KB</div>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
      <p><strong>Features:</strong> Project planning, timeline visualization, dependency management, JSON export/import</p>
      <p><strong>Requirements:</strong> Modern browser with Canvas support</p>
    </div>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), launcherHTML);
  
  // Create a README for the distribution
  const readmeContent = `# PlanForge Distribution

This directory contains optimized, single-file versions of PlanForge for easy distribution and deployment.

## Files

- **index.html** - Launcher page to choose between versions
- **planforge-full.html** - Complete application with embedded fonts (~1.3MB)
- **planforge-minimal.html** - Lightweight version using system fonts (~100KB)

## Usage

### Local Use
1. Open \`index.html\` in any modern browser
2. Choose your preferred version
3. All data is stored locally in your browser

### Cloud Hosting
1. Upload all files to any web server
2. Access via \`index.html\` or directly via the version files
3. No server-side processing required

### Self-Contained Distribution
- Each HTML file is completely self-contained
- No external dependencies
- Works offline after initial load
- Can be shared as a single file

## Technical Details

- **Full Version**: Includes Material Icons fonts embedded as base64
- **Minimal Version**: Uses system fonts, significantly smaller
- **Storage**: Browser localStorage for data persistence
- **Compatibility**: Modern browsers with Canvas API support

## Deployment Options

### Static Hosting
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static file server

### Local Distribution
- Email as attachment
- USB drive
- Internal file sharing
- Direct file access
`;

  fs.writeFileSync(path.join(DIST_DIR, 'README.md'), readmeContent);
  
  console.log('Distribution packages created successfully!');
}

/**
 * Get file sizes for reporting
 */
function getFileSizes() {
  const files = ['planforge-full.html', 'planforge-minimal.html', 'index.html'];
  console.log('\nFile sizes:');
  
  files.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`  ${file}: ${sizeKB}KB`);
    }
  });
}

// Main execution
if (require.main === module) {
  try {
    // Create standard versions
    createDistribution(false);
    
    // Create obfuscated versions
    createDistribution(true);
    
    getFileSizes();
    console.log('\n✅ Build completed successfully!');
    console.log(`📁 Distribution files created in: ${DIST_DIR}`);
    console.log('\n📦 Available versions:');
    console.log('  • Standard versions (readable code)');
    console.log('  • Obfuscated versions (protected code)');
    console.log('\n🚀 Ready for deployment!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

module.exports = { buildHTML, createDistribution };
