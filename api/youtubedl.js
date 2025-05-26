const axios = require('axios');
const cheerio = require('cheerio');

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

module.exports = async (url) => {
  try {
    // Validate URL
    if (!url.match(/(youtube\.com|youtu\.be)/)) {
      throw new Error('Invalid YouTube URL');
    }

    // Extract video ID
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)[1];

    // Fetch video page
    const { data } = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Parse metadata
    const $ = cheerio.load(data);
    const script = $('script:contains("ytInitialPlayerResponse")').html();
    const jsonStr = script.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/)[1];
    const jsonData = JSON.parse(jsonStr);

    // Extract video data
    const videoDetails = jsonData.videoDetails;
    const streamingData = jsonData.streamingData;

    // Get download URLs
    const videoFormat = streamingData.formats
      .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
      
    const audioFormat = streamingData.adaptiveFormats
      .filter(f => f.mimeType.includes('audio'))
      .sort((a, b) => parseInt(b.bitrate) - parseInt(a.bitrate))[0];

    return {
      creator: "WALUKA 🇱🇰",
      status: 200,
      success: true,
      result: {
        video: {
          type: "video",
          quality: videoFormat.qualityLabel || `${videoFormat.height}p`,
          title: videoDetails.title,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          download_url: videoFormat.url
        },
        audio: {
          type: "audio",
          quality: "128kbps",
          title: videoDetails.title,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          download_url: audioFormat.url
        }
      }
    };

  } catch (error) {
    return {
      creator: "WALUKA 🇱🇰",
      status: 500,
      success: false,
      message: error.message
    };
  }
};
