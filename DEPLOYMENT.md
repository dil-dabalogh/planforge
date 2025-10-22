# PlanForge Deployment Guide

This guide covers multiple deployment options for PlanForge, from local distribution to cloud hosting.

## Quick Start

```bash
# Build the application
npm run build

# Test the distribution locally
npm run build:dist
```

This creates optimized single-file versions in the `./dist` folder.

## Distribution Files

After building, you'll have:

- **`index.html`** - Launcher page (choose between versions)
- **`planforge-full.html`** - Complete app with fonts (~1.3MB)
- **`planforge-minimal.html`** - Lightweight version (~100KB)
- **`README.md`** - Distribution documentation

## Deployment Options

### 1. Local Distribution

**For sharing with users:**

1. Run `npm run build`
2. Zip the `dist` folder
3. Share the zip file
4. Users extract and open `index.html`

**Advantages:**
- No internet required
- Complete offline functionality
- Single file distribution
- Works on any device with a browser

### 2. Cloud Hosting

#### Option A: Netlify (Recommended)

1. Run `npm run build`
2. Go to [netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist` folder to deploy
4. Get instant HTTPS URL

**Or connect GitHub:**
1. Push code to GitHub
2. Connect repository to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Deploy automatically on push

#### Option B: Vercel

1. Run `npm run build`
2. Install Vercel CLI: `npm i -g vercel`
3. Run `vercel` in project directory
4. Follow prompts

**Or connect GitHub:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy automatically

#### Option C: GitHub Pages

1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. The included workflow will auto-deploy

#### Option D: AWS S3 + CloudFront

1. Create S3 bucket
2. Upload `dist` folder contents
3. Enable static website hosting
4. Configure CloudFront for HTTPS

### 3. Self-Hosted Server

**Any web server:**
1. Run `npm run build`
2. Upload `dist` folder contents to web root
3. Configure server to serve `index.html` for all routes

**Nginx example:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## File Size Optimization

### Full Version (~1.3MB)
- Includes Material Icons fonts
- Best visual experience
- All features available

### Minimal Version (~100KB)
- Uses system fonts
- 90% smaller file size
- Faster loading
- May have slightly different icon appearance

## Performance Considerations

### Loading Speed
- **Minimal version**: Loads in ~1-2 seconds
- **Full version**: Loads in ~3-5 seconds
- Both versions cache in browser

### Storage
- Uses browser localStorage
- No server-side storage required
- Data persists between sessions

### Compatibility
- Modern browsers with Canvas support
- Mobile-friendly responsive design
- Works offline after initial load

## Security Notes

- No server-side processing
- All data stored locally in browser
- No external API calls
- HTTPS recommended for production

## Troubleshooting

### Build Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Font Issues
- If icons don't appear, use the full version
- Minimal version relies on system fonts

### Browser Compatibility
- Requires Canvas API support
- Test in target browsers before deployment

## Advanced Configuration

### Custom Domain
1. Deploy to chosen platform
2. Configure custom domain in platform settings
3. Update DNS records

### CDN Optimization
- Enable gzip compression
- Set appropriate cache headers
- Use CDN for global distribution

### Analytics
- Add Google Analytics or similar
- Track usage patterns
- Monitor performance metrics

## Support

For deployment issues:
1. Check browser console for errors
2. Verify all files uploaded correctly
3. Test locally first with `npm run build:dist`
4. Check platform-specific documentation
