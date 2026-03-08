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

// Extract video ID from various TikTok URL formats
const extractVideoId = (url) => {
  // Pattern 1: Standard URL https://www.tiktok.com/@username/video/1234567890
  let match = url.match(/video\/(\d+)/);
  if (match) return match[1];

  // Pattern 2: Direct video ID in path /v/1234567890 or /1234567890.html
  match = url.match(/[\/v\/](\d{15,})/);
  if (match) return match[1];

  // Pattern 3: item_id parameter
  match = url.match(/[?&]item_id=(\d+)/);
  if (match) return match[1];

  // Pattern 4: shareId parameter
  match = url.match(/[?&]shareId=(\d+)/);
  if (match) return match[1];

  return null;
};

// Resolve short URL to full URL
const resolveShortUrl = async (shortUrl) => {
  try {
    const response = await axios.get(shortUrl, {
      maxRedirects: 5,
      validateStatus: () => true,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Check if we got redirected
    if (response.request?.res?.responseUrl) {
      return response.request.res.responseUrl;
    }

    // Check Location header
    if (response.headers?.location) {
      return response.headers.location;
    }

    // Try to extract from HTML if it's a meta refresh or JavaScript redirect
    if (response.data && typeof response.data === 'string') {
      const $ = cheerio.load(response.data);

      // Check meta refresh
      const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
      if (metaRefresh) {
        const urlMatch = metaRefresh.match(/URL=(.+)/i);
        if (urlMatch) return urlMatch[1].trim();
      }

      // Check canonical link
      const canonical = $('link[rel="canonical"]').attr('href');
      if (canonical && canonical.includes('tiktok.com')) {
        return canonical;
      }

      // Check for data in script tags
      const scripts = $('script').map((i, el) => $(el).html()).get();
      for (const script of scripts) {
        if (script && script.includes('video')) {
          const idMatch = script.match(/video\/(\d+)/);
          if (idMatch) {
            return `https://www.tiktok.com/@user/video/${idMatch[1]}`;
          }
        }
      }
    }

    return shortUrl;
  } catch (error) {
    console.log('URL resolution error:', error.message);
    return shortUrl;
  }
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

  return null;
};

// Main function
module.exports = async (url) => {
  try {
    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }

    console.log('Original URL:', url);

    // Check if it's a short URL and resolve it
    let finalUrl = url;
    const isShortUrl = url.includes('vm.tiktok.com') || 
                       url.includes('vt.tiktok.com') || 
                       url.includes('t.tiktok.com') ||
                       url.includes('m.tiktok.com');

    if (isShortUrl) {
      console.log('Detected short URL, resolving...');
      finalUrl = await resolveShortUrl(url);
      console.log('Resolved URL:', finalUrl);
    }

    // Extract video ID
    let videoId = extractVideoId(finalUrl);

    // If still no video ID, try to fetch the page and extract from HTML
    if (!videoId) {
      console.log('No video ID found in URL, fetching page content...');
      try {
        const { data: html } = await axios.get(finalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 10000
        });

        // Try multiple patterns in the HTML
        const patterns = [
          /video\/(\d{15,})/,
          /"id":"(\d{15,})"/,
          /itemId":"(\d{15,})"/,
          /videoId":"(\d{15,})"/,
          /\/video\/(\d+)/
        ];

        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            videoId = match[1];
            console.log('Found video ID from HTML:', videoId);
            break;
          }
        }
      } catch (e) {
        console.log('Failed to fetch page for ID extraction:', e.message);
      }
    }

    if (!videoId) {
      return {
        status: "error",
        code: 400,
        message: "Could not extract video ID from URL",
        debug_info: {
          original_url: url,
          resolved_url: finalUrl,
          tip: "Please use a full TikTok URL like https://www.tiktok.com/@username/video/1234567890"
        },
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: "2.1",
          creator: "WALUKA🇱🇰"
        }
      };
    }

    console.log('Extracted Video ID:', videoId);

    // Construct a proper TikTok URL for metadata extraction
    const tiktokPageUrl = finalUrl.includes('tiktok.com') && finalUrl.includes('/video/') 
      ? finalUrl 
      : `https://www.tiktok.com/@user/video/${videoId}`;

    // Get metadata from TikTok page
    let videoData = null;
    try {
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
                     $('script:contains("itemInfo")').first().html() ||
                     $('script:contains("ItemModule")').first().html();

      if (script) {
        try {
          const jsonData = JSON.parse(script);
          videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct || 
                      jsonData.__DEFAULT_SCOPE__?.webapp?.videoDetail?.itemInfo?.itemStruct ||
                      jsonData.ItemModule?.[videoId];
        } catch (e) {
          // Try to extract from embedded JSON
          const match = script.match(/itemInfo\s*:\s*({.+?})/) || 
                       script.match(/ItemModule\s*:\s*({.+?})/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              videoData = parsed.itemStruct || parsed[videoId];
            } catch (e2) {
              console.log('Failed to parse embedded JSON');
            }
          }
        }
      }
    } catch (error) {
      console.log('Metadata extraction error:', error.message);
    }

    // If we couldn't get metadata from TikTok page, use the video ID to get download links anyway
    if (!videoData) {
      console.log('Using fallback data structure');
      videoData = {
        id: videoId,
        desc: "TikTok Video",
        createTime: Math.floor(Date.now() / 1000),
        video: {
          duration: 0,
          width: 0,
          height: 0,
          ratio: "9:16"
        },
        stats: {
          diggCount: 0,
          commentCount: 0,
          shareCount: 0,
          playCount: 0,
          collectCount: 0
        },
        author: {
          uniqueId: "unknown",
          nickname: "Unknown User"
        }
      };
    }

    // Get no watermark URL using the original provided URL (short or full)
    const noWatermarkData = await getNoWatermarkUrl(url);

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
          original_url: url,
          resolved_url: finalUrl !== url ? finalUrl : undefined,
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
        version: "2.1",
        creator: "WALUKA🇱🇰",
        methods_attempted: noWatermarkData ? [noWatermarkData.method] : ['tikwm', 'ssstik']
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
        version: "2.1",
        creator: "WALUKA🇱🇰"
      }
    };
  }
};
