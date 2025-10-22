# PlanForge Distribution

This directory contains optimized, single-file versions of PlanForge for easy distribution and deployment.

## Files

- **index.html** - Launcher page to choose between versions
- **planforge-full.html** - Complete application with embedded fonts (~1.3MB)
- **planforge-minimal.html** - Lightweight version using system fonts (~100KB)

## Usage

### Local Use
1. Open `index.html` in any modern browser
2. Choose your preferred version
3. All data is stored locally in your browser

### Cloud Hosting
1. Upload all files to any web server
2. Access via `index.html` or directly via the version files
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
