const axios = require("axios");

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
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

    // 🔥 Format video list
    const videos = (data.video || []).map(v => ({
      quality: v.quality + "p",
      file_size: v.file_size,
      file_size_format: formatBytes(v.file_size),
      download: `${endpoint}/video?token=${v.token}`
    }));

    // 🔥 Final clean response
    return {
      title: data.title,
      duration: data.duration,
      thumbnail: `${endpoint}/image?token=${data.thumbnail}`,
      video: videos
    };

  } catch (error) {
    throw new Error("Failed to fetch Pornhub data: " + error.message);
  }
}

module.exports = pornhubdl;
