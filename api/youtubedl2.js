const axios = require('axios');
const qs = require('qs');

// Helper functions
const formatDuration = (seconds) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getResolution = (quality) => {
  if (!quality) return "";
  if (quality.includes('144')) return '144p';
  if (quality.includes('240')) return '240p';
  if (quality.includes('360')) return '360p';
  if (quality.includes('480')) return '480p';
  if (quality.includes('720')) return '720p';
  if (quality.includes('1080')) return '1080p';
  if (quality.includes('1440')) return '1440p';
  if (quality.includes('2160')) return '2160p';
  return quality;
};

const formatCount = (num) => {
  if (!num) return "0";
  if (num >= 1000000000) return (num/1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

// Headers for SSVID API requests
const headers = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "Origin": "https://ssvid.net",
  "Referer": "https://ssvid.net/en11",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "*/*",
};

// Search video on SSVID
async function searchVideo(youtubeUrl) {
  const url = "https://ssvid.net/api/ajax/search?hl=en";
  const data = {
    hl: "en",
    query: youtubeUrl,
    cf_token: "",
    vt: "home",
  };
  const res = await axios.post(url, qs.stringify(data), { headers });
  return res.data;
}

// Convert video on SSVID
async function convertVideo(vid, k) {
  const url = "https://ssvid.net/api/ajax/convert?hl=en";
  const data = { hl: "en", vid, k };
  const res = await axios.post(url, qs.stringify(data), { headers });
  return res.data;
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : false;
}

// Main function
module.exports = async (url) => {
  try {
    // Validate URL
    if (!url || !url.includes('youtu')) {
      throw new Error('Please provide a valid YouTube URL');
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log("🔍 Searching:", url);
    const searchRes = await searchVideo(url);

    // Check if search was successful
    if (!searchRes.status || searchRes.status !== "ok") {
      throw new Error(searchRes.message || 'Failed to search video');
    }

    // Get video ID from search response or use extracted one
    const vid = searchRes.vid || videoId;

    // Get video metadata
    const title = searchRes.title || "No title";
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const duration = searchRes.duration || 0;

    // Process download links
    const downloadLinks = {};
    const links = searchRes.links || {};

    // Process each format type
    for (const formatType of Object.keys(links)) {
      downloadLinks[formatType] = {};
      
      for (const qualityKey of Object.keys(links[formatType])) {
        const item = links[formatType][qualityKey];
        const k = item.k;

        console.log(`➡️ Converting ${formatType} ${qualityKey}...`);
        try {
          const conv = await convertVideo(vid, k);
          
          if (conv.status === "ok" && conv.url) {
            downloadLinks[formatType][qualityKey] = {
              url: conv.url,
              quality: getResolution(qualityKey),
              size: item.size || "Unknown",
              extension: formatType,
              server: "ssvid.net"
            };
          } else {
            downloadLinks[formatType][qualityKey] = {
              error: conv.message || "Conversion failed",
              info: item
            };
          }
        } catch (err) {
          downloadLinks[formatType][qualityKey] = {
            error: err.message,
            info: item
          };
        }
      }
    }

    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: title,
          original_url: url,
          thumbnail: thumbnail,
          duration: duration,
          duration_formatted: formatDuration(duration),
          source: "YouTube"
        },
        download_links: downloadLinks,
        meta: {
          timestamp: new Date().toISOString(),
          version: "1.0",
          creator: "YourName"
        }
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
