#!/bin/bash

# PlanForge Local Development Server
# This script starts a local HTTP server to serve the PlanForge application
# This resolves CORS issues when making JIRA API calls

echo "🚀 Starting PlanForge Local Development Server..."
echo ""

# Check if Node.js is available
if command -v node &> /dev/null; then
    echo "✅ Node.js detected - using http-server"
    echo "📡 Server will start at: http://localhost:8080"
    echo "🌐 Browser will open automatically"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "----------------------------------------"
    
    # Install http-server if not already installed
    if ! command -v http-server &> /dev/null; then
        echo "📦 Installing http-server..."
        npm install -g http-server
    fi
    
    # Start the server
    http-server . -p 8080 -o -c-1
    
elif command -v python3 &> /dev/null; then
    echo "✅ Python 3 detected - using built-in HTTP server"
    echo "📡 Server will start at: http://localhost:8080"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "----------------------------------------"
    
    # Start Python HTTP server
    python3 -m http.server 8080
    
elif command -v python &> /dev/null; then
    echo "✅ Python 2 detected - using built-in HTTP server"
    echo "📡 Server will start at: http://localhost:8080"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "----------------------------------------"
    
    # Start Python HTTP server
    python -m SimpleHTTPServer 8080
    
else
    echo "❌ Error: Neither Node.js nor Python found!"
    echo ""
    echo "Please install one of the following:"
    echo "  • Node.js (recommended): https://nodejs.org/"
    echo "  • Python 3: https://python.org/"
    echo ""
    echo "Alternatively, you can:"
    echo "  • Use VS Code Live Server extension"
    echo "  • Use any other local development server"
    echo "  • Deploy to a web hosting service"
    exit 1
fi
