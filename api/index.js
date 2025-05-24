const express = require('express');
const path = require('path');
const tiktokdl = require('./tiktokdl');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
app.use(limiter);

// Serve static files
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
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: error.message 
    });
  }
});

// All other routes serve the web interface
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
