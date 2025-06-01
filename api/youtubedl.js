const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const formatDuration = (seconds) => {
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
  const headers = {
    "Accept": "*/*",
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://iloveyt.net/en2",
    "User-Agent": "Mozilla/5.0"
  };

  try {
    const response = await axios.post(
      "https://iloveyt.net/proxy.php",
      qs.stringify(data),
      { headers }
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch video data from iloveyt.net');
  }
};

const fetchRealDownloadUrl = async (mediaUrl) => {
  try {
    const response = await axios.get(mediaUrl);
    if (response.data && response.data.fileUrl) {
      return response.data.fileUrl;
    }
    return mediaUrl; // fallback
  } catch (err) {
    console.error('Error fetching real media URL:', err.message);
    return mediaUrl; // fallback
  }
};

module.exports = async (url) => {
  try {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL');
    const videoId = videoIdMatch[1];

    // 1. Get raw response
    const videoData = await getVideoData(url);
    if (!videoData || !videoData.api || videoData.api.status !== "OK") {
      throw new Error('Failed to process YouTube video');
    }

    const mediaItems = videoData.api.mediaItems || [];

    // 2. Construct initial main response
    const mainResponse = {
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
          duration: mediaItems[0]?.mediaDuration || 0,
          duration_formatted: mediaItems[0]?.mediaDuration || "00:00"
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
          items: [] // filled next
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
        service: "iLoveYT.net"
      }
    };

    // 3. Fetch fileUrl for each mediaUrl and update
    const updatedItems = await Promise.all(mediaItems.map(async (item) => {
      const fileUrl = await fetchRealDownloadUrl(item.mediaUrl);
      return {
        type: item.type,
        quality: item.mediaQuality,
        url: fileUrl, // ← updated here
        previewUrl: item.mediaPreviewUrl,
        thumbnail: item.mediaThumbnail,
        resolution: item.mediaRes,
        duration: item.mediaDuration,
        extension: item.mediaExtension,
        size: item.mediaFileSize
      };
    }));

    // 4. Set into main response
    mainResponse.data.download_links.items = updatedItems;

    return mainResponse;

  } catch (error) {
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
