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
app.get('/download/youtubedl', async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).json({
        success: false,
        message: "URL parameter is required"
      });
    }
    const result = await youtubedl(req.query.url);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
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
