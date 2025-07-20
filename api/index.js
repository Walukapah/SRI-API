const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const youtubedl = require('./youtubedl');
const tiktokdl = require('./tiktokdl');
const instagramdl = require('./instagramdl');
const pornhubdl = require('./pronhubdl');
const freefireinfo = require('./freefireinfo');
const textphoto = require('./textphoto');

// Middleware
app.use(cors());
app.set('trust proxy', 1);
app.set('json spaces', 2); // Enable pretty printing with 2-space indentation

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
    const url = req.query.url;
    
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.status(400).json({ 
        status: false, 
        message: "Please provide a valid YouTube URL" 
      });
    }

    const youtubeData = await youtubedl(url);

    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: youtubeData
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

// TikTok Download Endpoint
app.get('/download/tiktokdl', async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid Tiktok URL"
      });
    }
    
    const tiktokData = await tiktokdl(req.query.url);
    
    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: tiktokData
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Instagram Download Endpoint
app.get('/download/instagramdl', async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid Instagram URL"
      });
    }
    const instagramData = await instagramdl(req.query.url);

    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: instagramData
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Pornhub Download Endpoint
app.get('/download/pornhubdl', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !url.includes('pornhub.com')) {
      return res.status(400).json({ 
        status: false, 
        message: "Please provide a valid Pornhub URL" 
      });
    }

    const pornhubData = await pornhubdl(url);

    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: pornhubData
    });

  } catch (error) {
    console.error('PornhubDL Error:', error);
    res.status(500).json({ 
      status: false, 
      message: error.message 
    });
  }
});


// Add a new endpoint
app.get('/search/freefire', async (req, res) => {
  try {
    const { region, uid } = req.query;
    
    if (!region || !uid) {
      return res.status(400).json({ 
        status: false, 
        message: "Please provide both region and uid parameters" 
      });
    }

    const playerData = await freefireinfo(region, uid);

    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: playerData
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


// Add this new endpoint to your existing index.js
// Photo Edit Endpoint
// Text Photo Generation Endpoint
app.get('/download/textphoto', async (req, res) => {
  try {
    const { url, ...textParams } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: "URL parameter is required" 
      });
    }

    // Extract all text parameters (text, text2, text3, etc.)
    const texts = [];
    for (const key in textParams) {
      if (key.startsWith('text')) {
        texts.push(textParams[key]);
      }
    }

    if (texts.length === 0) {
      return res.status(400).json({ 
        status: false, 
        message: "At least one text parameter is required" 
      });
    }

    const result = await textphoto(url, texts);

    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: result
    });

  } catch (error) {
    console.error('Text Photo API Error:', error);
    res.status(500).json({ 
      status: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = app;
