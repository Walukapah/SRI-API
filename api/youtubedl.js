const ytdl = require('ytdl-core');
const { URL } = require('url');

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

const extractVideoId = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v');
    }
    throw new Error('Could not extract video ID');
  } catch (e) {
    throw new Error('Invalid YouTube URL');
  }
};

module.exports = async (url) => {
  try {
    const videoId = extractVideoId(url);
    
    const info = await ytdl.getInfo(videoId, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    });

    const videoDetails = info.videoDetails;
    
    return {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: videoDetails.title,
          description: videoDetails.description,
          original_url: `https://youtu.be/${videoId}`,
          duration: formatDuration(videoDetails.lengthSeconds),
          thumbnail: videoDetails.thumbnails.sort((a, b) => b.width - a.width)[0].url,
          views: formatCount(videoDetails.viewCount),
          is_live: videoDetails.isLiveContent
        },
        download_links: {
          audio: `/api/download/audio?id=${videoId}`,
          video: `/api/download/video?id=${videoId}`
        },
        channel: {
          name: videoDetails.author.name,
          url: videoDetails.author.channel_url
        }
      }
    };
  } catch (error) {
    console.error('YouTube DL Error:', error);
    return {
      status: "error",
      code: error.statusCode || 500,
      message: "Failed to fetch video info. Please try again later.",
      data: null
    };
  }
};
