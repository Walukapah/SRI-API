// pronhubdl.js
const axios = require('axios');

const getPornhubVideo = async (videoUrl) => {
  const url = 'https://xxx.xxvid.download/xxx-download/video-info-v3';

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
    const response = await axios.post(url, data, { headers });
    const resData = response.data;

    if (resData.code === 200 && resData.data) {
      return {
        title: resData.data.title,
        thumbnail: resData.data.img,
        videos: resData.data.videos.map(video => ({
          quality: video.quality,
          url: video.url
        }))
      };
    } else {
      throw new Error(resData.msg || "Invalid response from downloader");
    }
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message);
  }
};

module.exports = getPornhubVideo;
