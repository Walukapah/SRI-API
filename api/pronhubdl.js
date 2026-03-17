const axios = require("axios");

async function pornhubdl(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    // Try multiple patterns
    let jsonData = null;

    // Method 1: flashvars (old)
    let match = data.match(/var flashvars_\d+\s*=\s*(\{.*?\});/s);

    if (match) {
      jsonData = JSON.parse(match[1]);
    } else {
      // Method 2: mediaDefinitions directly
      let mediaMatch = data.match(/"mediaDefinitions":(\[.*?\])/s);
      let titleMatch = data.match(/<title>(.*?)<\/title>/);

      if (!mediaMatch) {
        throw new Error("Media definitions not found");
      }

      const mediaDefinitions = JSON.parse(mediaMatch[1]);

      jsonData = {
        video_title: titleMatch ? titleMatch[1] : "Unknown",
        mediaDefinitions: mediaDefinitions
      };
    }

    // Build response
    const result = {
      title: jsonData.video_title || null,
      views: jsonData.view_count || 0,
      duration: jsonData.video_duration || 0,
      durationFormatted: formatDuration(jsonData.video_duration || 0),
      vote: {
        up: jsonData.rating?.likes || 0,
        down: jsonData.rating?.dislikes || 0,
        total: (jsonData.rating?.likes || 0) + (jsonData.rating?.dislikes || 0),
        rating: jsonData.rating?.rating || 0
      },
      premium: jsonData.is_premium || false,
      thumb: jsonData.image_url || null,
      provider: {
        username: jsonData.video_uploader || "unknown",
        url: jsonData.uploader_profile_url || null
      },
      tags: jsonData.tags || [],
      categories: jsonData.categories || [],
      pornstars: jsonData.pornstars || [],
      mediaDefinitions: []
    };

    // Extract video links
    if (jsonData.mediaDefinitions) {
      result.mediaDefinitions = jsonData.mediaDefinitions.map((v) => ({
        defaultQuality: v.defaultQuality || false,
        format: v.format || "hls",
        quality: v.quality,
        videoUrl: v.videoUrl
      }));
    }

    return result;

  } catch (err) {
    throw new Error("Failed to fetch Pornhub data: " + err.message);
  }
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

module.exports = pornhubdl;
