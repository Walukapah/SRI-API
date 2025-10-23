const axios = require('axios');
const qs = require('qs');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

const getQualityLabel = (quality) => {
  const qualityMap = {
    '18': '360p',
    '136': '720p',
    '137': '1080p',
    '140': '128kbps',
    'mp3128': '128kbps',
    'auto': 'auto'
  };
  return qualityMap[quality] || quality;
};

// API request headers
const headers = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "Origin": "https://ssvid.net",
  "Referer": "https://ssvid.net/en32",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "*/*",
};

// Search for video
async function searchVideo(youtubeUrl) {
  const url = "https://ssvid.net/api/ajax/search?hl=en";
  const data = {
    hl: "en",
    query: youtubeUrl,
    cf_token: "",
    vt: "home",
  };
  const response = await axios.post(url, qs.stringify(data), { headers, timeout: 10000 });
  return response.data;
}

// Convert video
async function convertVideo(vid, k) {
  const url = "https://ssvid.net/api/ajax/convert?hl=en";
  const data = { hl: "en", vid, k };
  const response = await axios.post(url, qs.stringify(data), { headers, timeout: 10000 });
  return response.data;
}

// Main function
module.exports = async (url) => {
  try {
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
      throw new Error('Please provide a valid YouTube URL');
    }

    // Extract video ID
    let videoId = '';
    if (url.includes('youtube.com')) {
      const match = url.match(/[?&]v=([^&]+)/);
      videoId = match ? match[1] : '';
    } else if (url.includes('youtu.be')) {
      videoId = url.split('/').pop().split('?')[0];
    }

    if (!videoId) throw new Error('Could not extract video ID from URL');

    console.log('🔍 Searching for video:', url);
    const searchRes = await searchVideo(url);

    if (!searchRes || !searchRes.vid) {
      throw new Error('Video not found or search failed');
    }

    // Get video metadata from search response
    const videoData = searchRes;
    const vid = videoData.vid || videoId;

    // Get all available formats
    const downloadLinks = {};
    const links = videoData.links || {};

    for (const formatType of Object.keys(links)) {
      downloadLinks[formatType] = {};
      
      for (const qualityKey of Object.keys(links[formatType])) {
        const item = links[formatType][qualityKey];
        const k = item.k;

        console.log(`➡️ Converting ${formatType} ${qualityKey}...`);
        try {
          const convertRes = await convertVideo(vid, k);
          
          if (convertRes.status === 'ok' && convertRes.dlink) {
            downloadLinks[formatType][qualityKey] = {
              info: item,
              convertResponse: convertRes
            };
          } else {
            downloadLinks[formatType][qualityKey] = {
              info: item,
              error: convertRes.mess || 'Conversion failed'
            };
          }
        } catch (error) {
          downloadLinks[formatType][qualityKey] = {
            info: item,
            error: error.message
          };
        }
      }
    }

    // Format response similar to TikTok example
    const response = {
      status: "success",
      code: 200,
      message: "YouTube video data retrieved successfully",
      data: {
        video_info: {
          id: vid,
          title: videoData.title || "No title",
          original_url: url,
          duration: videoData.duration || 0,
          duration_formatted: formatDuration(videoData.duration || 0),
          thumbnail: videoData.image || "",
          views: videoData.views || 0,
          views_formatted: formatCount(videoData.views || 0)
        },
        download_links: downloadLinks
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
