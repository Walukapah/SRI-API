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

const getVideoData = async (videoUrl) => {
  const data = { url: videoUrl };
  
  // Exact headers from browser scrape
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
    "X-Requested-With": "XMLHttpRequest"
  };

  try {
    const response = await axios.post(
      "https://ytsave.to/proxy.php",
      qs.stringify(data),
      { 
        headers,
        decompress: true,
        timeout: 30000
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching video data:', error.message);
    throw new Error('Failed to fetch video data from ytsave.to');
  }
};

const fetchRealDownloadUrl = async (mediaUrl) => {
  try {
    const response = await axios.get(mediaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://ytsave.to/"
      },
      maxRedirects: 5,
      timeout: 10000
    });
    
    if (response.data && response.data.fileUrl) {
      return response.data.fileUrl;
    }
    return mediaUrl;
  } catch (err) {
    console.error('Error fetching real media URL:', err.message);
    return mediaUrl;
  }
};

module.exports = async (url) => {
  try {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL');
    const videoId = videoIdMatch[1];

    // Get raw response from ytsave.to
    const apiResponse = await getVideoData(url);
    
    // Check if response has the expected structure
    if (!apiResponse || !apiResponse.api) {
      throw new Error('Invalid response from ytsave.to');
    }

    const api = apiResponse.api;
    
    if (api.status !== "OK") {
      throw new Error(api.message || 'Failed to process YouTube video');
    }

    const mediaItems = api.mediaItems || [];
    const userInfo = api.userInfo || {};
    const mediaStats = api.mediaStats || {};

    // Build response matching the exact API structure
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: api.title || "No title",
          description: api.description || "No description",
          original_url: url,
          previewUrl: api.previewUrl || "",
          imagePreviewUrl: api.imagePreviewUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          permanentLink: api.permanentLink || `https://youtu.be/${videoId}`,
          duration: mediaItems[0]?.mediaDuration || 0,
          duration_formatted: formatDuration(mediaItems[0]?.mediaDuration)
        },
        statistics: {
          views: mediaStats.viewsCount || 0,
          views_formatted: formatCount(mediaStats.viewsCount),
          likes: mediaStats.likesCount || 0,
          likes_formatted: formatCount(mediaStats.likesCount),
          comments: mediaStats.commentsCount || 0,
          comments_formatted: formatCount(mediaStats.commentsCount)
        },
        download_links: {
          status: true,
          count: mediaItems.length,
          items: []
        },
        author: {
          name: userInfo.name || "Unknown",
          username: userInfo.username || "",
          userId: userInfo.userId || "",
          avatar: userInfo.userAvatar || "",
          bio: userInfo.userBio || "",
          verified: userInfo.isVerified || false,
          followers: mediaStats.followersCount || 0,
          followers_formatted: formatCount(mediaStats.followersCount),
          country: userInfo.accountCountry || ""
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "WALUKA🇱🇰",
        service: "ytsave.to"
      }
    };

    // Process download links with real URLs
    if (mediaItems.length > 0) {
      const downloadItems = await Promise.all(
        mediaItems.map(async (item) => {
          const fileUrl = await fetchRealDownloadUrl(item.mediaUrl);
          return {
            type: item.type || "video",
            quality: item.mediaQuality || "unknown",
            resolution: item.mediaRes || "",
            extension: item.mediaExtension || "mp4",
            size: item.mediaFileSize || "Unknown",
            duration: item.mediaDuration || 0,
            url: fileUrl,
            previewUrl: item.mediaPreviewUrl || "",
            thumbnail: item.mediaThumbnail || ""
          };
        })
      );
      
      response.data.download_links.items = downloadItems;
    }

    return response;

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
