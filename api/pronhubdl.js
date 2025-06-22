const axios = require('axios');

const getPornhubVideo = async (videoUrl) => {
  const xxvidUrl = 'https://xxx.xxvid.download/xxx-download/video-info-v3';
  const koyebUrl = `https://wild-charmine-walukapahan-4a5319fa.koyeb.app/api/video?url=${encodeURIComponent(videoUrl)}`;

  const data = {
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
    // 📥 First API (xxvid)
    const xxvidRes = await axios.post(xxvidUrl, data, { headers });
    const xxvidData = xxvidRes.data;

    if (xxvidData.code !== 200 || !xxvidData.data) {
      throw new Error(xxvidData.msg || "Invalid response from xxvid API");
    }

    // 📥 Second API (Koyeb)
    const koyebRes = await axios.get(koyebUrl);
    const koyebData = koyebRes.data;

    // 🎯 Combine both
    return {
      title: koyebData.title || xxvidData.data.title,
      thumbnail: koyebData.thumb || koyebData.preview || xxvidData.data.img,
      duration: koyebData.durationFormatted,
      views: koyebData.views,
      tags: koyebData.tags,
      pornstars: koyebData.pornstars,
      categories: koyebData.categories,
      videos: [
        ...xxvidData.data.videos.map(v => ({
          source: 'xxvid',
          quality: v.quality,
          url: v.url
        })),
        ...koyebData.mediaDefinitions.map(v => ({
          source: 'koyeb',
          quality: v.quality || 'unknown',
          format: v.format,
          url: v.videoUrl
        }))
      ]
    };
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message);
  }
};

module.exports = getPornhubVideo;
