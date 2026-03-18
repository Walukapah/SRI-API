const axios = require("axios");

// 📦 Bytes → MB
function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// ⏱ Seconds → hh:mm:ss
function formatDuration(seconds) {
  if (!seconds) return "00:00";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hh = h > 0 ? String(h).padStart(2, "0") + ":" : "";
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  return hh + mm + ":" + ss;
}

async function pornhubdl(videoUrl) {
  try {
    if (!videoUrl) throw new Error("Missing URL");

    const payload = {
      source: "phfans",
      url: videoUrl
    };

    const headers = {
      "Content-Type": "application/json",
      "Origin": "https://pornhubfans.com",
      "Referer": "https://pornhubfans.com/",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };

    const { data } = await axios.post(
      "https://pornhubfans.com/resolve",
      payload,
      { headers }
    );

    if (!data) throw new Error("No data received");

    const endpoint = data.endpoint;

    const videos = (data.video || []).map(v => ({
      quality: v.quality + "p",
      file_size: v.file_size,
      file_size_format: formatBytes(v.file_size),
      download: `${endpoint}/video?token=${v.token}`
    }));

    return {
      title: data.title,
      duration: data.duration,
      duration_formatted: formatDuration(data.duration),
      thumbnail: `${endpoint}/image?token=${data.thumbnail}`,
      video: videos
    };

  } catch (error) {
    throw new Error("Failed to fetch Pornhub data: " + error.message);
  }
}

module.exports = pornhubdl;
