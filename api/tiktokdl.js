const axios = require('axios');
const cheerio = require('cheerio');

// Helper function to format duration
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to detect resolution
function getResolution(width, height) {
  if (!width || !height) return "";
  return height >= 1920 ? '1080p' : 
         height >= 1280 ? '720p' : 
         height >= 720 ? '480p' : '360p';
}

// Helper function to extract hashtags
function extractHashtags(text) {
  const matches = text.match(/#[^\s!@#$%^&*(),.?":{}|<>]+/g) || [];
  return matches.map(tag => tag.replace('#', ''));
}

// Main function to get working video URL
async function getWorkingVideoUrl(videoId) {
  const endpoints = [
    // API endpoints
    `https://api.tiktokv.com/aweme/v1/play/?video_id=${videoId}`,
    `https://api2.musical.ly/aweme/v1/play/?video_id=${videoId}`,
    
    // Webapp endpoints
    `https://v16-webapp-prime.us.tiktok.com/video/tos/useast2a/tos-useast2a-ve-0068c003/${videoId}/`,
    `https://v16-webapp.tiktok.com/video/tos/useast2a/tos-useast2a-ve-0068c003/${videoId}/`,
    
    // CDN endpoints
    `https://v16.tiktokcdn.com/${videoId}/video/tos/useast2a/tos-useast2a-ve-0068c003/`,
    `https://v16m.tiktokcdn.com/${videoId}/video/tos/useast2a/tos-useast2a-ve-0068c003/`,
    `https://v16m-default.tiktokcdn-us.com/${videoId}/video/tos/useast2a/tos-useast2a-ve-0068c003/`,
    `https://v19.tiktokcdn.com/${videoId}/video/tos/useast2a/tos-useast2a-ve-0068c003/`,
    
    // International CDNs
    `https://v16.tiktokcdn.com/${videoId}/video/tos/alisg/tos-alisg-pve-0037c001/`,
    `https://v16.tiktokcdn.com/${videoId}/video/tos/maliva/tos-maliva-ve-0068c001/`
  ];

  // Try each endpoint with timeout
  for (const endpoint of endpoints) {
    try {
      const response = await axios.head(endpoint, {
        timeout: 3000,
        validateStatus: (status) => status === 200 || status === 302
      });
      
      if (response.status === 302 && response.headers.location) {
        return response.headers.location;
      }
      if (response.status === 200) {
        return endpoint;
      }
    } catch (e) {
      continue;
    }
  }

  // Final fallback
  return `https://www.tiktok.com/@placeholder/video/${videoId}`;
}

// Main export function
module.exports = async function(url) {
  try {
    // Handle short URLs
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      const response = await axios.head(url, { 
        maxRedirects: 0, 
        validateStatus: null 
      });
      if (response.headers.location) {
        url = response.headers.location;
      }
    }

    // Extract video ID
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (!videoIdMatch) throw new Error('Could not extract video ID');
    const videoId = videoIdMatch[1];

    // Get working video URL with fallback
    let videoUrl;
    try {
      videoUrl = await getWorkingVideoUrl(videoId);
    } catch (e) {
      console.warn('Using web page as fallback URL');
      videoUrl = `https://www.tiktok.com/@placeholder/video/${videoId}`;
    }

    // Get video metadata
    const { data: html } = await axios.get(`https://www.tiktok.com/@placeholder/video/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Parse metadata
    const $ = cheerio.load(html);
    const script = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
    if (!script) throw new Error('TikTok data not found in page');
    
    const jsonData = JSON.parse(script);
    const videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (!videoData) throw new Error('Video data extraction failed');

    // Format complete response
    return {
      status: true,
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
        noWatermark: videoUrl,
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
      },
      hashtags: extractHashtags(videoData.desc || ""),
      warnings: videoUrl.includes('tiktok.com/@') ? 
        ['Could not find direct CDN URL, using web page as fallback'] : 
        []
    };

  } catch (error) {
    console.error('TikTok API Error:', error);
    throw {
      status: false,
      message: 'Failed to fetch TikTok data: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};
