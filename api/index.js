const express = require('express');
const path = require('path');
const tiktokdl = require('./tiktokdl');

const app = express();

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
        console.error(error);
        res.status(500).json({ 
            status: false, 
            message: "Error processing your request" 
        });
    }
});

// All other routes serve the index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
