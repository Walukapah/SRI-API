const express = require('express');
const path = require('path');
const tiktokdl = require('./tiktokdl');
const youtubedl = require('./youtubedl');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const ytdl = require('ytdl-core');

const app = express();

// Configuration
app.set('trust proxy', 1);
process.env.YTDL_NO_UPDATE = '1';

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});
app.use(limiter);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// TikTok Download Endpoint
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
    console.error('TikTok API Error:', error);
    res.status(500).json({ 
      status: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// YouTube Download Endpoint
app.get('/download/youtubedl', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !(url.includes('youtube.com') || url.includes('youtu.be'))) {
      return res.status(400).json({ 
        status: false, 
        message: "Please provide a valid YouTube URL" 
      });
    }
    const youtubeData = await youtubedl(url);
    res.json({
      status: true,
      creator: "YourName",
      result: youtubeData
    });
  } catch (error) {
    console.error('YouTube API Error:', error);
    res.status(500).json({ 
      status: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Audio Download Endpoint
app.get('/api/download/audio', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing video ID' });
    
    res.setHeader('Content-Type', 'audio/mpeg');
    ytdl(`https://youtu.be/${id}`, {
      filter: 'audioonly',
      quality: 'highestaudio',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Video Download Endpoint
app.get('/api/download/video', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing video ID' });
    
    res.setHeader('Content-Type', 'video/mp4');
    ytdl(`https://youtu.be/${id}`, {
      quality: 'highest',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
