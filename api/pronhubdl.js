const axios = require("axios");

async function pornhubdl(url) {
  try {
    // Fetch page HTML
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    // Extract JSON player data
    const jsonMatch = data.match(/var flashvars_\d+\s*=\s*(\{.*?\});/s);
    if (!jsonMatch) throw new Error("Video data not found");

    const jsonData = JSON.parse(jsonMatch[1]);

    // Basic info
    const result = {
      title: jsonData.video_title || null,
      views: jsonData.view_count || 0,
      duration: jsonData.video_duration || 0,
      durationFormatted: formatDuration(jsonData.video_duration),
      vote: {
        up: jsonData.rating ? jsonData.rating.likes : 0,
        down: jsonData.rating ? jsonData.rating.dislikes : 0,
        total: jsonData.rating ? jsonData.rating.likes + jsonData.rating.dislikes : 0,
        rating: jsonData.rating ? jsonData.rating.rating : 0
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

    // Extract video qualities
    if (jsonData.mediaDefinitions) {
      result.mediaDefinitions = jsonData.mediaDefinitions.map((v) => ({
        defaultQuality: v.defaultQuality || false,
        format: v.format || "mp4",
        quality: v.quality,
        videoUrl: v.videoUrl
      }));
    }

    return result;

  } catch (err) {
    throw new Error("Failed to fetch Pornhub data: " + err.message);
  }
}

// Helper: format seconds → mm:ss
function formatDuration(sec) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

module.exports = pornhubdl;
