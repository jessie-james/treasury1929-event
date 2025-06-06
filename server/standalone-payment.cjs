const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Success page
app.get('/booking-success', (req, res) => {
  const { session_id } = req.query;
  
  if (!session_id) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Error</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <h1 class="error">Payment Error</h1>
        <p>Missing session information. Please contact support.</p>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
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
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .success { color: #28a745; font-size: 3em; margin-bottom: 20px; }
        .session-info { 
          background: rgba(255, 255, 255, 0.2); 
          padding: 20px; 
          border-radius: 10px; 
          margin: 20px 0;
          word-break: break-all;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #28a745;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          margin-top: 20px;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #218838;
        }
      </style>
    </head>
    <body>
      <div class="success-container">
        <div class="success">✓</div>
        <h1>Payment Successful!</h1>
        <p>Your booking has been confirmed and processed successfully.</p>
        <div class="session-info">
          <strong>Session ID:</strong><br>
          ${session_id}
        </div>
        <p>You will receive a confirmation email shortly with your booking details.</p>
        <a href="http://localhost:5000" class="btn">Return to Events</a>
      </div>
    </body>
    </html>
  `);
});

// Cancel page
app.get('/booking-cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
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
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .cancel { color: #ffc107; font-size: 3em; margin-bottom: 20px; }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          margin-top: 20px;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="cancel-container">
        <div class="cancel">⚠</div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. No charges were made to your account.</p>
        <p>You can return to the events page to try booking again.</p>
        <a href="http://localhost:5000" class="btn">Return to Events</a>
      </div>
    </body>
    </html>
  `);
});

// Keep the server running
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Standalone payment server running on port ${PORT}`);
  console.log(`✓ Success URL: http://localhost:${PORT}/booking-success`);
  console.log(`✓ Cancel URL: http://localhost:${PORT}/booking-cancel`);
});

// Prevent the process from exiting
process.on('SIGTERM', () => {
  console.log('SIGTERM received, keeping server alive');
});

process.on('SIGINT', () => {
  console.log('SIGINT received, keeping server alive');
});

// Keep alive
setInterval(() => {
  console.log(`Server alive at ${new Date().toISOString()}`);
}, 300000); // Log every 5 minutes