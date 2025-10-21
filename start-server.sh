#!/bin/bash

# PlanForge Local Development Server with CORS Proxy
# This script starts both the PlanForge application and a local CORS proxy server
# This resolves CORS issues when making JIRA API calls while keeping all data local

echo "🚀 Starting PlanForge with Local CORS Proxy..."
echo ""

# Check if Node.js is available
if command -v node &> /dev/null; then
    echo "✅ Node.js detected"
    echo "📡 Application server: http://localhost:8080"
    echo "🔒 CORS Proxy server: http://localhost:3001"
    echo "🌐 Browser will open automatically"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    echo "----------------------------------------"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Start both servers concurrently
    echo "🔄 Starting servers..."
    npm run start-with-proxy
    
else
    echo "❌ Error: Node.js not found!"
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo ""
    echo "Alternatively, you can:"
    echo "  • Use VS Code Live Server extension (JIRA integration won't work)"
    echo "  • Deploy to a web hosting service"
    exit 1
fi
