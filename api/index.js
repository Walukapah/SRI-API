const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const youtubedl = require('./youtubedl');
const tiktokdl = require('./tiktokdl');

const app = express();

// Middleware
app.use(cors());
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip
});
app.use(limiter);

// YouTube Download Endpoint
// API endpoint එකක් ලෙස එක් කරන්න
app.get('/download/youtubedl', async (req, res) => {
  try {
    const { url, type = 'mp4', quality = '720p' } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: "YouTube URL is required" 
      });
    }

    const result = await y2mate(url, type, quality);
    
    if (result.status === 'error') {
      return res.status(400).json(result);
    }

    res.json({
      status: true,
      result: result
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      status: false, 
      message: error.message
    });
  }
});

// TikTok Download Endpoint
app.get('/download/tiktokdl', async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).json({
        success: false,
        message: "URL parameter is required"
      });
    }
    const result = await tiktokdl(req.query.url);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = app;
