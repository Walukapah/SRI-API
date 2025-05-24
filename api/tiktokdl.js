const axios = require('axios');
const cheerio = require('cheerio');

async function getWorkingVideoUrl(videoId) {
  try {
    // Try webapp-prime domain first
    const primeUrl = `https://v16-webapp-prime.us.tiktok.com/video/tos/useast2a/tos-useast2a-ve-0068c003/${videoId}/`;
    const primeResponse = await axios.head(primeUrl, { validateStatus: null });
    
    if (primeResponse.status === 200) {
      return primeUrl;
    }

    // Fallback to default CDN
    return `https://v16m-default.tiktokcdn-us.com/${videoId}/video/tos/useast2a/tos-useast2a-ve-0068c003/`;
  } catch (error) {
    console.error('Error checking video URLs:', error);
    throw new Error('Could not find working video URL');
  }
}

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

    // Get working video URL
    const videoUrl = await getWorkingVideoUrl(videoId);

    // Get video page for metadata
    const { data: html } = await axios.get(`https://www.tiktok.com/@placeholder/video/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Parse metadata
    const $ = cheerio.load(html);
    const script = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
    if (!script) throw new Error('TikTok data not found');
    
    const jsonData = JSON.parse(script);
    const videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (!videoData) throw new Error('Video data extraction failed');

    // Format response with all metadata
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
      hashtags: extractHashtags(videoData.desc || "")
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
  return height >= 1920 ? '1080p' : 
         height >= 1280 ? '720p' : 
         height >= 720 ? '480p' : '360p';
}

function extractHashtags(text) {
  const matches = text.match(/#[^\s!@#$%^&*(),.?":{}|<>]+/g) || [];
  return matches.map(tag => tag.replace('#', ''));
}
