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

async function processMediaUrl(mediaUrl) {
  try {
    const response = await axios.get(mediaUrl, {
      maxRedirects: 0,
      validateStatus: null,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36'
      }
    });

    if (response.status === 302 && response.headers.location) {
      // If we get a redirect, follow it to get the final URL
      const finalResponse = await axios.get(response.headers.location, {
        maxRedirects: 0,
        validateStatus: null
      });
      
      if (finalResponse.status === 200) {
        // Parse the response to extract the fileUrl
        const match = finalResponse.data.match(/"fileUrl":"([^"]+)"/);
        if (match && match[1]) {
          return {
            fileUrl: match[1].replace(/\\/g, ''),
            fileName: finalResponse.data.match(/"fileName":"([^"]+)"/)?.[1] || "video.mp4",
            fileSize: finalResponse.data.match(/"fileSize":"([^"]+)"/)?.[1] || "N/A"
          };
        }
      }
    }

    // Fallback to original URL if processing fails
    return {
      fileUrl: mediaUrl,
      fileName: "video.mp4",
      fileSize: "N/A"
    };
  } catch (error) {
    console.error('Error processing media URL:', error.message);
    return {
      fileUrl: mediaUrl,
      fileName: "video.mp4",
      fileSize: "N/A"
    };
  }
}

async function getVideoData(videoUrl) {
  const data = { url: videoUrl };

  try {
    const response = await axios.post(proxyUrl, qs.stringify(data), { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching from iloveyt.net:', error);
    throw new Error('Failed to fetch video data from iloveyt.net');
  }
}

// Main function
module.exports = async (url) => {
  try {
    // Extract video ID
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL');
    const videoId = videoIdMatch[1];

    // Get initial video data
    const videoData = await getVideoData(url);
    
    if (!videoData || !videoData.api || videoData.api.status !== "OK") {
      throw new Error('Failed to process YouTube video');
    }

    // Process all media items to get final download URLs
    const processedItems = [];
    for (const item of videoData.api.mediaItems || []) {
      const processed = await processMediaUrl(item.mediaUrl);
      processedItems.push({
        ...item,
        processedUrl: processed.fileUrl,
        fileName: processed.fileName,
        fileSize: processed.fileSize
      });
    }

    // Format final response
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
          thumbnail: videoData.api.imagePreviewUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          duration: videoData.api.mediaItems?.[0]?.mediaDuration || "00:00"
        },
        statistics: {
          views: videoData.api.mediaStats?.viewsCount || 0,
          views_formatted: formatCount(videoData.api.mediaStats?.viewsCount || 0),
          likes: videoData.api.mediaStats?.likesCount || 0,
          likes_formatted: formatCount(videoData.api.mediaStats?.likesCount || 0)
        },
        download_links: {
          videos: processedItems
            .filter(item => item.type === "Video")
            .map(item => ({
              quality: item.mediaQuality,
              resolution: item.mediaRes,
              url: item.processedUrl,
              fileName: item.fileName,
              size: item.fileSize,
              duration: item.mediaDuration,
              extension: item.mediaExtension
            })),
          audios: processedItems
            .filter(item => item.type === "Audio")
            .map(item => ({
              quality: item.mediaQuality,
              url: item.processedUrl,
              fileName: item.fileName,
              size: item.fileSize,
              duration: item.mediaDuration,
              extension: item.mediaExtension
            }))
        },
        author: {
          name: videoData.api.userInfo?.name || "Unknown",
          username: videoData.api.userInfo?.username || "",
          avatar: videoData.api.userInfo?.userAvatar || ""
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
