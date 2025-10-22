#!/bin/bash

# PlanForge Build and Deploy Script
# Usage: ./deploy.sh [local|netlify|vercel|github] [standard|obfuscated|both]

set -e

echo "🚀 PlanForge Deployment Script"
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Determine build type
BUILD_TYPE="${2:-both}"
echo "🔨 Building application ($BUILD_TYPE)..."

case "$BUILD_TYPE" in
    "standard")
        npm run build:standard
        ;;
    "obfuscated")
        npm run build:obfuscated
        ;;
    "both"|"")
        npm run build
        ;;
    *)
        echo "❌ Unknown build type: $BUILD_TYPE"
        echo "Available types: standard, obfuscated, both"
        exit 1
        ;;
esac

# Get file sizes
echo ""
echo "📊 Build Results:"
echo "=================="
if [ -d "dist" ]; then
    ls -lh dist/*.html | awk '{print "  " $9 ": " $5}'
fi

echo ""
echo "✅ Build completed successfully!"
echo ""

# Handle different deployment options
case "${1:-local}" in
    "local")
        echo "📁 Local Distribution Ready:"
        echo "  - Open dist/index.html in your browser"
        echo "  - Share the dist/ folder with users"
        echo "  - All files are self-contained"
        echo ""
        if [ "$BUILD_TYPE" = "both" ]; then
            echo "📦 Available versions:"
            echo "  • Standard versions (readable code)"
            echo "  • Obfuscated versions (protected code)"
        fi
        echo ""
        echo "💡 To test locally: npm run build:dist"
        ;;
    
    "netlify")
        echo "🌐 Netlify Deployment:"
        echo "  1. Go to https://app.netlify.com/drop"
        echo "  2. Drag the 'dist' folder to deploy"
        echo "  3. Get instant HTTPS URL"
        echo ""
        echo "💡 Or connect your GitHub repo for auto-deployment"
        ;;
    
    "vercel")
        echo "⚡ Vercel Deployment:"
        if command -v vercel &> /dev/null; then
            echo "  Deploying to Vercel..."
            vercel --prod
        else
            echo "  1. Install Vercel CLI: npm i -g vercel"
            echo "  2. Run: vercel"
            echo "  3. Follow the prompts"
        fi
        ;;
    
    "github")
        echo "🐙 GitHub Pages Deployment:"
        echo "  1. Push your code to GitHub"
        echo "  2. Enable GitHub Pages in repository settings"
        echo "  3. The workflow will auto-deploy from the dist/ folder"
        echo ""
        echo "💡 Make sure to push the .github/workflows/deploy.yml file"
        ;;
    
    *)
        echo "❌ Unknown deployment option: $1"
        echo ""
        echo "Available options:"
        echo "  local    - Prepare for local distribution (default)"
        echo "  netlify  - Deploy to Netlify"
        echo "  vercel   - Deploy to Vercel"
        echo "  github   - Deploy to GitHub Pages"
        echo ""
        echo "Usage: ./deploy.sh [option]"
        exit 1
        ;;
esac

echo ""
echo "🎉 Ready for deployment!"
echo "📖 See DEPLOYMENT.md for detailed instructions"
