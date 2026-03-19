const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const youtubedl = require('./youtubedl');
const tiktokdl = require('./tiktokdl');
const instagramdl = require('./instagramdl');
const sridl = require('./sridl');
const freefireinfo = require('./freefireinfo');
const maker = require('./textphoto');
const youtubedl2 = require('./youtubedl2');

const app = express();

// ============================================
// STATS TRACKING SYSTEM
// ============================================

// In-memory stats storage
const stats = {
  apiCalls: 0,
  visitors: new Set(), // Store unique IPs (all time)
  dailyVisitors: new Set(), // Today's unique IPs
  endpointCalls: {}, // Track per endpoint
  lastReset: new Date().toDateString()
};

// Load stats from file if exists (HF Spaces: /tmp is writable)
const STATS_FILE = '/tmp/stats.json';
try {
  if (fs.existsSync(STATS_FILE)) {
    const savedStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    stats.apiCalls = savedStats.apiCalls || 0;
    stats.lastReset = savedStats.lastReset || new Date().toDateString();
    
    // Check if it's a new day
    const today = new Date().toDateString();
    if (stats.lastReset !== today) {
      stats.dailyVisitors.clear();
      stats.lastReset = today;
    }
    
    if (savedStats.endpointCalls) {
      Object.assign(stats.endpointCalls, savedStats.endpointCalls);
    }
    
    console.log('[STATS] Loaded saved stats:', { 
      apiCalls: stats.apiCalls, 
      visitors: savedStats.visitorCount || 0
    });
  }
} catch (e) {
  console.log('[STATS] Could not load saved stats:', e.message);
}

// Save stats to file
function saveStats() {
  try {
    const statsToSave = {
      apiCalls: stats.apiCalls,
      lastReset: stats.lastReset,
      endpointCalls: stats.endpointCalls,
      visitorCount: stats.visitors.size,
      dailyVisitorCount: stats.dailyVisitors.size
    };
    fs.writeFileSync(STATS_FILE, JSON.stringify(statsToSave, null, 2));
  } catch (e) {
    console.log('[STATS] Could not save stats:', e.message);
  }
}

// Save every 5 minutes
setInterval(saveStats, 5 * 60 * 1000);

// Get client IP (handles proxies)
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.ip || 
         'unknown';
}

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.set('trust proxy', 1); // Trust proxy for IP tracking
app.set('json spaces', 2);

// Track ALL visitors by IP (runs on every request)
app.use((req, res, next) => {
  const clientIP = getClientIP(req);
  const today = new Date().toDateString();
  
  // Track unique visitors
  stats.visitors.add(clientIP);
  
  // Track daily unique visitors
  if (stats.lastReset !== today) {
    stats.dailyVisitors.clear();
    stats.lastReset = today;
  }
  stats.dailyVisitors.add(clientIP);
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => getClientIP(req)
});
app.use(limiter);

// ============================================
// ROOT PATH - Serve HTML Page
// ============================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================
// STATS API ENDPOINTS
// ============================================

// Get current stats
app.get('/stats', (req, res) => {
  res.json({
    status: true,
    apiCalls: stats.apiCalls,
    visitors: stats.visitors.size,
    dailyVisitors: stats.dailyVisitors.size,
    endpointCalls: stats.endpointCalls,
    lastReset: stats.lastReset
  });
});

// Increment stats (for frontend manual tracking if needed)
app.post('/stats/increment', express.json(), (req, res) => {
  const { type, endpoint } = req.body || {};
  
  if (type === 'apiCall') {
    stats.apiCalls++;
    if (endpoint) {
      stats.endpointCalls[endpoint] = (stats.endpointCalls[endpoint] || 0) + 1;
    }
    saveStats();
  }
  
  res.json({ 
    status: true, 
    apiCalls: stats.apiCalls,
    visitors: stats.visitors.size 
  });
});

// ============================================
// API TRACKING MIDDLEWARE
// ============================================

// Automatically track all API calls
function trackApiCall(endpointName) {
  return (req, res, next) => {
    stats.apiCalls++;
    stats.endpointCalls[endpointName] = (stats.endpointCalls[endpointName] || 0) + 1;
    console.log(`[API CALL] ${endpointName} | Total: ${stats.apiCalls}`);
    next();
  };
}

// ============================================
// API ENDPOINTS (සියලුම endpoints වලට tracking එකතු කරයි)
// ============================================

app.get('/download/youtubedl', trackApiCall('YouTube Downloader'), async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      return res.status(400).json({ status: false, message: "Please provide a valid YouTube URL" });
    }
    const youtubeData = await youtubedl(url);
    res.json({ status: true, creator: "WALUKA🇱🇰", result: youtubeData });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});

app.get('/download/tiktokdl', trackApiCall('TikTok Downloader'), async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).json({ success: false, message: "Please provide a valid Tiktok URL" });
    }
    const tiktokData = await tiktokdl(req.query.url);
    res.json({ status: true, creator: "WALUKA🇱🇰", result: tiktokData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/download/instagramdl', trackApiCall('Instagram Downloader'), async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).json({ success: false, message: "Please provide a valid Instagram URL" });
    }
    const instagramData = await instagramdl(req.query.url);
    res.json({ status: true, creator: "WALUKA🇱🇰", result: instagramData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/download/sri', trackApiCall('Sri Downloader'), async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !url.includes('sri.lk')) {
      return res.status(400).json({ status: false, message: "Please provide a valid sri URL" });
    }
    const sriData = await sridl(url);
    res.json({ status: true, creator: "WALUKA🇱🇰", result: sriData });
  } catch (error) {
    console.error('sri Error:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});

app.get('/search/freefire', trackApiCall('Free Fire Player Info'), async (req, res) => {
  try {
    const { region, uid } = req.query;
    if (!region || !uid) {
      return res.status(400).json({ status: false, message: "Please provide both region and uid parameters" });
    }
    const playerData = await freefireinfo(region, uid);
    res.json({ status: true, creator: "WALUKA🇱🇰", result: playerData });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});

app.get('/download/textphoto', trackApiCall('Text to Photo'), async (req, res) => {
  try {
    const { url, text } = req.query;
    if (!url || !text) {
      return res.status(400).json({ status: false, message: "Please provide both url and text parameters" });
    }
    const result = await maker(url, text);
    res.json({ status: true, creator: "WALUKA🇱🇰", result: result });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

app.get('/download/youtubedl2', trackApiCall('YouTube Downloader V2'), async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !url.includes('youtu')) {
      return res.status(400).json({ status: false, message: "Please provide a valid YouTube URL" });
    }
    const youtubeData = await youtubedl2(url);
    res.json({ status: true, creator: "WALUKA🇱🇰", result: youtubeData });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: true, message: 'API is running' });
});

module.exports = app;
