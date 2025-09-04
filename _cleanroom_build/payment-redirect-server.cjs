const http = require('http');
const url = require('url');

const PORT = 3002;

function createServer() {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Enable CORS and security headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (parsedUrl.pathname === '/health') {
      const healthData = {
        status: 'ok',
        port: PORT,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthData));
      return;
    }
    
    if (parsedUrl.pathname === '/booking-success') {
      const sessionId = parsedUrl.query.session_id;
      
      if (!sessionId) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <title>Payment Error - Treasury 1929</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                margin: 0; padding: 50px; text-align: center;
                background: #dc3545; color: white; min-height: 100vh;
                display: flex; align-items: center; justify-content: center;
              }
              .container { max-width: 500px; }
              h1 { font-size: 2em; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Payment Error</h1>
              <p>Missing session information. Please contact support.</p>
            </div>
          </body>
          </html>
        `);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Payment Successful - Treasury 1929</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; min-height: 100vh;
              display: flex; align-items: center; justify-content: center;
              padding: 20px;
            }
            .success-container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(15px);
              border-radius: 24px; padding: 48px;
              max-width: 600px; width: 100%;
              box-shadow: 0 16px 64px rgba(0, 0, 0, 0.2);
              text-align: center;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .success-icon { 
              font-size: 5em; margin-bottom: 24px; 
              color: #4CAF50;
              animation: bounce 1s ease-in-out;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            h1 { 
              font-size: 2.5em; margin-bottom: 16px; 
              font-weight: 700; 
            }
            .subtitle {
              font-size: 1.2em; margin-bottom: 32px;
              opacity: 0.9; line-height: 1.5;
            }
            .session-info { 
              background: rgba(255, 255, 255, 0.2); 
              padding: 24px; border-radius: 12px; 
              margin: 24px 0; word-break: break-all;
              font-family: Monaco, Menlo, monospace;
              font-size: 0.9em;
            }
            .session-label {
              font-weight: 600; margin-bottom: 8px;
              text-transform: uppercase; letter-spacing: 1px;
              font-size: 0.8em;
            }
            .confirmation-text {
              margin: 24px 0; font-size: 1.1em;
              line-height: 1.6;
            }
            .btn {
              display: inline-block; padding: 16px 32px;
              background: linear-gradient(45deg, #4CAF50, #45a049);
              color: white; text-decoration: none;
              border-radius: 12px; margin-top: 24px;
              font-weight: 600; font-size: 1.1em;
              transition: all 0.3s ease;
              box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
            }
            .btn:hover {
              background: linear-gradient(45deg, #45a049, #4CAF50);
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
            }
            .footer {
              margin-top: 32px; font-size: 0.9em; opacity: 0.8;
            }
            @media (max-width: 640px) {
              .success-container { padding: 32px 24px; }
              h1 { font-size: 2em; }
              .subtitle { font-size: 1.1em; }
            }
          </style>
        </head>
        <body>
          <div class="success-container">
            <div class="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p class="subtitle">Your booking has been confirmed and processed successfully</p>
            
            <div class="session-info">
              <div class="session-label">Payment Session ID</div>
              <div>${sessionId}</div>
            </div>
            
            <div class="confirmation-text">
              <strong>What happens next?</strong><br>
              You will receive a confirmation email shortly with your booking details, digital tickets, and event information.
            </div>
            
            <a href="http://localhost:5000" class="btn">Return to Events</a>
            
            <div class="footer">
              Thank you for choosing Treasury 1929
            </div>
          </div>
        </body>
        </html>
      `);
      return;
    }
    
    if (parsedUrl.pathname === '/booking-cancel') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Payment Cancelled - Treasury 1929</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white; min-height: 100vh;
              display: flex; align-items: center; justify-content: center;
              padding: 20px;
            }
            .cancel-container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(15px);
              border-radius: 24px; padding: 48px;
              max-width: 600px; width: 100%;
              box-shadow: 0 16px 64px rgba(0, 0, 0, 0.2);
              text-align: center;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .cancel-icon { 
              font-size: 5em; margin-bottom: 24px; 
              color: #FF9800;
            }
            h1 { 
              font-size: 2.5em; margin-bottom: 16px; 
              font-weight: 700; 
            }
            .subtitle {
              font-size: 1.2em; margin-bottom: 32px;
              opacity: 0.9; line-height: 1.5;
            }
            .info-text {
              margin: 24px 0; font-size: 1.1em;
              line-height: 1.6;
            }
            .btn {
              display: inline-block; padding: 16px 32px;
              background: linear-gradient(45deg, #007bff, #0056b3);
              color: white; text-decoration: none;
              border-radius: 12px; margin-top: 24px;
              font-weight: 600; font-size: 1.1em;
              transition: all 0.3s ease;
              box-shadow: 0 4px 16px rgba(0, 123, 255, 0.3);
            }
            .btn:hover {
              background: linear-gradient(45deg, #0056b3, #007bff);
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
            }
            .footer {
              margin-top: 32px; font-size: 0.9em; opacity: 0.8;
            }
            @media (max-width: 640px) {
              .cancel-container { padding: 32px 24px; }
              h1 { font-size: 2em; }
              .subtitle { font-size: 1.1em; }
            }
          </style>
        </head>
        <body>
          <div class="cancel-container">
            <div class="cancel-icon">⚠️</div>
            <h1>Payment Cancelled</h1>
            <p class="subtitle">Your payment was cancelled and no charges were made</p>
            
            <div class="info-text">
              <strong>No worries!</strong><br>
              You can return to the events page to browse available shows and try booking again when you're ready.
            </div>
            
            <a href="http://localhost:5000" class="btn">Browse Events</a>
            
            <div class="footer">
              Need help? Contact Treasury 1929 support
            </div>
          </div>
        </body>
        </html>
      `);
      return;
    }
    
    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>404 Not Found</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>404 - Page Not Found</h1>
        <p>The requested page was not found on this server.</p>
      </body>
      </html>
    `);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is busy, retrying in 2 seconds...`);
      setTimeout(() => {
        server.close();
        createServer();
      }, 2000);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Payment redirect server running on port ${PORT}`);
    console.log(`Success URL: http://localhost:${PORT}/booking-success`);
    console.log(`Cancel URL: http://localhost:${PORT}/booking-cancel`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Process PID: ${process.pid}`);
  });

  return server;
}

// Keep server alive
const server = createServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  console.log('Restarting server...');
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Keep alive
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Server heartbeat - PID: ${process.pid}`);
}, 300000); // Every 5 minutes

module.exports = server;