const http = require('http');
const url = require('url');

const PORT = 3002;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      port: PORT,
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  if (parsedUrl.pathname === '/booking-success') {
    const sessionId = parsedUrl.query.session_id;
    
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Error</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc3545;">Payment Error</h1>
          <p>Missing session information. Please contact support.</p>
        </body>
        </html>
      `);
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 40px; 
            text-align: center; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .success-container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          .success-icon { 
            font-size: 4em; 
            margin-bottom: 20px; 
            color: #4CAF50;
          }
          h1 { 
            font-size: 2.5em; 
            margin-bottom: 20px; 
          }
          .session-info { 
            background: rgba(255, 255, 255, 0.2); 
            padding: 20px; 
            border-radius: 10px; 
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
          }
          .btn {
            display: inline-block;
            padding: 15px 30px;
            background: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            margin-top: 20px;
            font-weight: bold;
          }
          .btn:hover {
            background: #218838;
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✓</div>
          <h1>Payment Successful!</h1>
          <p>Your booking has been confirmed and processed successfully.</p>
          <div class="session-info">
            <strong>Session ID:</strong><br>
            ${sessionId}
          </div>
          <p>You will receive a confirmation email shortly with your booking details.</p>
          <a href="http://localhost:5000" class="btn">Return to Events</a>
        </div>
      </body>
      </html>
    `);
    return;
  }
  
  if (parsedUrl.pathname === '/booking-cancel') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Cancelled</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 40px; 
            text-align: center; 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .cancel-container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          .cancel-icon { 
            font-size: 4em; 
            margin-bottom: 20px; 
            color: #FF9800;
          }
          h1 { 
            font-size: 2.5em; 
            margin-bottom: 20px; 
          }
          .btn {
            display: inline-block;
            padding: 15px 30px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 10px;
            margin-top: 20px;
            font-weight: bold;
          }
          .btn:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="cancel-container">
          <div class="cancel-icon">⚠</div>
          <h1>Payment Cancelled</h1>
          <p>Your payment was cancelled. No charges were made to your account.</p>
          <p>You can return to the events page to try booking again.</p>
          <a href="http://localhost:5000" class="btn">Return to Events</a>
        </div>
      </body>
      </html>
    `);
    return;
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Payment server running on port ${PORT}`);
  console.log(`Success URL: http://localhost:${PORT}/booking-success`);
  console.log(`Cancel URL: http://localhost:${PORT}/booking-cancel`);
});

// Keep server alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, keeping server alive');
});

process.on('SIGINT', () => {
  console.log('SIGINT received, keeping server alive');  
});

module.exports = server;