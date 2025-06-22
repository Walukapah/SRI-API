const axios = require('axios');

const getPornhubVideo = async (videoUrl) => {
  const koyebUrl = `https://wild-charmine-walukapahan-4a5319fa.koyeb.app/api/video?url=${encodeURIComponent(videoUrl)}`;
  const xxvidUrl = 'https://xxx.xxvid.download/xxx-download/video-info-v3';

  const xxvidPayload = {
    app_id: 'pornhub_downloader',
    platform: 'Pornhub',
    url: videoUrl
  };

  const headers = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://pornhubdownloader.io',
    'Referer': 'https://pornhubdownloader.io/',
    'Sec-Ch-Ua': '"Not A(Brand";v="8", "Chromium";v="132"',
    'Sec-Ch-Ua-Mobile': '?1',
    'Sec-Ch-Ua-Platform': '"Android"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36'
  };

  try {
    // Get data from both APIs
    const koyebRes = await axios.get(koyebUrl);
    const koyebData = koyebRes.data;

    const xxvidRes = await axios.post(xxvidUrl, xxvidPayload, { headers });
    const xxvidData = xxvidRes.data;

    if (!koyebData || koyebRes.status !== 200) throw new Error("Koyeb API error");
    if (xxvidData.code !== 200 || !xxvidData.data) throw new Error("XXVID API error");

    // Combine all into Koyeb structure + add xxvid videos
    return {
      ...koyebData,
      videos: [
        ...(koyebData.videos || []),
        ...xxvidData.data.videos.map(v => ({
          quality: v.quality,
          url: v.url,
          source: "xxvid"
        }))
      ]
    };

  } catch (err) {
    throw new Error(err.response?.data?.message || err.message);
  }
};

module.exports = getPornhubVideo;
