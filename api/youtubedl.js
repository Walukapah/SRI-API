const ytdl = require('ytdl-core');
const axios = require('axios');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getResolution = (height) => {
  if (!height) return "unknown";
  return height >= 1080 ? '1080p' : 
         height >= 720 ? '720p' : 
         height >= 480 ? '480p' : '360p';
};

const formatCount = (num) => {
  if (!num) return "0";
  num = parseInt(num);
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

// Main function
module.exports = async (url) => {
  try {
    // Validate URL
    if (!url || !ytdl.validateURL(url)) {
      throw new Error('Please provide a valid YouTube URL');
    }

    // Get video info using ytdl-core
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    const formats = info.formats;

    // Get best video format (mp4)
    const videoFormats = formats
      .filter(f => f.hasVideo && f.container === 'mp4' && f.qualityLabel)
      .sort((a, b) => parseInt(b.height) - parseInt(a.height));
    
    const bestVideo = videoFormats[0];

    // Get best audio format
    const audioFormats = formats
      .filter(f => f.hasAudio && !f.hasVideo)
      .sort((a, b) => parseInt(b.audioBitrate) - parseInt(a.audioBitrate));
    
    const bestAudio = audioFormats[0];

    // Format response
    return {
      status: 200,
      success: true,
      result: {
        video: {
          type: "video",
          quality: bestVideo ? bestVideo.qualityLabel : "unknown",
          title: videoDetails.title,
          thumbnail: videoDetails.thumbnails.sort((a, b) => b.width - a.width)[0].url,
          download_url: bestVideo ? bestVideo.url : "",
          duration: parseInt(videoDetails.lengthSeconds),
          duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds)),
          view_count: formatCount(videoDetails.viewCount),
          author: videoDetails.author.name
        },
        audio: {
          type: "audio",
          quality: bestAudio ? `${Math.floor(bestAudio.audioBitrate / 1000)}kbps` : "unknown",
          title: videoDetails.title,
          thumbnail: videoDetails.thumbnails.sort((a, b) => b.width - a.width)[0].url,
          download_url: bestAudio ? bestAudio.url : "",
          duration: parseInt(videoDetails.lengthSeconds),
          duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds))
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        creator: "WALUKA 🇱🇰"
      }
    };

  } catch (error) {
    console.error('YouTube Downloader Error:', error);
    return {
      status: 500,
      success: false,
      message: error.message,
      result: null,
      meta: {
        timestamp: new Date().toISOString(),
        creator: "WALUKA 🇱🇰"
      }
    };
  }
};
