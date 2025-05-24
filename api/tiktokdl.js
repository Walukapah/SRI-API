const axios = require('axios');
const cheerio = require('cheerio');

// Helper function to follow redirects
async function followRedirects(url) {
  try {
    const response = await axios.head(url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    if (response.headers.location) {
      return response.headers.location;
    }
    return url;
  } catch (error) {
    if (error.response?.status === 301 || error.response?.status === 302) {
      return error.response.headers.location;
    }
    throw error;
  }
}

// Helper function to extract video ID
function extractVideoId(url) {
  // Handle standard URLs
  const standardMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
  if (standardMatch) return standardMatch[1];
  
  // Handle short URLs after redirect
  const shortMatch = url.match(/video\/(\d+)/);
  if (shortMatch) return shortMatch[1];
  
  throw new Error('Could not extract video ID from URL');
}

module.exports = async function(url) {
  try {
    // Step 1: Handle short URLs (vm.tiktok.com, vt.tiktok.com)
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      url = await followRedirects(url);
    }

    // Step 2: Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error('Invalid TikTok URL format');

    // Step 3: Get video page with proper headers
    const { data: html } = await axios.get(`https://www.tiktok.com/@placeholder/video/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Step 4: Parse JSON data from HTML
    const $ = cheerio.load(html);
    const script = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
    if (!script) throw new Error('TikTok data not found in page');

    const jsonData = JSON.parse(script);
    const videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (!videoData) throw new Error('Video data extraction failed');

    // Step 5: Format response
    return {
      id: videoData.id,
      title: videoData.desc || "No title",
      caption: videoData.desc || "No caption",
      url: `https://www.tiktok.com/@${videoData.author?.uniqueId}/video/${videoData.id}`,
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
        width: videoData.video?.width || 0,
        height: videoData.video?.height || 0,
        duration: videoData.video?.duration || 0
      },
      music: {
        id: videoData.music?.id || "",
        title: videoData.music?.title || "original sound",
        author: videoData.music?.authorName || "",
        play_url: videoData.music?.playUrl || "",
        cover: videoData.music?.coverLarge || ""
      },
      author: {
        id: videoData.author?.id || "",
        name: videoData.author?.nickname || "",
        unique_id: videoData.author?.uniqueId || "",
        avatar: videoData.author?.avatarLarger || ""
      }
    };

  } catch (error) {
    console.error('TikTok API Error:', error);
    throw new Error('Failed to fetch TikTok data: ' + error.message);
  }
};
