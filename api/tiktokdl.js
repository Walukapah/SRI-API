const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function(url) {
    try {
        // Extract video ID from URL
        const videoId = extractVideoId(url);
        
        // Use TikTok's API to get video info
        const response = await axios.get(`https://api.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const aweme = response.data.aweme_list[0];
        
        return {
            title: aweme.desc || "No title",
            caption: aweme.desc || "No caption",
            nowm: aweme.video.play_addr.url_list[0] || "",
            mp3: aweme.music.play_url.url_list[0] || "",
            thumbnail: aweme.video.cover.url_list[0] || ""
        };
    } catch (error) {
        throw new Error("Failed to fetch TikTok data");
    }
};

function extractVideoId(url) {
    const regex = /video\/(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}
