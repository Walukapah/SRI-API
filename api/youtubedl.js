const axios = require('axios');
const ytdl = require('ytdl-core');
const { URL } = require('url');

// Helper functions
const formatDuration = (duration) => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = (parseInt(match[1]) || 0);
  const minutes = (parseInt(match[2]) || 0);
  const seconds = (parseInt(match[3]) || 0);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].filter(x => x !== '00').join(':');
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
    // Handle youtu.be URLs
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    // Handle YouTube URLs with v parameter
    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v');
    }
    throw new Error('Could not extract video ID from URL');
  } catch (e) {
    throw new Error('Invalid YouTube URL');
  }
};

// Main function
module.exports = async (url) => {
  try {
    // Extract video ID
    const videoId = extractVideoId(url);
    
    // Get basic info using ytdl-core
    const info = await ytdl.getInfo(videoId);
    const videoDetails = info.videoDetails;
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    
    // Format download links
    const downloadLinks = {
      video: formats
        .filter(f => f.hasVideo && f.hasAudio)
        .map(f => ({
          url: f.url,
          quality: f.qualityLabel || 'unknown',
          type: f.mimeType.split(';')[0],
          bitrate: f.bitrate,
          size: f.contentLength ? `${Math.round(f.contentLength / (1024 * 1024))}MB` : 'unknown'
        })),
      audio: formats
        .filter(f => !f.hasVideo && f.hasAudio)
        .map(f => ({
          url: f.url,
          quality: f.audioBitrate ? `${f.audioBitrate}kbps` : 'unknown',
          type: f.mimeType.split(';')[0],
          bitrate: f.bitrate
        }))
    };

    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: videoDetails.title,
          description: videoDetails.description,
          original_url: url,
          duration: formatDuration(videoDetails.lengthSeconds),
          duration_seconds: parseInt(videoDetails.lengthSeconds),
          thumbnail: videoDetails.thumbnails.sort((a, b) => b.width - a.width)[0].url,
          views: parseInt(videoDetails.viewCount) || 0,
          views_formatted: formatCount(parseInt(videoDetails.viewCount) || 0),
          keywords: videoDetails.keywords || [],
          is_live: videoDetails.isLiveContent,
          is_private: videoDetails.isPrivate,
          is_unlisted: videoDetails.isUnlisted
        },
        statistics: {
          likes: parseInt(videoDetails.likes) || 0,
          dislikes: parseInt(videoDetails.dislikes) || 0,
          comments: 0, // Would need additional API call
          average_rating: videoDetails.averageRating || 0
        },
        download_links: downloadLinks,
        channel: {
          id: videoDetails.channelId,
          name: videoDetails.author.name,
          url: videoDetails.author.channel_url,
          subscriber_count: formatCount(videoDetails.author.subscriber_count),
          verified: videoDetails.author.verified
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.1",
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
        version: "1.1"
      }
    };
  }
};
