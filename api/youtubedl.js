const axios = require('axios');

// Generate dynamic cookie
const generateCookie = () => {
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `PHPSESSID=${randomStr}`;
};

const getVideoData = async (videoUrl) => {
  const params = new URLSearchParams();
  params.append('url', videoUrl);

  const headers = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://ytsave.to",
    "Referer": "https://ytsave.to/en2/",
    "Sec-Ch-Ua": '"Not A(Brand";v="8", "Chromium";v="132"',
    "Sec-Ch-Ua-Mobile": "?1",
    "Sec-Ch-Ua-Platform": '"Android"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Cookie": generateCookie()
  };

  try {
    const response = await axios.post(
      "https://ytsave.to/proxy.php",
      params.toString(),
      { 
        headers,
        timeout: 30000,
        maxRedirects: 5
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
};

module.exports = async (url) => {
  try {
    // Extract video ID
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL format');
    const videoId = videoIdMatch[1];

    console.log(`Processing video ID: ${videoId}`);

    // Get video data from API
    const videoData = await getVideoData(url);

    if (!videoData || !videoData.api) {
      throw new Error('Invalid API response');
    }

    // Return only the video data (without wrapping)
    return videoData;

  } catch (error) {
    console.error('YouTubeDL Error:', error.message);
    throw error; // Throw error to let index.js handle it
  }
};
