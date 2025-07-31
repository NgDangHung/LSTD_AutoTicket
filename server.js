const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

// Prepare Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  try {
    // HTTPS options with certificates created by mkcert
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, 'certs/localhost-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'certs/localhost.pem')),
    };

    // Create HTTPS server
    createServer(httpsOptions, async (req, res) => {
      try {
        // Add CORS headers for WebSocket compatibility
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    })
      .once('error', (err) => {
        console.error('❌ HTTPS Server error:', err);
        process.exit(1);
      })
      .listen(port, (err) => {
        if (err) throw err;
        console.log(`🔒 HTTPS Server ready on https://${hostname}:${port}`);
        console.log(`🌐 Local: https://localhost:${port}`);
        console.log(`📋 Network: https://127.0.0.1:${port}`);
        console.log(`🔧 Certificates: ./certs/localhost.pem`);
        console.log(`🔑 Private key: ./certs/localhost-key.pem`);
        console.log('');
        console.log('🚀 Now you can test WebSocket connections without CORS issues!');
        console.log('📺 Open https://localhost:3000 in your browser');
      });
  } catch (error) {
    console.error('❌ Failed to start HTTPS server:', error);
    console.log('');
    console.log('💡 Make sure certificates exist:');
    console.log('   - certs/localhost.pem');
    console.log('   - certs/localhost-key.pem');
    console.log('');
    console.log('🔧 If certificates are missing, run:');
    console.log('   .\\mkcert.exe -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1');
    process.exit(1);
  }
});
