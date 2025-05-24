const express = require('express');
const path = require('path');
const tiktokdl = require('./tiktokdl');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// Configure trust proxy for Vercel
app.set('trust proxy', 1); // Trust first proxy

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting with proxy configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable legacy headers
  keyGenerator: (req) => {
    // Use the client's real IP address (considering proxies)
    return req.ip;
  }
});
app.use(limiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Rest of your API code remains the same...
