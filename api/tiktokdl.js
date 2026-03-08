const axios = require('axios');
const cheerio = require('cheerio');

// Helper functions
const formatDuration = (seconds) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getResolution = (width, height) => {
  if (!width || !height) return "HD";
  return height >= 1920 ? '1080p' : 
         height >= 1280 ? '720p' : 
         height >= 720 ? '480p' : '360p';
};

const formatCount = (num) => {
  if (!num) return "0";
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

// Get video without watermark using multiple APIs
const getNoWatermarkUrl = async (videoUrl) => {
  // Method 1: Using tikwm.com API (Most reliable)
  try {
    const tikwmResponse = await axios.post('https://www.tikwm.com/api/', 
      new URLSearchParams({ url: videoUrl, count: 12, cursor: 0, web: 1, hd: 1 }),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.tikwm.com/'
        },
        timeout: 15000
      }
    );

    if (tikwmResponse.data?.data?.play) {
      return {
        url: tikwmResponse.data.data.play,
        hd_url: tikwmResponse.data.data.hdplay || tikwmResponse.data.data.play,
        quality: tikwmResponse.data.data.hdplay ? 'HD' : 'SD',
        method: 'tikwm'
      };
    }
  } catch (error) {
    console.log('tikwm method failed:', error.message);
  }

  // Method 2: Using ssstik.io
  try {
    // First get the token
    const tokenResponse = await axios.get('https://ssstik.io/en', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    });

    const $ = cheerio.load(tokenResponse.data);
    const token = $('#token').attr('value') || '';

    const ssstikResponse = await axios.post('https://ssstik.io/abc?url=dl', 
      new URLSearchParams({ id: videoUrl, locale: 'en', tt: token }),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Origin': 'https://ssstik.io',
          'Referer': 'https://ssstik.io/en'
        },
        timeout: 15000
      }
    );

    const $2 = cheerio.load(ssstikResponse.data);
    const downloadLink = $2('a[data-event="download_video"]').attr('href');

    if (downloadLink) {
      return {
        url: downloadLink,
        quality: 'HD',
        method: 'ssstik'
      };
    }
  } catch (error) {
    console.log('ssstik method failed:', error.message);
  }

  // Method 3: Using ttdownloader.io
  try {
    const ttdownResponse = await axios.post('https://ttdownloader.io/api/ajaxSearch',
      new URLSearchParams({ q: videoUrl, lang: 'en' }),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://ttdownloader.io/'
        },
        timeout: 15000
      }
    );

    if (ttdownResponse.data?.data) {
      const $ = cheerio.load(ttdownResponse.data.data);
      const noWatermarkLink = $('a[title="Without watermark"]').attr('href');
      if (noWatermarkLink) {
        return {
          url: noWatermarkLink,
          quality: 'HD',
          method: 'ttdownloader'
        };
      }
    }
  } catch (error) {
    console.log('ttdownloader method failed:', error.message);
  }

  return null;
};

// Main function
module.exports = async (url) => {
  try {
    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }

    // Handle short URLs
    let finalUrl = url;
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com') || url.includes('t.tiktok.com')) {
      try {
        const response = await axios.head(url, {
          maxRedirects: 5,
          validateStatus: null,
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (response.headers.location) {
          finalUrl = response.headers.location;
        }
      } catch (redirectError) {
        console.log('Redirect handling error:', redirectError.message);
      }
    }

    // Extract video ID
    const videoIdMatch = finalUrl.match(/video\/(\d+)/) || 
                        finalUrl.match(/\/(\d{15,})/) ||
                        finalUrl.match(/v\/(\d+)/);

    if (!videoIdMatch) {
      throw new Error('Invalid TikTok URL format');
    }

    const videoId = videoIdMatch[1];

    // Get metadata from TikTok page
    const tiktokPageUrl = finalUrl.includes('tiktok.com') ? finalUrl : `https://www.tiktok.com/@user/video/${videoId}`;

    const { data: html } = await axios.get(tiktokPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.tiktok.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });

    // Parse metadata
    const $ = cheerio.load(html);
    const script = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html() || 
                   $('#SIGI_STATE').html() ||
                   $('script:contains("itemInfo")').first().html();

    if (!script) {
      throw new Error('Could not extract video metadata from TikTok page');
    }

    let videoData;
    try {
      const jsonData = JSON.parse(script);
      videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct || 
                  jsonData.__DEFAULT_SCOPE__?.webapp?.videoDetail?.itemInfo?.itemStruct ||
                  jsonData.ItemModule?.[videoId];
    } catch (e) {
      // Try to extract from embedded JSON
      const match = script.match(/itemInfo\s*:\s*({[^}]+})/);
      if (match) {
        videoData = JSON.parse(match[1]);
      }
    }

    if (!videoData) {
      throw new Error('Video data extraction failed');
    }

    // Get no watermark URL
    const noWatermarkData = await getNoWatermarkUrl(finalUrl);

    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoData.id || videoId,
          title: videoData.desc || videoData.title || "TikTok Video",
          caption: videoData.desc || videoData.text || "No caption",
          original_url: finalUrl,
          created_at: videoData.createTime ? new Date(videoData.createTime * 1000).toISOString() : new Date().toISOString(),
          created_at_pretty: videoData.createTime ? 
            new Date(videoData.createTime * 1000).toLocaleString('en-US', {
              day: 'numeric', 
              month: 'long', 
              year: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit'
            }).replace(',', '') : 'Unknown',
          duration: videoData.video?.duration || videoData.duration || 0,
          duration_formatted: formatDuration(videoData.video?.duration || videoData.duration || 0),
          resolution: getResolution(videoData.video?.width, videoData.video?.height),
          cover_image: videoData.video?.cover || videoData.video?.originCover || videoData.cover || "",
          dynamic_cover: videoData.video?.dynamicCover || "",
          width: videoData.video?.width || 0,
          height: videoData.video?.height || 0,
          ratio: videoData.video?.ratio || "9:16"
        },
        statistics: {
          likes: videoData.stats?.diggCount || videoData.stats?.likes || 0,
          likes_formatted: formatCount(videoData.stats?.diggCount || videoData.stats?.likes || 0),
          comments: videoData.stats?.commentCount || videoData.stats?.comments || 0,
          comments_formatted: formatCount(videoData.stats?.commentCount || videoData.stats?.comments || 0),
          shares: videoData.stats?.shareCount || videoData.stats?.shares || 0,
          shares_formatted: formatCount(videoData.stats?.shareCount || videoData.stats?.shares || 0),
          plays: videoData.stats?.playCount || videoData.stats?.views || 0,
          plays_formatted: formatCount(videoData.stats?.playCount || videoData.stats?.views || 0),
          saves: videoData.stats?.collectCount || videoData.stats?.favorites || 0,
          saves_formatted: formatCount(videoData.stats?.collectCount || videoData.stats?.favorites || 0)
        },
        download_links: {
          no_watermark: noWatermarkData ? {
            url: noWatermarkData.hd_url || noWatermarkData.url,
            quality: noWatermarkData.quality,
            server: noWatermarkData.method,
            available: true
          } : {
            url: "",
            quality: "N/A",
            server: "N/A",
            available: false,
            message: "No watermark download temporarily unavailable"
          },
          with_watermark: {
            url: videoData.video?.downloadAddr || videoData.video?.playAddr || "",
            quality: "HD",
            server: "tiktok.com",
            available: !!(videoData.video?.downloadAddr || videoData.video?.playAddr)
          },
          thumbnail: {
            url: videoData.video?.cover || videoData.video?.originCover || "",
            available: !!(videoData.video?.cover || videoData.video?.originCover)
          }
        },
        music: {
          id: videoData.music?.id || "",
          title: videoData.music?.title || videoData.music?.name || `Original Sound - ${videoData.music?.authorName || videoData.author?.nickname || "Unknown"}`,
          author: videoData.music?.authorName || videoData.music?.author || "Unknown",
          album: videoData.music?.album || "",
          duration: videoData.music?.duration || 0,
          duration_formatted: formatDuration(videoData.music?.duration || 0),
          cover: videoData.music?.coverMedium || videoData.music?.cover || "",
          play_url: videoData.music?.playUrl || videoData.music?.play || "",
          available: !!(videoData.music?.playUrl || videoData.music?.play)
        },
        author: {
          id: videoData.author?.id || videoData.author?.secUid || "",
          username: videoData.author?.uniqueId || videoData.author?.username || "",
          nickname: videoData.author?.nickname || videoData.author?.name || "",
          bio: videoData.author?.signature || videoData.author?.bio || "",
          avatar: videoData.author?.avatarLarger || videoData.author?.avatar || "",
          followers: videoData.authorStats?.followerCount || videoData.author?.fans || 0,
          followers_formatted: formatCount(videoData.authorStats?.followerCount || videoData.author?.fans || 0),
          following: videoData.authorStats?.followingCount || videoData.author?.following || 0,
          following_formatted: formatCount(videoData.authorStats?.followingCount || videoData.author?.following || 0),
          likes: videoData.authorStats?.heartCount || videoData.author?.heart || 0,
          likes_formatted: formatCount(videoData.authorStats?.heartCount || videoData.author?.heart || 0),
          verified: videoData.author?.verified || videoData.author?.isVerified || false,
          private: videoData.author?.privateAccount || videoData.author?.isPrivate || false
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.0",
        creator: "WALUKA🇱🇰",
        methods_attempted: noWatermarkData ? [noWatermarkData.method] : ['tikwm', 'ssstik', 'ttdownloader']
      }
    };

    return response;

  } catch (error) {
    console.error('TikTokDL Error:', error);
    return {
      status: "error",
      code: error.response?.status || 500,
      message: error.message || "Failed to fetch TikTok video",
      error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.0",
        creator: "WALUKA🇱🇰"
      }
    };
  }
};
