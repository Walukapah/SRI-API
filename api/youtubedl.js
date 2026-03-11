const axios = require('axios');

// Generate dynamic cookie
const generateCookie = () => {
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `PHPSESSID=${randomStr}`;
};

const formatDuration = (seconds) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (!num) return "0";
  num = parseInt(num) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
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

// Format ytsave.to response to youtubedl.js format
const formatToYoutubedlResponse = (videoData, videoId, originalUrl) => {
  // Extract media items from the response
  const mediaItems = videoData?.mediaItems || [];
  
  // Get video info from first media item if available
  const firstItem = mediaItems[0] || {};
  const duration = parseInt(firstItem.mediaDuration) || 0;
  
  // Extract statistics
  const mediaStats = videoData?.mediaStats || {};
  const viewsCount = parseInt(mediaStats.viewsCount) || 0;
  const likesCount = parseInt(mediaStats.likesCount) || 0;
  const commentsCount = parseInt(mediaStats.commentsCount) || 0;
  
  // Extract user info
  const userInfo = videoData?.userInfo || {};
  
  // Format download items
  const downloadItems = mediaItems.map(item => ({
    type: item.type || 'video',
    quality: item.mediaQuality || 'unknown',
    url: item.mediaUrl || '',
    previewUrl: item.mediaPreviewUrl || '',
    thumbnail: item.mediaThumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    resolution: item.mediaRes || 'unknown',
    duration: parseInt(item.mediaDuration) || 0,
    duration_formatted: formatDuration(item.mediaDuration),
    extension: item.mediaExtension || (item.type === 'video' ? 'mp4' : 'mp3'),
    size: item.mediaFileSize || 'unknown'
  }));

  return {
    status: "success",
    code: 200,
    message: "Video data retrieved successfully",
    data: {
      video_info: {
        id: videoId,
        title: videoData?.title || "No title",
        description: videoData?.description || "No description",
        original_url: originalUrl,
        previewUrl: videoData?.previewUrl || "",
        imagePreviewUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        permanentLink: videoData?.permanentLink || `https://youtu.be/${videoId}`,
        duration: duration,
        duration_formatted: formatDuration(duration)
      },
      statistics: {
        views: viewsCount,
        views_formatted: formatCount(viewsCount),
        likes: likesCount,
        likes_formatted: formatCount(likesCount),
        comments: commentsCount,
        comments_formatted: formatCount(commentsCount)
      },
      download_links: {
        status: downloadItems.length > 0,
        items: downloadItems
      },
      author: {
        name: userInfo?.name || "Unknown",
        username: userInfo?.username || "",
        userId: userInfo?.userId || "",
        avatar: userInfo?.userAvatar || "",
        bio: userInfo?.userBio || "",
        verified: userInfo?.isVerified || false,
        followers: parseInt(mediaStats.followersCount) || 0,
        followers_formatted: formatCount(mediaStats.followersCount),
        country: userInfo?.accountCountry || ""
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      creator: "WALUKA🇱🇰",
      service: "ytsave.to"
    }
  };
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

    // Format the response to match youtubedl.js format
    const formattedResponse = formatToYoutubedlResponse(videoData.api, videoId, url);
    
    return formattedResponse;

  } catch (error) {
    console.error('YouTubeDL Error:', error.message);
    return {
      status: "error",
      code: 500,
      message: error.message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "WALUKA🇱🇰"
      }
    };
  }
};
