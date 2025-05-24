// Import required modules
const express = require('express');
const path = require('path');
const tiktokdl = require('./tiktokdl');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Initialize Express application
const app = express();

// Configure trust proxy for Vercel
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});
app.use(limiter);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint
app.get('/download/tiktokdl', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url || !url.includes('tiktok.com')) {
      return res.status(400).json({ 
        status: false, 
        message: "Please provide a valid TikTok URL" 
      });
    }

    const tiktokData = await tiktokdl(url);

    res.json({
      status: true,
      creator: "YourName",
      result: tiktokData
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      status: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// All other routes serve the web interface
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Export the Express app
module.exports = app;
