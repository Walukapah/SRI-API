const express = require('express');
const tiktokdl = require('./tiktokdl');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/download/tiktokdl', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) return res.status(400).json({ error: 'URL parameter is required' });
        
        const data = await tiktokdl(url);
        res.json({
            status: true,
            creator: "YourName",
            result: data
        });
    } catch (error) {
        res.status(500).json({ 
            status: false,
            error: error.message
        });
    }
});

module.exports = app;
