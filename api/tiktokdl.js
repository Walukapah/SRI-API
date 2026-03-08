const axios = require('axios');
const cheerio = require('cheerio');

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getResolution = (width, height) => {
  if (!width || !height) return "HD";
  if (height >= 1920) return '1080p';
  if (height >= 1280) return '720p';
  if (height >= 720) return '480p';
  return '360p';
};

const formatCount = (num) => {
  if (!num || isNaN(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Convert relative URLs to absolute
const makeAbsoluteUrl = (url, baseDomain) => {
  if (!url) return "";
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${baseDomain}${url}`;
  return `${baseDomain}/${url}`;
};

// ============================================
// URL RESOLUTION & VIDEO ID EXTRACTION
// ============================================

const extractVideoId = (url) => {
  // Pattern 1: /video/1234567890
  let match = url.match(/video\/(\d{15,})/);
  if (match) return match[1];

  // Pattern 2: /v/1234567890 or /1234567890.html
  match = url.match(/[\/v\/](\d{15,})/);
  if (match) return match[1];

  // Pattern 3: ?item_id=1234567890
  match = url.match(/[?&]item_id=(\d{15,})/);
  if (match) return match[1];

  // Pattern 4: ?shareId=1234567890
  match = url.match(/[?&]shareId=(\d{15,})/);
  if (match) return match[1];

  // Pattern 5: Just digits at end of path
  match = url.match(/\/(\d{15,})(?:[#?]|$)/);
  if (match) return match[1];

  return null;
};

const resolveShortUrl = async (shortUrl) => {
  try {
    const response = await axios.get(shortUrl, {
      maxRedirects: 10,
      validateStatus: () => true,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });

    // Check final URL after redirects
    if (response.request?.res?.responseUrl) {
      return response.request.res.responseUrl;
    }
    if (response.headers?.location) {
      return response.headers.location;
    }

    // Try to extract from HTML
    if (response.data && typeof response.data === 'string') {
      const $ = cheerio.load(response.data);

      // Meta refresh
      const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
      if (metaRefresh) {
        const urlMatch = metaRefresh.match(/URL=(.+)/i);
        if (urlMatch) return urlMatch[1].trim();
      }

      // Canonical link
      const canonical = $('link[rel="canonical"]').attr('href');
      if (canonical && canonical.includes('tiktok.com')) {
        return canonical;
      }

      // OG URL
      const ogUrl = $('meta[property="og:url"]').attr('content');
      if (ogUrl && ogUrl.includes('tiktok.com')) {
        return ogUrl;
      }
    }

    return shortUrl;
  } catch (error) {
    console.log('URL resolution error:', error.message);
    return shortUrl;
  }
};

// ============================================
// VIDEO DOWNLOAD URL FETCHERS
// ============================================

// Primary: TikWM API (supports both with and without watermark)
const getVideoUrlsFromTikWM = async (videoUrl) => {
  try {
    console.log('[TikWM] Fetching video data...');

    const response = await axios.post('https://www.tikwm.com/api/', 
      new URLSearchParams({ 
        url: videoUrl, 
        count: 12, 
        cursor: 0, 
        web: 1, 
        hd: 1 
      }),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://www.tikwm.com',
          'Referer': 'https://www.tikwm.com/'
        },
        timeout: 20000
      }
    );

    if (!response.data?.data) {
      throw new Error('Invalid response from TikWM');
    }

    const data = response.data.data;
    const baseDomain = 'https://www.tikwm.com';

    // No watermark URLs
    const noWatermarkSd = data.play ? makeAbsoluteUrl(data.play, baseDomain) : null;
    const noWatermarkHd = data.hdplay ? makeAbsoluteUrl(data.hdplay, baseDomain) : noWatermarkSd;

    // With watermark URL
    const withWatermark = data.wmplay ? makeAbsoluteUrl(data.wmplay, baseDomain) : null;

    // Thumbnail
    const thumbnail = data.cover ? makeAbsoluteUrl(data.cover, baseDomain) : null;

    console.log('[TikWM] No WM:', noWatermarkSd ? '✓' : '✗');
    console.log('[TikWM] With WM:', withWatermark ? '✓' : '✗');

    return {
      success: true,
      no_watermark: {
        sd: noWatermarkSd,
        hd: noWatermarkHd,
        quality: data.hdplay ? 'HD' : 'SD',
        available: !!noWatermarkSd
      },
      with_watermark: {
        url: withWatermark,
        quality: 'HD',
        available: !!withWatermark
      },
      thumbnail: thumbnail,
      method: 'tikwm'
    };

  } catch (error) {
    console.log('[TikWM] Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Secondary: ssstik.io (no watermark only)
const getNoWatermarkFromSSSTik = async (videoUrl) => {
  try {
    console.log('[ssstik] Trying alternative method...');

    // Get token first
    const tokenResponse = await axios.get('https://ssstik.io/en', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(tokenResponse.data);
    const token = $('#token').attr('value') || '';

    // Download request
    const response = await axios.post('https://ssstik.io/abc?url=dl', 
      new URLSearchParams({ 
        id: videoUrl, 
        locale: 'en', 
        tt: token 
      }),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Origin': 'https://ssstik.io',
          'Referer': 'https://ssstik.io/en',
          'Accept': '*/*'
        },
        timeout: 20000
      }
    );

    const $2 = cheerio.load(response.data);
    const downloadLink = $2('a[data-event="download_video"]').attr('href');

    if (downloadLink) {
      return {
        success: true,
        url: downloadLink,
        quality: 'HD',
        method: 'ssstik'
      };
    }

    throw new Error('Download link not found');

  } catch (error) {
    console.log('[ssstik] Error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// TIKTOK METADATA FETCHER
// ============================================

const getTikTokMetadata = async (videoId, videoUrl) => {
  try {
    console.log('[Metadata] Fetching from TikTok...');

    const pageUrl = videoUrl.includes('/video/') ? videoUrl : `https://www.tiktok.com/@user/video/${videoId}`;

    const { data: html } = await axios.get(pageUrl, {
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
      timeout: 15000
    });

    const $ = cheerio.load(html);

    // Try multiple script sources
    let videoData = null;
    const scripts = [
      $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html(),
      $('#SIGI_STATE').html(),
      $('script:contains("itemInfo")').first().html(),
      $('script:contains("ItemModule")').first().html()
    ];

    for (const script of scripts) {
      if (!script) continue;

      try {
        const jsonData = JSON.parse(script);
        videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct || 
                    jsonData.__DEFAULT_SCOPE__?.webapp?.videoDetail?.itemInfo?.itemStruct ||
                    jsonData.ItemModule?.[videoId];

        if (videoData) break;
      } catch (e) {
        // Try regex extraction
        const match = script.match(/itemInfo\s*:\s*({.+?}(?=,\s*"|$))/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            videoData = parsed.itemStruct;
            if (videoData) break;
          } catch (e2) {}
        }
      }
    }

    if (!videoData) {
      throw new Error('Metadata not found');
    }

    return {
      success: true,
      data: videoData
    };

  } catch (error) {
    console.log('[Metadata] Error:', error.message);
    return { 
      success: false, 
      error: error.message,
      fallback: {
        id: videoId,
        desc: "TikTok Video",
        createTime: Math.floor(Date.now() / 1000),
        video: { duration: 0, width: 0, height: 0, ratio: "9:16" },
        stats: { diggCount: 0, commentCount: 0, shareCount: 0, playCount: 0, collectCount: 0 },
        author: { uniqueId: "unknown", nickname: "Unknown User" }
      }
    };
  }
};

// ============================================
// MAIN FUNCTION
// ============================================

module.exports = async (url) => {
  try {
    // Validate input
    if (!url || typeof url !== 'string') {
      return {
        status: "error",
        code: 400,
        message: "Invalid URL provided",
        data: null,
        meta: { timestamp: new Date().toISOString(), version: "3.0", creator: "WALUKA🇱🇰" }
      };
    }

    console.log('========================================');
    console.log('Processing URL:', url);
    console.log('========================================');

    // Step 1: Resolve short URLs
    let finalUrl = url;
    const isShortUrl = /(vm\.tiktok\.com|vt\.tiktok\.com|t\.tiktok\.com|m\.tiktok\.com)/i.test(url);

    if (isShortUrl) {
      console.log('[Step 1] Resolving short URL...');
      finalUrl = await resolveShortUrl(url);
      console.log('[Step 1] Resolved to:', finalUrl);
    }

    // Step 2: Extract video ID
    console.log('[Step 2] Extracting video ID...');
    let videoId = extractVideoId(finalUrl);

    // Fallback: Try to get ID from HTML if not in URL
    if (!videoId) {
      console.log('[Step 2] Trying HTML extraction...');
      try {
        const { data: html } = await axios.get(finalUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 10000
        });

        const patterns = [
          /video\/(\d{15,})/,
          /"id":"(\d{15,})"/,
          /itemId":"(\d{15,})"/,
          /videoId":"(\d{15,})"/
        ];

        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            videoId = match[1];
            console.log('[Step 2] Found ID from HTML:', videoId);
            break;
          }
        }
      } catch (e) {
        console.log('[Step 2] HTML extraction failed:', e.message);
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
          tip: "Use full URL: https://www.tiktok.com/@username/video/1234567890"
        },
        data: null,
        meta: { timestamp: new Date().toISOString(), version: "3.0", creator: "WALUKA🇱🇰" }
      };
    }

    console.log('[Step 2] Video ID:', videoId);

    // Step 3: Get download URLs (parallel with metadata)
    console.log('[Step 3] Fetching video URLs...');
    const [urlData, metadata] = await Promise.all([
      getVideoUrlsFromTikWM(url),
      getTikTokMetadata(videoId, finalUrl)
    ]);

    // If TikWM fails for no_watermark, try ssstik
    let noWatermarkData = urlData.no_watermark;
    if (!noWatermarkData?.available) {
      console.log('[Step 3] Trying ssstik for no watermark...');
      const ssstikData = await getNoWatermarkFromSSSTik(url);
      if (ssstikData.success) {
        noWatermarkData = {
          sd: ssstikData.url,
          hd: ssstikData.url,
          quality: ssstikData.quality,
          available: true
        };
      }
    }

    // Step 4: Build response
    console.log('[Step 4] Building response...');

    const videoData = metadata.success ? metadata.data : metadata.fallback;
    const createTime = videoData.createTime ? new Date(videoData.createTime * 1000) : new Date();

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
          created_at: createTime.toISOString(),
          created_at_pretty: createTime.toLocaleString('en-US', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }).replace(',', ''),
          duration: videoData.video?.duration || 0,
          duration_formatted: formatDuration(videoData.video?.duration),
          resolution: getResolution(videoData.video?.width, videoData.video?.height),
          cover_image: videoData.video?.cover || videoData.video?.originCover || urlData.thumbnail || "",
          dynamic_cover: videoData.video?.dynamicCover || "",
          width: videoData.video?.width || 0,
          height: videoData.video?.height || 0,
          ratio: videoData.video?.ratio || "9:16",
          format: "mp4"
        },
        statistics: {
          likes: videoData.stats?.diggCount || 0,
          likes_formatted: formatCount(videoData.stats?.diggCount),
          comments: videoData.stats?.commentCount || 0,
          comments_formatted: formatCount(videoData.stats?.commentCount),
          shares: videoData.stats?.shareCount || 0,
          shares_formatted: formatCount(videoData.stats?.shareCount),
          plays: videoData.stats?.playCount || 0,
          plays_formatted: formatCount(videoData.stats?.playCount),
          saves: videoData.stats?.collectCount || 0,
          saves_formatted: formatCount(videoData.stats?.collectCount)
        },
        download_links: {
          no_watermark: {
            sd: noWatermarkData?.sd || "",
            hd: noWatermarkData?.hd || noWatermarkData?.sd || "",
            quality: noWatermarkData?.quality || "N/A",
            available: noWatermarkData?.available || false,
            server: urlData.method || "unknown"
          },
          with_watermark: {
            url: urlData.with_watermark?.url || "",
            quality: urlData.with_watermark?.quality || "N/A",
            available: urlData.with_watermark?.available || false,
            server: urlData.method || "unknown"
          },
          thumbnail: {
            url: urlData.thumbnail || videoData.video?.cover || "",
            available: !!(urlData.thumbnail || videoData.video?.cover)
          }
        },
        music: {
          id: videoData.music?.id || "",
          title: videoData.music?.title || videoData.music?.name || `Original Sound - ${videoData.music?.authorName || videoData.author?.nickname || "Unknown"}`,
          author: videoData.music?.authorName || videoData.music?.author || "Unknown",
          album: videoData.music?.album || "",
          duration: videoData.music?.duration || 0,
          duration_formatted: formatDuration(videoData.music?.duration),
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
          followers_formatted: formatCount(videoData.authorStats?.followerCount || videoData.author?.fans),
          following: videoData.authorStats?.followingCount || videoData.author?.following || 0,
          following_formatted: formatCount(videoData.authorStats?.followingCount || videoData.author?.following),
          likes: videoData.authorStats?.heartCount || videoData.author?.heart || 0,
          likes_formatted: formatCount(videoData.authorStats?.heartCount || videoData.author?.heart),
          verified: videoData.author?.verified || videoData.author?.isVerified || false,
          private: videoData.author?.privateAccount || videoData.author?.isPrivate || false
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "3.0",
        creator: "WALUKA🇱🇰",
        methods_used: [
          urlData.method || "none",
          !noWatermarkData?.available && urlData.method === 'tikwm' ? 'ssstik' : null
        ].filter(Boolean),
        metadata_source: metadata.success ? 'tiktok_page' : 'fallback'
      }
    };

    console.log('========================================');
    console.log('Success! Video processed.');
    console.log('========================================');

    return response;

  } catch (error) {
    console.error('========================================');
    console.error('TikTokDL Error:', error);
    console.error('========================================');

    return {
      status: "error",
      code: error.response?.status || 500,
      message: error.message || "Failed to fetch TikTok video",
      error_details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        response: error.response?.data
      } : undefined,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "3.0",
        creator: "WALUKA🇱🇰"
      }
    };
  }
};
