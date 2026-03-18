const axios = require("axios");

async function instagramdl(videoUrl) {
  try {
    if (!videoUrl) {
      throw new Error("Missing URL");
    }

    const payload = {
      url: videoUrl,
      type: "video" // reel / video support
    };

    const headers = {
      "Content-Type": "application/json",
      "Origin": "https://vdraw.ai",
      "Referer": "https://vdraw.ai/tools/instagram-video-downloader",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };

    const response = await axios.post(
      "https://vdraw.ai/api/v1/instagram/ins-info",
      payload,
      { headers }
    );

    if (!response.data) {
      throw new Error("No data received");
    }

    // 🔥 full response එකම return කරනවා
    return response.data;

  } catch (error) {
    throw new Error(
      "Failed to fetch Instagram data: " + error.message
    );
  }
}

module.exports = instagramdl;
