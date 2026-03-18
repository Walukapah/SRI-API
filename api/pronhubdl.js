const axios = require("axios");

async function pornhubdl(videoUrl) {
  try {
    if (!videoUrl) {
      throw new Error("Missing URL");
    }

    // Payload
    const payload = {
      source: "phfans",
      url: videoUrl
    };

    // Headers (VERY IMPORTANT)
    const headers = {
      "Content-Type": "application/json",
      "Origin": "https://pornhubfans.com",
      "Referer": "https://pornhubfans.com/",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
    };

    const response = await axios.post(
      "https://pornhubfans.com/resolve",
      payload,
      { headers }
    );

    // Check response
    if (!response.data) {
      throw new Error("No data received");
    }

    return response.data;

  } catch (error) {
    throw new Error(
      "Failed to fetch Pornhub data: " + error.message
    );
  }
}

module.exports = pornhubdl;
