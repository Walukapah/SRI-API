const axios = require("axios");
const qs = require("qs");

// Helper functions
const formatDuration = (seconds) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (!num) return "0";
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatSize = (size) => {
  if (!size) return "Unknown";
  if (size >= 1073741824) return (size / 1073741824).toFixed(2) + ' GB';
  if (size >= 1048576) return (size / 1048576).toFixed(2) + ' MB';
  if (size >= 1024) return (size / 1024).toFixed(2) + ' KB';
  return size + ' B';
};

// Headers configuration
const headers = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "Accept": "*/*",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  "Origin": "https://ssvid.app",
  "Referer": "https://ssvid.app/en82",
};

// Search function
async function ytSearch(url) {
  const data = qs.stringify({
    hl: "en",
    query: url,
    cf_token: "",
    vt: "home",
  });

  const response = await axios.post(
    "https://ssvid.app/api/ajax/search?hl=en",
    data,
    { headers, timeout: 10000 }
  );

  return response.data;
}

// Convert function
async function ytConvert(vid, key) {
  const data = qs.stringify({
    hl: "en",
    vid: vid,
    k: key,
  });

  const response = await axios.post(
    "https://ssvid.app/api/ajax/convert?hl=en",
    data,
    { headers, timeout: 15000 }
  );

  return response.data;
}

// Main function
module.exports = async (url) => {
  try {
    // Validate URL
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      throw new Error('Please provide a valid YouTube URL');
    }

    console.log("🔍 Searching for video...");
    const search = await ytSearch(url);

    if (search.status !== "ok") {
      throw new Error('Failed to search for video');
    }

    const vid = search.vid;
    console.log(`🎥 Video ID: ${vid}`);

    // Prepare results structure
    const results = {
      title: search.title || "No title",
      duration: search.t || 0,
      duration_formatted: formatDuration(search.t),
      author: search.a || "Unknown author",
      thumbnail: search.thumb || "",
      views: search.views || 0,
      views_formatted: formatCount(search.views),
      mp4: {},
      mp3: {}
    };

    // Convert ALL MP4 qualities
    if (search.links?.mp4) {
      for (const quality in search.links.mp4) {
        const item = search.links.mp4[quality];
        console.log(`⚙ Converting MP4 ${quality}p...`);

        const converted = await ytConvert(vid, item.k);

        if (converted.dlink) {
          results.mp4[quality] = {
            quality: `${quality}p`,
            size: item.size || "Unknown",
            size_formatted: formatSize(item.size),
            url: converted.dlink,
            extension: "mp4"
          };
        }
      }
    }

    // Convert ALL MP3 qualities
    if (search.links?.mp3) {
      for (const quality in search.links.mp3) {
        const item = search.links.mp3[quality];
        console.log(`⚙ Converting MP3 ${quality}kbps...`);

        const converted = await ytConvert(vid, item.k);

        if (converted.dlink) {
          results.mp3[quality] = {
            quality: `${quality}kbps`,
            size: item.size || "Unknown",
            size_formatted: formatSize(item.size),
            url: converted.dlink,
            extension: "mp3"
          };
        }
      }
    }

    // Format response similar to TikTok API structure
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: vid,
          title: results.title,
          original_url: url,
          duration: results.duration,
          duration_formatted: results.duration_formatted,
          thumbnail: results.thumbnail,
          author: results.author,
          views: results.views,
          views_formatted: results.views_formatted
        },
        download_links: {
          video: results.mp4,
          audio: results.mp3
        },
        formats_available: {
          video_count: Object.keys(results.mp4).length,
          audio_count: Object.keys(results.mp3).length,
          qualities: {
            video: Object.keys(results.mp4),
            audio: Object.keys(results.mp3)
          }
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "YourName"
      }
    };

    console.log("✅ YouTube data retrieved successfully");
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

// For testing (optional)
// (async () => {
//   try {
//     const result = await module.exports("https://youtu.be/cUwnLvgdo5g");
//     console.dir(result, { depth: null });
//   } catch (err) {
//     console.error("Test Error:", err.message);
//   }
// })();
