const axios = require('axios');
const cheerio = require('cheerio');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getResolution = (width, height) => {
  if (!width || !height) return "";
  return height >= 1920 ? '1080p' : 
         height >= 1280 ? '720p' : 
         height >= 720 ? '480p' : '360p';
};

const formatCount = (num) => {
  if (num >= 1000000) return (num/1000000).toFixed(1) + ' M';
  if (num >= 1000) return (num/1000).toFixed(1) + ' K';
  return num.toString();
};

// Main function to get working video URL
const getWorkingVideoUrl = async (videoId) => {
  const params = new URLSearchParams({
    a: 0,
    bti: 'OHYpOTY0Zik3OjlmOm01MzE6ZDQ0MDo=',
    ch: 0,
    cr: 13,
    dr: 0,
    er: 0,
    lr: 'all',
    net: 0,
    cd: '0|0|0|',
    cv: 1,
    br: 2698,
    bt: 1349,
    cs: 0,
    ds: 6,
    ft: '4bBsyMZj8Zmo0gj8_I4jVcWn-C1rKsd.',
    mime_type: 'video_mp4',
    qs: 0,
    rc: 'NjRpZzszNDc3Z2g4NjdpaUBpampxams5cjpzMzMzNzczM0AwLy1fNC00XjUxMy8vYzFfYSNyazIvMmQ0bGthLS1kMTZzcw==',
    vvpl: 1,
    l: Date.now().toString(16).toUpperCase(),
    btag: 'e00088000'
  });

  return `https://v16m-default.tiktokcdn-us.com/${videoId}/video/tos/useast2a/tos-useast2a-ve-0068c003/?${params.toString()}`;
};

// Main function
module.exports = async (url) => {
  try {
    // Handle short URLs
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      const response = await axios.head(url, {
        maxRedirects: 0,
        validateStatus: null,
        timeout: 3000
      });
      if (response.headers.location) {
        url = response.headers.location;
      }
    }

    // Extract video ID
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (!videoIdMatch) throw new Error('Invalid TikTok URL');
    const videoId = videoIdMatch[1];

    // Get working video URL
    const videoUrl = await getWorkingVideoUrl(videoId);

    // Get video metadata
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.tiktok.com/'
      },
      timeout: 5000
    });

    // Parse metadata
    const $ = cheerio.load(html);
    const script = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
    if (!script) throw new Error('TikTok metadata not found');
    
    const jsonData = JSON.parse(script);
    const videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (!videoData) throw new Error('Video data extraction failed');

    // Format response to match your example exactly
    return {
      id: videoData.id,
      title: videoData.desc || "",
      caption: videoData.desc || "",
      url: url,
      created_at: new Date(videoData.createTime * 1000).toLocaleString('en-US', {
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
      }).replace(',', ''),
      stats: {
        likeCount: formatCount(videoData.stats?.diggCount || 0),
        commentCount: videoData.stats?.commentCount || 0,
        shareCount: videoData.stats?.shareCount || 0,
        playCount: formatCount(videoData.stats?.playCount || 0),
        saveCount: videoData.stats?.collectCount || 0
      },
      video: {
        noWatermark: videoUrl,
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
        title: `original sound - ${videoData.music?.authorName || ""}`,
        author: videoData.music?.authorName || "",
        cover_large: videoData.music?.coverMedium || "",
        cover_medium: videoData.music?.coverThumb || "",
        duration: videoData.music?.duration || 0,
        durationFormatted: formatDuration(videoData.music?.duration || 0),
        play_url: videoData.music?.playUrl || ""
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
    console.error('Error:', error);
    throw error;
  }
};
