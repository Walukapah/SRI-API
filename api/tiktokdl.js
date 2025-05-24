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

const extractHashtags = (text) => {
  return (text.match(/#[^\s!@#$%^&*(),.?":{}|<>]+/g) || [];
};

// Main function to get working video URL
const getWorkingVideoUrl = async (videoId) => {
  // Try to get signed URL from TikTok API first
  try {
    const apiResponse = await axios.get(`https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`, {
      headers: {
        'User-Agent': 'com.ss.android.ugc.trill/2613 (Linux; U; Android 10; en_US; Pixel 4; Build/QQ3A.200805.001; Cronet/58.0.2991.0)',
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    if (apiResponse.data?.aweme_list?.[0]?.video?.play_addr?.url_list?.[0]) {
      return apiResponse.data.aweme_list[0].video.play_addr.url_list[0];
    }
  } catch (apiError) {
    console.log('API request failed, falling back to CDN');
  }

  // If API fails, construct CDN URL with required parameters
  const params = new URLSearchParams({
    a: 1988,
    bti: 'ODszNWYuMDE6',
    ch: 0,
    cr: 3,
    dr: 0,
    lr: 'all',
    cd: '0|0|0|',
    cv: 1,
    br: 2698,
    bt: 1349,
    cs: 0,
    ds: 6,
    ft: '4KJMyMzm8Zmo0rX8_I4jVy5ZdpWrKsd.',
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
    const { data: html } = await axios.get(`https://www.tiktok.com/@placeholder/video/${videoId}`, {
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

    // Format response
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
      hashtags: extractHashtags(videoData.desc || "")
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      status: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
  }
};
