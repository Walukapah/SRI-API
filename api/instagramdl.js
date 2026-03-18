// instagramdl.js
const axios = require('axios');

const instagramdl = async (url) => {
    try {
        // Validate URL
        if (!url || (!url.includes('instagram.com') && !url.includes('instagr.am'))) {
            throw new Error('Please provide a valid Instagram URL');
        }

        // API endpoint
        const apiUrl = 'https://vdraw.ai/api/v1/instagram/ins-info';

        // Request headers (mimicking browser request)
        const headers = {
            'authority': 'vdraw.ai',
            'method': 'POST',
            'path': '/api/v1/instagram/ins-info',
            'scheme': 'https',
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'origin': 'https://vdraw.ai',
            'referer': 'https://vdraw.ai/tools/instagram-video-downloader',
            'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36'
        };

        // Request body
        const data = {
            type: "video",
            url: url
        };

        // Make POST request
        const response = await axios.post(apiUrl, data, {
            headers: headers,
            timeout: 30000 // 30 second timeout
        });

        // Check if response is successful
        if (response.data && response.data.status === true) {
            return {
                status: true,
                platform: 'instagram',
                type: response.data.type || 'video',
                title: response.data.title || 'Instagram Video',
                thumbnail: response.data.thumbnail || null,
                duration: response.data.duration || null,
                author: response.data.author || null,
                medias: response.data.medias || response.data.url || [],
                description: response.data.description || null
            };
        } else {
            throw new Error(response.data?.message || 'Failed to fetch Instagram video');
        }

    } catch (error) {
        console.error('InstagramDL Error:', error.message);
        
        // Return detailed error
        if (error.response) {
            // Server responded with error status
            throw new Error(`API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
        } else if (error.request) {
            // Request made but no response
            throw new Error('Network error: No response from server');
        } else {
            // Something else happened
            throw new Error(error.message);
        }
    }
};

module.exports = instagramdl;
