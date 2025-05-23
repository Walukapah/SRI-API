const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function(url) {
    try {
        // New method using TikTok's oEmbed API
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const oembedResponse = await axios.get(oembedUrl);
        
        // Get HTML page to extract additional data
        const htmlResponse = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(htmlResponse.data);
        const scriptData = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').text();
        const jsonData = JSON.parse(scriptData);
        
        // Extract video data
        const videoData = jsonData.__DEFAULT_SCOPE__["webapp.video-detail"].itemInfo.itemStruct;
        
        return {
            title: videoData.desc || "No title",
            caption: videoData.desc || "No caption",
            nowm: videoData.video.downloadAddr || videoData.video.playAddr || "",
            mp3: videoData.music.playUrl || "",
            thumbnail: videoData.video.cover || videoData.video.dynamicCover || ""
        };
    } catch (error) {
        console.error('TikTok API Error:', error.message);
        throw new Error("Failed to fetch TikTok data. TikTok may have changed their API structure.");
    }
};
