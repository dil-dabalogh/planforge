const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001; // Proxy server port

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Proxy middleware for JIRA API
const jiraProxy = createProxyMiddleware({
  target: 'https://', // Will be set dynamically
  changeOrigin: true,
  secure: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request to: ${proxyReq.getHeader('host')}${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response status: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
});

// Dynamic proxy route that extracts the target from query params
app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  try {
    const url = new URL(targetUrl);
    const proxy = createProxyMiddleware({
      target: `${url.protocol}//${url.host}`,
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/proxy': url.pathname + (url.search || '')
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying to: ${proxyReq.getHeader('host')}${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(500).json({ error: 'Proxy error: ' + err.message });
      }
    });
    
    proxy(req, res, next);
  } catch (error) {
    res.status(400).json({ error: 'Invalid URL: ' + error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'PlanForge CORS Proxy Server is running'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 PlanForge CORS Proxy Server running on port ${PORT}`);
  console.log(`📡 Ready to proxy JIRA API requests`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Usage: http://localhost:${PORT}/proxy?url=<encoded-jira-url>`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CORS Proxy Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down CORS Proxy Server...');
  process.exit(0);
});
