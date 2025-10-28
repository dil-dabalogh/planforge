#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');

/**
 * Build script for WHAT IF delivered - Creates optimized single-file distribution
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
function inlineCSS(filePath, minify = false, embedFonts = false) {
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
      return inlineCSS(cssPath, minifyCSS, includeFonts);
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
  
  // Embed demo data if available
  let embeddedDemoData = '';
  const demoSource = path.join(SRC_DIR, 'data/demo-full-features.json');
  if (fs.existsSync(demoSource)) {
    const demoContent = fs.readFileSync(demoSource, 'utf8');
    embeddedDemoData = `<script id="embedded-demo-data" type="application/json">${demoContent}</script>`;
    console.log('Demo data embedded in HTML');
  }
  
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
    headContent += `<style>
${embeddedMaterialIconsCSS}
${embeddedMaterialSymbolsCSS}
</style>`;
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
  
  // Embed demo data in body if available
  if (embeddedDemoData) {
    bodyContent = embeddedDemoData + '\n  ' + bodyContent;
  }
  
  // Construct the final HTML - keep all meta tags from source
  // headContent already has the meta tags, title, structured data, etc. from the original
  // It just had the external stylesheets replaced with inlined CSS
  const finalHTML = `<!doctype html>
<html lang="en">
<head>
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
function createDistribution() {
  console.log('Creating obfuscated full version...');
  
  // Create only obfuscated full version
  const fullHTML = buildHTML(true, true, true);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), fullHTML);
  
  // Copy sitemap.xml to dist if it exists
  const sitemapSource = './sitemap.xml';
  if (fs.existsSync(sitemapSource)) {
    fs.copyFileSync(sitemapSource, path.join(DIST_DIR, 'sitemap.xml'));
    console.log('Sitemap copied to dist/');
  }
  
  // Copy robots.txt to dist if it exists
  const robotsSource = './robots.txt';
  if (fs.existsSync(robotsSource)) {
    fs.copyFileSync(robotsSource, path.join(DIST_DIR, 'robots.txt'));
    console.log('Robots.txt copied to dist/');
  }
  
  // Copy demo-full-features.json to dist as demo.json if it exists
  const demoSource = path.join(SRC_DIR, 'data/demo-full-features.json');
  if (fs.existsSync(demoSource)) {
    // Copy to dist for production (app looks for ./demo.json)
    fs.copyFileSync(demoSource, path.join(DIST_DIR, 'demo.json'));
    console.log('Demo data copied to dist/demo.json');
  }
  
  console.log('Distribution package created successfully!');
}

/**
 * Get file sizes for reporting
 */
function getFileSizes() {
  console.log('\nFile sizes:');
  
  const filePath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`  index.html: ${sizeKB}KB`);
  }
}

// Main execution
if (require.main === module) {
  try {
    createDistribution();
    getFileSizes();
    console.log('\n✅ Build completed successfully!');
    console.log(`📁 Distribution file created: ${DIST_DIR}/index.html`);
    console.log('\n🔒 Features:');
    console.log('  • Obfuscated JavaScript code');
    console.log('  • Embedded Material Icons fonts');
    console.log('  • Minified CSS');
    console.log('  • Single self-contained file');
    console.log('\n🚀 Ready for deployment!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

module.exports = { buildHTML, createDistribution };
