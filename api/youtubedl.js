const ytdl = require('ytdl-core');
const axios = require('axios');
const cheerio = require('cheerio');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getBestThumbnail = (thumbnails) => {
  return thumbnails.sort((a, b) => b.width - a.width)[0]?.url || '';
};

const getBestAudio = (formats) => {
  return formats
    .filter(f => f.mimeType && f.mimeType.includes('audio/mp4'))
    .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
};

// Main function
module.exports = async (url) => {
  try {
    // Validate URL
    if (!url || !ytdl.validateURL(url)) {
      throw new Error('Please provide a valid YouTube URL');
    }

    // Get video info with multiple fallbacks
    let info;
    try {
      // First try with ytdl-core
      info = await ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      });
    } catch (ytdlError) {
      console.log('ytdl-core failed, trying alternative method');
      
      // Fallback to scraping
      const videoId = ytdl.getURLVideoID(url);
      const { data } = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(data);
      const script = $('script:contains("var ytInitialPlayerResponse")').html();
      if (!script) throw new Error('Could not extract video data');
      
      const jsonStr = script.split('var ytInitialPlayerResponse = ')[1].split('};')[0] + '}';
      const jsonData = JSON.parse(jsonStr);
      info = {
        videoDetails: jsonData.videoDetails,
        formats: [
          ...(jsonData.streamingData?.formats || []),
          ...(jsonData.streamingData?.adaptiveFormats || [])
        ]
      };
    }

    const videoDetails = info.videoDetails;
    const formats = info.formats;

    // Get best video and audio formats
    const bestVideo = ytdl.chooseFormat(formats, { quality: 'highestvideo' });
    const bestAudio = getBestAudio(formats);

    // Format response
    return {
      creator: "WALUKA 🇱🇰",
      status: 200,
      success: true,
      result: {
        video: {
          type: "video",
          quality: bestVideo?.qualityLabel || "unknown",
          title: videoDetails.title,
          thumbnail: getBestThumbnail(videoDetails.thumbnails),
          download_url: bestVideo?.url || "",
          duration: parseInt(videoDetails.lengthSeconds),
          duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds)),
          view_count: videoDetails.viewCount,
          author: videoDetails.author?.name || "Unknown"
        },
        audio: {
          type: "audio",
          quality: bestAudio?.audioBitrate ? `${Math.floor(bestAudio.audioBitrate/1000)}kbps` : "unknown",
          title: videoDetails.title,
          thumbnail: getBestThumbnail(videoDetails.thumbnails),
          download_url: bestAudio?.url || "",
          duration: parseInt(videoDetails.lengthSeconds),
          duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds))
        }
      }
    };

  } catch (error) {
    console.error('YouTube Downloader Error:', error);
    return {
      creator: "WALUKA 🇱🇰",
      status: 500,
      success: false,
      message: error.message.includes('validateURL') ? 
        'Invalid YouTube URL' : 
        'Failed to fetch video information',
      result: null
    };
  }
};
