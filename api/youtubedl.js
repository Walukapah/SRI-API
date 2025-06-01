const axios = require('axios');
const qs = require('qs');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (!num) return "0";
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

const proxyUrl = "https://iloveyt.net/proxy.php";

const headers = {
  "Accept": "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/x-www-form-urlencoded",
  "Cookie": "PHPSESSID=mu9fjav2lmuc7ln7drffptvhgd",
  "Origin": "https://iloveyt.net",
  "Referer": "https://iloveyt.net/en2",
  "Sec-Ch-Ua": '"Not A(Brand";v="8", "Chromium";v="132"',
  "Sec-Ch-Ua-Mobile": "?1",
  "Sec-Ch-Ua-Platform": '"Android"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
  "X-Requested-With": "XMLHttpRequest"
};

async function getDirectDownloadUrl(mediaUrl) {
  try {
    const response = await axios.get(mediaUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    if (response.status === 302 || response.status === 301) {
      return response.headers.location;
    }
    return mediaUrl; // Return original if no redirect
  } catch (err) {
    console.log(`Error fetching direct URL: ${err.message}`);
    return null;
  }
}

async function getVideoData(videoUrl) {
  const data = { url: videoUrl };

  try {
    const response = await axios.post(proxyUrl, qs.stringify(data), { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching from iloveyt.net:', error.message);
    throw new Error('Failed to fetch video data from iloveyt.net');
  }
}

// Main function
module.exports = async (url) => {
  try {
    // Extract video ID from various YouTube URL formats
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL');
    const videoId = videoIdMatch[1];

    // Get video data from iloveyt.net
    const videoData = await getVideoData(url);
    
    if (!videoData || !videoData.api || videoData.api.status !== "OK") {
      throw new Error('Failed to process YouTube video');
    }

    // Process media items to get direct URLs
    const processedItems = [];
    for (const item of videoData.api.mediaItems) {
      const directUrl = await getDirectDownloadUrl(item.mediaUrl);
      processedItems.push({
        ...item,
        directUrl: directUrl || item.mediaUrl
      });
    }

    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: videoData.api.title || "No title",
          description: videoData.api.description || "No description",
          original_url: url,
          previewUrl: videoData.api.previewUrl || "",
          imagePreviewUrl: videoData.api.imagePreviewUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          permanentLink: videoData.api.permanentLink || `https://youtu.be/${videoId}`,
          duration: videoData.api.mediaItems?.[0]?.mediaDuration || "00:00",
          created_at: new Date().toISOString()
        },
        statistics: {
          views: videoData.api.mediaStats?.viewsCount || 0,
          views_formatted: formatCount(videoData.api.mediaStats?.viewsCount || 0),
          likes: videoData.api.mediaStats?.likesCount || 0,
          likes_formatted: formatCount(videoData.api.mediaStats?.likesCount || 0),
          comments: videoData.api.mediaStats?.commentsCount || 0,
          comments_formatted: formatCount(videoData.api.mediaStats?.commentsCount || 0)
        },
        download_links: {
          no_watermark: {
            items: processedItems.filter(item => item.type === "Video").map(item => ({
              quality: item.mediaQuality,
              resolution: item.mediaRes,
              url: item.directUrl,
              previewUrl: item.mediaPreviewUrl,
              thumbnail: item.mediaThumbnail,
              duration: item.mediaDuration,
              extension: item.mediaExtension,
              size: item.mediaFileSize
            })),
            server: "iloveyt.net"
          },
          audio_only: {
            items: processedItems.filter(item => item.type === "Audio").map(item => ({
              quality: item.mediaQuality,
              url: item.directUrl,
              duration: item.mediaDuration,
              extension: item.mediaExtension,
              size: item.mediaFileSize
            })),
            server: "iloveyt.net"
          }
        },
        author: {
          id: videoData.api.userInfo?.userId || "",
          username: videoData.api.userInfo?.username || "",
          nickname: videoData.api.userInfo?.name || "Unknown",
          bio: videoData.api.userInfo?.userBio || "",
          avatar: videoData.api.userInfo?.userAvatar || "",
          followers: videoData.api.mediaStats?.followersCount || 0,
          followers_formatted: formatCount(videoData.api.mediaStats?.followersCount || 0),
          verified: videoData.api.userInfo?.isVerified || false,
          country: videoData.api.userInfo?.accountCountry || ""
        },
        music: {
          title: videoData.api.title || "No title",
          duration: videoData.api.mediaItems?.[0]?.mediaDuration || "00:00"
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
