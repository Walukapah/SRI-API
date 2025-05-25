const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

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
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

// Main function to get working video URL
const getWorkingVideoUrl = async (videoId) => {
  try {
    // First try to get signed URL from TikTok API
    const apiResponse = await axios.get(`https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`, {
      headers: {
        'User-Agent': 'com.ss.android.ugc.trill/2613 (Linux; U; Android 10; en_US; Pixel 4; Build/QQ3A.200805.001; Cronet/58.0.2991.0)',
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    if (apiResponse.data?.aweme_list?.[0]?.video?.play_addr?.url_list?.[0]) {
      return {
        url: apiResponse.data.aweme_list[0].video.play_addr.url_list[0],
        quality: 'HD'
      };
    }
  } catch (apiError) {
    console.log('API request failed, using alternative method');
  }

  // Return the clean tikcdn.io URL
  return {
    url: `https://tikcdn.io/tiktokdownload/${videoId}`,
    quality: 'Standard'
  };
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
    const videoIdMatch = url.match(/video\/(\d+)/) || url.match(/\/(\d{15,})/);
    if (!videoIdMatch) throw new Error('Invalid TikTok URL');
    const videoId = videoIdMatch[1];

    // Get working video URL
    const { url: videoUrl, quality } = await getWorkingVideoUrl(videoId);

    // Get video metadata
    const { data: html } = await axios.get(url.includes('tiktok.com') ? url : `https://www.tiktok.com/@placeholder/video/${videoId}`, {
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
    const videoData = jsonData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct || 
                     jsonData.__DEFAULT_SCOPE__?.webapp?.videoDetail?.itemInfo?.itemStruct;

    if (!videoData) throw new Error('Video data extraction failed');

    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoData.id,
          title: videoData.desc || "No title",
          caption: videoData.desc || "No caption",
          original_url: url,
          created_at: new Date(videoData.createTime * 1000).toISOString(),
          created_at_pretty: new Date(videoData.createTime * 1000).toLocaleString('en-US', {
            day: 'numeric', 
            month: 'long', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
          }).replace(',', ''),
          duration: videoData.video?.duration || 0,
          duration_formatted: formatDuration(videoData.video?.duration || 0),
          resolution: getResolution(videoData.video?.width, videoData.video?.height),
          cover_image: videoData.video?.cover || "",
          dynamic_cover: videoData.video?.dynamicCover || "",
          width: videoData.video?.width || 0,
          height: videoData.video?.height || 0,
          ratio: videoData.video?.ratio || "9:16"
        },
        statistics: {
          likes: videoData.stats?.diggCount || 0,
          likes_formatted: formatCount(videoData.stats?.diggCount || 0),
          comments: videoData.stats?.commentCount || 0,
          shares: videoData.stats?.shareCount || 0,
          plays: videoData.stats?.playCount || 0,
          plays_formatted: formatCount(videoData.stats?.playCount || 0),
          saves: videoData.stats?.collectCount || 0
        },
        download_links: {
          no_watermark: {
            url: videoUrl,
            quality: quality,
            server: "tikcdn.io"
          },
          with_watermark: {
            url: videoData.video?.downloadAddr || "",
            quality: "HD",
            server: "tiktok.com"
          }
        },
        music: {
          id: videoData.music?.id || "",
          title: videoData.music?.title || `Original Sound - ${videoData.music?.authorName || ""}`,
          author: videoData.music?.authorName || "Unknown",
          album: videoData.music?.album || "",
          duration: videoData.music?.duration || 0,
          duration_formatted: formatDuration(videoData.music?.duration || 0),
          cover: videoData.music?.coverMedium || "",
          play_url: videoData.music?.playUrl || ""
        },
        author: {
          id: videoData.author?.id || "",
          username: videoData.author?.uniqueId || "",
          nickname: videoData.author?.nickname || "",
          bio: videoData.author?.signature || "",
          avatar: videoData.author?.avatarLarger || "",
          followers: videoData.authorStats?.followerCount || 0,
          following: videoData.authorStats?.followingCount || 0,
          likes: videoData.authorStats?.heartCount || 0,
          verified: videoData.author?.verified || false
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "YourName"
      }
    };

    return response;

  } catch (error) {
    console.error('Error:', error);
    return {
      status: "error",
      code: 500,
      message: error.message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0"
      }
    };
  }
};
