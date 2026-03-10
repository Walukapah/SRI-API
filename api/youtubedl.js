const axios = require('axios');
const cheerio = require('cheerio');
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

// Generate dynamic cookie (session based)
const generateCookie = () => {
  const randomStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `PHPSESSID=${randomStr}`;
};

const getVideoData = async (videoUrl) => {
  // Use URLSearchParams instead of qs for better compatibility
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
    "Cookie": generateCookie() // Dynamic cookie
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
    
    // Debug: log raw response
    console.log('Raw API Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('API Error Details:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    throw new Error(`Failed to fetch video data: ${error.message}`);
  }
};

const fetchRealDownloadUrl = async (mediaUrl) => {
  try {
    const response = await axios.get(mediaUrl, {
      timeout: 10000,
      maxRedirects: 5
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
    // Extract video ID with better regex
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL format');
    const videoId = videoIdMatch[1];

    console.log(`Processing video ID: ${videoId}`);

    // Get video data from API
    const videoData = await getVideoData(url);
    
    // Check if response is valid
    if (!videoData) {
      throw new Error('Empty response from API');
    }

    // Handle different response structures
    const apiData = videoData.api || videoData;
    
    if (apiData.status !== "OK" && apiData.status !== "success") {
      throw new Error(`API Error: ${apiData.message || 'Unknown error'}`);
    }

    const mediaItems = apiData.mediaItems || [];
    
    if (mediaItems.length === 0) {
      throw new Error('No download links found for this video');
    }

    // Build response
    const mainResponse = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: apiData.title || "No title",
          description: apiData.description || "No description",
          original_url: url,
          previewUrl: apiData.previewUrl || "",
          imagePreviewUrl: apiData.imagePreviewUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          permanentLink: apiData.permanentLink || `https://youtu.be/${videoId}`,
          duration: mediaItems[0]?.mediaDuration || 0,
          duration_formatted: formatDuration(mediaItems[0]?.mediaDuration)
        },
        statistics: {
          views: apiData.mediaStats?.viewsCount || 0,
          views_formatted: formatCount(apiData.mediaStats?.viewsCount),
          likes: apiData.mediaStats?.likesCount || 0,
          likes_formatted: formatCount(apiData.mediaStats?.likesCount),
          comments: apiData.mediaStats?.commentsCount || 0,
          comments_formatted: formatCount(apiData.mediaStats?.commentsCount)
        },
        download_links: {
          status: true,
          items: []
        },
        author: {
          name: apiData.userInfo?.name || "Unknown",
          username: apiData.userInfo?.username || "",
          userId: apiData.userInfo?.userId || "",
          avatar: apiData.userInfo?.userAvatar || "",
          bio: apiData.userInfo?.userBio || "",
          verified: apiData.userInfo?.isVerified || false,
          followers: apiData.mediaStats?.followersCount || 0,
          followers_formatted: formatCount(apiData.mediaStats?.followersCount),
          country: apiData.userInfo?.accountCountry || ""
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.0",
        creator: "WALUKA🇱🇰",
        service: "ytsave.to"
      }
    };

    // Process download links with better error handling
    const updatedItems = await Promise.all(
      mediaItems.map(async (item) => {
        try {
          const fileUrl = await fetchRealDownloadUrl(item.mediaUrl);
          return {
            type: item.type || 'video',
            quality: item.mediaQuality || 'unknown',
            url: fileUrl,
            previewUrl: item.mediaPreviewUrl || '',
            thumbnail: item.mediaThumbnail || '',
            resolution: item.mediaRes || '',
            duration: item.mediaDuration || 0,
            extension: item.mediaExtension || 'mp4',
            size: item.mediaFileSize || 'unknown'
          };
        } catch (err) {
          console.error('Error processing media item:', err.message);
          return null;
        }
      })
    );

    // Filter out null items
    mainResponse.data.download_links.items = updatedItems.filter(item => item !== null);

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
        version: "2.0",
        creator: "WALUKA🇱🇰"
      }
    };
  }
};
