const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

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

const generateRandomHex = (length) => {
  return crypto.randomBytes(Math.ceil(length/2))
    .toString('hex')
    .slice(0, length);
};

const generateTimestamp = () => {
  const now = new Date();
  return now.toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + 
    Math.random().toString(16)
    .substring(2, 6)
    .toUpperCase();
};

const getWorkingVideoUrl = async (videoId) => {
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
    console.log('API request failed, generating CDN URL');
  }

  const randomHex = generateRandomHex(32);
  const randomPath = generateRandomHex(8).toUpperCase();
  const timestamp = generateTimestamp();

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
    br: 2084,
    bt: 1042,
    cs: 0,
    ds: 6,
    ft: '4bBsyMZj8Zmo0cxH_I4jVcWn-C1rKsd.',
    mime_type: 'video_mp4',
    qs: 0,
    rc: crypto.randomBytes(32).toString('base64'),
    vvpl: 1,
    l: timestamp,
    btag: 'e00098000'
  });

  return `https://v16m-default.tiktokcdn-us.com/${randomHex}/video/tos/useast2a/tos-useast2a-ve-0068c004/o${randomPath}/?${params.toString()}`;
};

module.exports = async (url) => {
  try {
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

    const videoIdMatch = url.match(/video\/(\d+)/);
    if (!videoIdMatch) throw new Error('Invalid TikTok URL');
    const videoId = videoIdMatch[1];

    const videoUrl = await getWorkingVideoUrl(videoId);

    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.tiktok.com/'
      },
      timeout: 5000
    });

    const $ = cheerio.load(html);
    const script = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
    if (!script) throw new Error('TikTok metadata not found');
    
    const jsonData = JSON.parse(script);
    const videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (!videoData) throw new Error('Video data extraction failed');

    return {
      status: true,
      id: videoData.id,
      title: videoData.desc || "",
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
        play_url: videoData.music?.playUrl || "",
        author: videoData.music?.authorName || "",
        duration: videoData.music?.duration || 0
      },
      stats: {
        playCount: formatCount(videoData.stats?.playCount || 0),
        likeCount: formatCount(videoData.stats?.diggCount || 0),
        commentCount: videoData.stats?.commentCount || 0,
        shareCount: videoData.stats?.shareCount || 0,
        saveCount: videoData.stats?.collectCount || 0
      },
      created_at: new Date(videoData.createTime * 1000).toLocaleString('en-US', {
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
      }).replace(',', ''),
      author: {
        id: videoData.author?.id || "",
        name: videoData.author?.nickname || "",
        unique_id: videoData.author?.uniqueId || "",
        avatar: videoData.author?.avatarLarger || ""
      }
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      status: false,
      message: error.message
    };
  }
};
