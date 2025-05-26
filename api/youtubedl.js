const axios = require('axios');
const cheerio = require('cheerio');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getResolution = (height) => {
  if (!height) return "";
  return height >= 1080 ? '1080p' : 
         height >= 720 ? '720p' : 
         height >= 480 ? '480p' : '360p';
};

const formatCount = (num) => {
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

// Main function
module.exports = async (url) => {
  try {
    // Validate URL
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
      throw new Error('Please provide a valid YouTube URL');
    }

    // Extract video ID
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else {
      throw new Error('Could not extract video ID from URL');
    }

    // Fetch video info from YouTube
    const { data: html } = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 5000
    });

    // Parse metadata
    const $ = cheerio.load(html);
    const script = $('script:contains("var ytInitialPlayerResponse")').html();
    if (!script) throw new Error('YouTube metadata not found');
    
    // Extract JSON data
    const jsonStr = script.split('var ytInitialPlayerResponse = ')[1].split('};')[0] + '}';
    const jsonData = JSON.parse(jsonStr);
    
    const videoDetails = jsonData.videoDetails;
    const streamingData = jsonData.streamingData;
    
    if (!videoDetails || !streamingData) {
      throw new Error('Video data extraction failed');
    }

    // Find best quality video and audio
    const formats = streamingData.formats || [];
    const adaptiveFormats = streamingData.adaptiveFormats || [];
    
    // Get best video (mp4)
    const videoFormats = formats.concat(adaptiveFormats)
      .filter(f => f.mimeType && f.mimeType.includes('video/mp4'));
    
    const bestVideo = videoFormats.reduce((best, current) => {
      return (!best || (current.height > best.height)) ? current : best;
    }, null);
    
    // Get best audio
    const audioFormats = adaptiveFormats
      .filter(f => f.mimeType && f.mimeType.includes('audio/mp4'));
    
    const bestAudio = audioFormats.reduce((best, current) => {
      return (!best || (current.audioSampleRate > best.audioSampleRate)) ? current : best;
    }, null);

    // Format response
    const response = {
      status: 200,
      success: true,
      result: {
        video: {
          type: "video",
          quality: bestVideo ? getResolution(bestVideo.height) : "unknown",
          title: videoDetails.title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          download_url: bestVideo ? bestVideo.url : "",
          duration: parseInt(videoDetails.lengthSeconds),
          duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds)),
          view_count: formatCount(parseInt(videoDetails.viewCount)),
          author: videoDetails.author
        },
        audio: {
          type: "audio",
          quality: bestAudio ? `${Math.floor(bestAudio.audioSampleRate / 1000)}kbps` : "unknown",
          title: videoDetails.title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
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

    return response;

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
