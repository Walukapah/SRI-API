const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const youtubedl = require('./youtubedl');
const tiktokdl = require('./tiktokdl');
const instagramdl = require('./instagramdl');
const sridl = require('./sridl');
const freefireinfo = require('./freefireinfo');
const maker = require('./textphoto');
const youtubedl2 = require('./youtubedl2');

const app = express();

// GitHub Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
const GITHUB_REPO = 'Walukapah/SRI-API-STORE';
const GITHUB_FILE_PATH = 'stats.json';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

// Middleware
app.use(cors());
app.set('trust proxy', 1);
app.set('json spaces', 2);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip
});
app.use(limiter);

// ============================================
// GITHUB STATS STORAGE SYSTEM
// ============================================

// Get current stats from GitHub
async function getStatsFromGitHub() {
  try {
    const response = await axios.get(GITHUB_API_URL, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const content = Buffer.from(response.data.content, 'base64').toString('utf8');
    return {
      data: JSON.parse(content),
      sha: response.data.sha
    };
  } catch (error) {
    if (error.response?.status === 404) {
      // File doesn't exist, create default stats
      return {
        data: {
          apiCalls: 0,
          visitors: 0,
          lastUpdated: new Date().toISOString(),
          dailyStats: {}
        },
        sha: null
      };
    }
    console.error('GitHub API Error:', error.message);
    throw error;
  }
}

// Save stats to GitHub
async function saveStatsToGitHub(stats, sha) {
  try {
    const content = Buffer.from(JSON.stringify(stats, null, 2)).toString('base64');
    
    const payload = {
      message: `Update API stats - ${new Date().toISOString()}`,
      content: content,
      sha: sha
    };

    const response = await axios.put(GITHUB_API_URL, payload, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Save to GitHub Error:', error.message);
    throw error;
  }
}

// Increment API Call Counter (works for both web and direct links)
async function incrementApiCall(endpoint) {
  try {
    const { data: stats, sha } = await getStatsFromGitHub();
    
    // Increment total calls
    stats.apiCalls = (stats.apiCalls || 0) + 1;
    
    // Track per-endpoint stats
    if (!stats.endpoints) stats.endpoints = {};
    if (!stats.endpoints[endpoint]) {
      stats.endpoints[endpoint] = 0;
    }
    stats.endpoints[endpoint]++;
    
    // Daily tracking
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyStats) stats.dailyStats = {};
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { calls: 0, visitors: 0 };
    }
    stats.dailyStats[today].calls++;
    
    stats.lastUpdated = new Date().toISOString();
    
    await saveStatsToGitHub(stats, sha);
    console.log(`[STATS] API Call tracked: ${endpoint} | Total: ${stats.apiCalls}`);
    
    return stats;
  } catch (error) {
    console.error('Failed to increment API call:', error.message);
  }
}

// Track unique visitor
async function trackVisitor(ip) {
  try {
    const { data: stats, sha } = await getStatsFromGitHub();
    const today = new Date().toISOString().split('T')[0];
    
    if (!stats.dailyStats) stats.dailyStats = {};
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { calls: 0, visitors: 0, uniqueIPs: [] };
    }
    
    // Check if IP already visited today
    if (!stats.dailyStats[today].uniqueIPs) {
      stats.dailyStats[today].uniqueIPs = [];
    }
    
    if (!stats.dailyStats[today].uniqueIPs.includes(ip)) {
      stats.dailyStats[today].uniqueIPs.push(ip);
      stats.dailyStats[today].visitors++;
      stats.visitors = (stats.visitors || 0) + 1;
      
      await saveStatsToGitHub(stats, sha);
      console.log(`[STATS] New visitor tracked: ${ip}`);
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to track visitor:', error.message);
  }
}

// Stats tracking middleware - THIS TRACKS EVERY REQUEST
const statsMiddleware = async (req, res, next) => {
  // Track visitor
  await trackVisitor(req.ip);
  
  // Get endpoint path
  const endpoint = req.route?.path || req.path;
  
  // Use res.on('finish') to track after response is sent
  res.on('finish', async () => {
    // Only track successful API calls (2xx status)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      await incrementApiCall(endpoint);
    }
  });
  
  next();
};

// Apply stats middleware to all routes
app.use(statsMiddleware);

// Public stats endpoint for frontend
app.get('/api/stats', async (req, res) => {
  try {
    const { data: stats } = await getStatsFromGitHub();
    res.json({
      status: true,
      apiCalls: stats.apiCalls || 0,
      visitors: stats.visitors || 0,
      lastUpdated: stats.lastUpdated
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch stats'
    });
  }
});

// ============================================
// API ENDPOINTS (All tracked automatically)
// ============================================

// YouTube Download Endpoint
app.get('/download/youtubedl', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
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

// sri Download Endpoint
app.get('/download/sri', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !url.includes('sri.lk')) {
      return res.status(400).json({ 
        status: false, 
        message: "Please provide a valid sri URL" 
      });
    }

    const sriData = await sridl(url);

    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: sriData
    });

  } catch (error) {
    console.error('sri Error:', error);
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

// Text Photo Generation Endpoint
app.get('/download/textphoto', async (req, res) => {
  try {
    const { url, text } = req.query;
    
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Please provide a URL parameter"
      });
    }
    
    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Please provide a text parameter"
      });
    }

    const result = await maker(url, text);
    
    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: result
    });
    
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
});

// Add to your index.js
app.get('/download/youtubedl2', async (req, res) => {
  try {
    const url = req.query.url;
    
    if (!url || !url.includes('youtu')) {
      return res.status(400).json({ 
        status: false, 
        message: "Please provide a valid YouTube URL" 
      });
    }

    const youtubeData = await youtubedl2(url);

    res.json({
      status: true,
      creator: "WALUKA🇱🇰",
      result: youtubeData
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      status: false, 
      message: error.message
    });
  }
});

module.exports = app;
