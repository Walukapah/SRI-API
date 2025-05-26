const axios = require('axios');
const cheerio = require('cheerio');

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

    // First try: Use YouTube's get_video_info endpoint
    try {
      const { data } = await axios.get(`https://www.youtube.com/get_video_info?video_id=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000
      });

      const params = new URLSearchParams(data);
      const playerResponse = JSON.parse(params.get('player_response') || '{}');
      
      if (playerResponse && playerResponse.videoDetails) {
        const videoDetails = playerResponse.videoDetails;
        const streamingData = playerResponse.streamingData || {};
        
        // Get best video and audio formats
        const formats = streamingData.formats || [];
        const adaptiveFormats = streamingData.adaptiveFormats || [];
        
        const allFormats = [...formats, ...adaptiveFormats];
        const bestVideo = allFormats
          .filter(f => f.mimeType && f.mimeType.includes('video/mp4'))
          .sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        
        const bestAudio = allFormats
          .filter(f => f.mimeType && f.mimeType.includes('audio/mp4'))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        return {
          status: 200,
          success: true,
          result: {
            video: {
              type: "video",
              quality: bestVideo ? getResolution(bestVideo.height) : "unknown",
              title: videoDetails.title,
              thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              download_url: bestVideo ? bestVideo.url : "",
              duration: parseInt(videoDetails.lengthSeconds),
              duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds)),
              view_count: formatCount(videoDetails.viewCount),
              author: videoDetails.author
            },
            audio: {
              type: "audio",
              quality: bestAudio ? `${Math.floor((bestAudio.bitrate || 128000) / 1000)}kbps` : "unknown",
              title: videoDetails.title,
              thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
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
      }
    } catch (apiError) {
      console.log('get_video_info failed, trying alternative method');
    }

    // Fallback method: Use external service
    try {
      const { data } = await axios.get(`https://yt1s.io/api/ajaxSearch`, {
        params: {
          q: `https://www.youtube.com/watch?v=${videoId}`
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      if (data && data.links && data.vid) {
        const videoTitle = data.title || `YouTube Video ${videoId}`;
        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // Get best video and audio links (simplified example)
        const videoLinks = data.links.mp4;
        const audioLinks = data.links.mp3;
        
        const bestVideo = Object.entries(videoLinks)
          .sort(([qualityA], [qualityB]) => parseInt(qualityB) - parseInt(qualityA))[0];
        
        const bestAudio = Object.entries(audioLinks)
          .sort(([qualityA], [qualityB]) => parseInt(qualityB) - parseInt(qualityA))[0];

        return {
          status: 200,
          success: true,
          result: {
            video: {
              type: "video",
              quality: bestVideo ? `${bestVideo[0]}p` : "unknown",
              title: videoTitle,
              thumbnail: thumbnail,
              download_url: bestVideo ? bestVideo[1].d : "",
              duration: 0,
              duration_formatted: "00:00",
              view_count: "unknown",
              author: "unknown"
            },
            audio: {
              type: "audio",
              quality: bestAudio ? `${bestAudio[0]}kbps` : "unknown",
              title: videoTitle,
              thumbnail: thumbnail,
              download_url: bestAudio ? bestAudio[1].d : "",
              duration: 0,
              duration_formatted: "00:00"
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            creator: "WALUKA 🇱🇰"
          }
        };
      }
    } catch (fallbackError) {
      console.log('Fallback method failed:', fallbackError);
    }

    throw new Error('All methods failed to extract video data');

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
