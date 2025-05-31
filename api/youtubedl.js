const axios = require('axios');
const cheerio = require('cheerio');
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

// Main function to get video data from iloveyt.net
const getVideoData = async (videoUrl) => {
  const data = { url: videoUrl };
  
  const headers = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded",
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

  try {
    const response = await axios.post(
      "https://iloveyt.net/proxy.php",
      qs.stringify(data),
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching from iloveyt.net:', error);
    throw new Error('Failed to fetch video data from iloveyt.net');
  }
};

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

    // Get direct download link from POST response
    const directDownloadResponse = await axios.post(
      "https://iloveyt.net/proxy.php",
      qs.stringify({ url }),
      { headers: {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
      }}
    );

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
          duration: videoData.api.mediaItems?.[0]?.mediaDuration || 0,
          duration_formatted: videoData.api.mediaItems?.[0]?.mediaDuration || "00:00"
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
          status: true,
          // Include both the original media items and the direct download link
          items: [
            ...(videoData.api.mediaItems?.map(item => ({
              type: item.type,
              quality: item.mediaQuality,
              url: item.mediaUrl,
              previewUrl: item.mediaPreviewUrl,
              thumbnail: item.mediaThumbnail,
              resolution: item.mediaRes,
              duration: item.mediaDuration,
              extension: item.mediaExtension,
              size: item.mediaFileSize
            })) || []),
            // Add the direct download link from POST response
            {
              type: "Direct Download",
              quality: "HD",
              url: directDownloadResponse.data.fileUrl,
              fileName: directDownloadResponse.data.fileName,
              size: directDownloadResponse.data.fileSize,
              extension: "mp4",
              source: "POST response"
            }
          ]
        },
        author: {
          name: videoData.api.userInfo?.name || "Unknown",
          username: videoData.api.userInfo?.username || "",
          userId: videoData.api.userInfo?.userId || "",
          avatar: videoData.api.userInfo?.userAvatar || "",
          bio: videoData.api.userInfo?.userBio || "",
          verified: videoData.api.userInfo?.isVerified || false,
          followers: videoData.api.mediaStats?.followersCount || 0,
          followers_formatted: formatCount(videoData.api.mediaStats?.followersCount || 0),
          country: videoData.api.userInfo?.accountCountry || ""
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "YourName",
        service: "iLoveYT.net",
        processId: directDownloadResponse.data.processId || null
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
