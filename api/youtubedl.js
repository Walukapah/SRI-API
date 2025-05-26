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

// Main download function with multiple fallbacks
const getDownloadInfo = async (videoId) => {
  // Try ytdl-core first
  try {
    const info = await ytdl.getInfo(videoId, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    });
    
    const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    return {
      success: true,
      video: videoFormats[0],
      audio: audioFormats[0],
      details: info.videoDetails
    };
  } catch (ytdlError) {
    console.log('ytdl-core failed, trying alternative methods');
  }

  // Fallback 1: Try YouTube's internal API
  try {
    const { data } = await axios.get(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`, {
      data: {
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20210721.00.00',
            hl: 'en',
            gl: 'US'
          }
        },
        videoId: videoId
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Content-Type': 'application/json'
      }
    });

    const streamingData = data.streamingData;
    if (streamingData) {
      return {
        success: true,
        video: streamingData.formats[0],
        audio: streamingData.adaptiveFormats.find(f => f.mimeType.includes('audio/mp4')),
        details: data.videoDetails
      };
    }
  } catch (apiError) {
    console.log('YouTube API fallback failed');
  }

  // Fallback 2: Try scraping
  try {
    const { data } = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const script = $('script:contains("var ytInitialPlayerResponse")').html();
    if (script) {
      const jsonStr = script.split('var ytInitialPlayerResponse = ')[1].split('};')[0] + '}';
      const jsonData = JSON.parse(jsonStr);
      
      if (jsonData.streamingData) {
        return {
          success: true,
          video: jsonData.streamingData.formats[0],
          audio: jsonData.streamingData.adaptiveFormats.find(f => f.mimeType.includes('audio/mp4')),
          details: jsonData.videoDetails
        };
      }
    }
  } catch (scrapeError) {
    console.log('Scraping fallback failed');
  }

  throw new Error('All download methods failed');
};

// Main function
module.exports = async (url) => {
  try {
    // Validate URL and extract ID
    const videoId = ytdl.getURLVideoID(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    // Get download info
    const { video, audio, details } = await getDownloadInfo(videoId);

    // Format response
    return {
      status: 200,
      success: true,
      result: {
        video: {
          type: "video",
          quality: video?.qualityLabel || "unknown",
          title: details.title,
          thumbnail: getBestThumbnail(details.thumbnails),
          download_url: video?.url || "",
          duration: parseInt(details.lengthSeconds),
          duration_formatted: formatDuration(parseInt(details.lengthSeconds)),
          view_count: details.viewCount,
          author: details.author.name
        },
        audio: {
          type: "audio",
          quality: audio?.audioBitrate ? `${Math.floor(audio.audioBitrate/1000)}kbps` : "unknown",
          title: details.title,
          thumbnail: getBestThumbnail(details.thumbnails),
          download_url: audio?.url || "",
          duration: parseInt(details.lengthSeconds),
          duration_formatted: formatDuration(parseInt(details.lengthSeconds))
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
      message: error.message.includes('All download methods') ? 
        'YouTube is currently blocking our requests. Please try again later.' : 
        error.message,
      result: null,
      meta: {
        timestamp: new Date().toISOString(),
        creator: "WALUKA 🇱🇰"
      }
    };
  }
};
