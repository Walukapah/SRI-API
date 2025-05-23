// api/tiktokdl.js - Updated TikTok Downloader API
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function(url) {
    try {
        // Step 1: Extract video ID from URL
        const videoId = url.match(/video\/(\d+)/)?.[1];
        if (!videoId) throw new Error('Invalid TikTok URL');

        // Step 2: Get video page HTML
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tiktok.com/'
            }
        });

        // Step 3: Parse JSON data from HTML
        const $ = cheerio.load(html);
        const script = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
        if (!script) throw new Error('TikTok data not found');

        const jsonData = JSON.parse(script);
        const videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
        if (!videoData) throw new Error('Video data extraction failed');

        // Step 4: Format response
        return {
            id: videoData.id,
            title: videoData.desc || "No title",
            caption: videoData.desc || "No caption",
            url: url,
            created_at: new Date(videoData.createTime * 1000).toLocaleString(),
            stats: {
                likeCount: videoData.stats?.diggCount || 0,
                commentCount: videoData.stats?.commentCount || 0,
                shareCount: videoData.stats?.shareCount || 0,
                playCount: videoData.stats?.playCount || 0,
                saveCount: videoData.stats?.collectCount || 0
            },
            video: {
                noWatermark: videoData.video?.downloadAddr || videoData.video?.playAddr || "",
                watermark: videoData.video?.playAddr || "",
                cover: videoData.video?.cover || "",
                dynamic_cover: videoData.video?.dynamicCover || "",
                origin_cover: videoData.video?.originCover || "",
                width: videoData.video?.width || 0,
                height: videoData.video?.height || 0,
                duration: videoData.video?.duration || 0,
                durationFormatted: formatDuration(videoData.video?.duration || 0),
                ratio: getResolution(videoData.video?.width, videoData.video?.height)
            },
            music: {
                id: videoData.music?.id || "",
                title: videoData.music?.title || "original sound",
                author: videoData.music?.authorName || "",
                play_url: videoData.music?.playUrl || "",
                cover_hd: videoData.music?.coverLarge || "",
                cover_large: videoData.music?.coverMedium || "",
                cover_medium: videoData.music?.coverThumb || "",
                duration: videoData.music?.duration || 0,
                durationFormatted: formatDuration(videoData.music?.duration || 0)
            },
            author: {
                id: videoData.author?.id || "",
                name: videoData.author?.nickname || "",
                unique_id: videoData.author?.uniqueId || "",
                signature: videoData.author?.signature || "",
                avatar: videoData.author?.avatarLarger || "",
                avatar_thumb: videoData.author?.avatarThumb || ""
            }
        };
    } catch (error) {
        console.error('TikTok API Error:', error);
        throw new Error('Failed to fetch TikTok data: ' + error.message);
    }
};

// Helper functions
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getResolution(width, height) {
    if (!width || !height) return "";
    const ratio = height >= 1920 ? '1080p' : 
                 height >= 1280 ? '720p' : 
                 height >= 720 ? '480p' : '360p';
    return ratio;
}
