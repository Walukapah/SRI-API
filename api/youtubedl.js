const axios = require('axios');
const qs = require('qs');

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Generate dynamic cookie
const generateCookie = () => {
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `PHPSESSID=${randomStr}`;
};

const getVideoData = async (videoUrl) => {
  const params = new URLSearchParams();
  params.append('url', videoUrl);
  
  const headers = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://ytsave.to",
    "Referer": "https://ytsave.to/en2/",
    "Sec-Ch-Ua": '"Not A(Brand";v="8", "Chromium";v="132"',
    "Sec-Ch-Ua-Mobile": "?1",
    "Sec-Ch-Ua-Platform": '"Android"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Cookie": generateCookie()
  };

  try {
    const response = await axios.post(
      "https://ytsave.to/proxy.php",
      params.toString(),
      { 
        headers,
        timeout: 30000,
        maxRedirects: 5
      }
    );
    
    return response.data;
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
};

module.exports = async (url) => {
  try {
    // Extract video ID
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL format');
    const videoId = videoIdMatch[1];

    console.log(`Processing video ID: ${videoId}`);

    // Get video data from API
    const videoData = await getVideoData(url);
    
    if (!videoData || !videoData.api) {
      throw new Error('Invalid API response');
    }

    const apiData = videoData.api;
    
    // Check status - can be "ok" or "OK"
    const status = apiData.status?.toLowerCase();
    if (status !== "ok" && status !== "success") {
      throw new Error(`API Error: ${apiData.message || 'Unknown error'}`);
    }

    // If still processing, we can still return data with preview URLs
    const isProcessing = apiData.message?.toLowerCase().includes('processing');
    if (isProcessing) {
      console.log('Video is still processing, using available data...');
    }

    const mediaItems = apiData.mediaItems || [];
    
    if (mediaItems.length === 0) {
      throw new Error('No download links found for this video');
    }

    // Build response - use mediaPreviewUrl as the actual download URL
    const mainResponse = {
      status: "success",
      code: 200,
      message: isProcessing ? "Video processing, links available" : "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: apiData.title || "No title",
          description: apiData.description || "No description",
          original_url: url,
          thumbnail: apiData.imagePreviewUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          duration: mediaItems[0]?.mediaDuration || "00:00",
          duration_seconds: parseDuration(mediaItems[0]?.mediaDuration)
        },
        author: {
          name: apiData.userInfo?.name || "Unknown",
          username: apiData.userInfo?.username || "",
          avatar: apiData.userInfo?.userAvatar || "",
          verified: apiData.userInfo?.isVerified || false
        },
        statistics: {
          views: apiData.mediaStats?.viewsCount || "0",
          likes: apiData.mediaStats?.likesCount || "0",
          comments: apiData.mediaStats?.commentsCount || "0"
        },
        downloads: {
          video: [],
          audio: []
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        creator: "WALUKA🇱🇰",
        service: "ytsave.to"
      }
    };

    // Process media items - use mediaPreviewUrl as download URL
    mediaItems.forEach((item) => {
      const downloadItem = {
        quality: item.mediaQuality || 'unknown',
        resolution: item.mediaRes || 'unknown',
        // KEY FIX: Use mediaPreviewUrl instead of mediaUrl
        url: item.mediaPreviewUrl || item.mediaUrl,
        size: item.mediaFileSize || 'unknown',
        extension: item.mediaExtension || (item.type === 'Audio' ? 'm4a' : 'mp4'),
        duration: item.mediaDuration || "00:00"
      };

      if (item.type === 'Video') {
        mainResponse.data.downloads.video.push(downloadItem);
      } else if (item.type === 'Audio') {
        mainResponse.data.downloads.audio.push(downloadItem);
      }
    });

    // Sort by quality (high to low)
    mainResponse.data.downloads.video.sort((a, b) => {
      const qualityOrder = { 'FHD': 4, 'HD': 3, 'SD': 2, 'unknown': 1 };
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });

    return mainResponse;

  } catch (error) {
    console.error('YouTubeDL Error:', error.message);
    return {
      status: "error",
      code: 500,
      message: error.message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        creator: "WALUKA🇱🇰"
      }
    };
  }
};

// Helper to parse duration string to seconds
function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
