// pronhubdl.js
const { PornHub } = require('pornhub.js');
const axios = require('axios');

const pornhub = new PornHub();

const getPornhubVideo = async (url) => {
  try {
    const meta = await pornhub.video(url);

    const response = await axios.post('https://xxx.xxvid.download/xxx-download/video-info-v3', {
      app_id: 'pornhub_downloader',
      platform: 'Pornhub',
      url
    }, {
      headers: {
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
      }
    });

    const dlData = response.data?.data;

    return {
      status: true,
      title: meta.title,
      url: meta.url,
      thumbnail: meta.thumb,
      preview: meta.preview,
      duration: meta.durationFormatted,
      views: meta.views,
      likes: meta.vote?.up || 0,
      rating: meta.vote?.rating || 0,
      uploadDate: meta.uploadDate,
      stars: meta.pornstars,
      tags: meta.tags,
      categories: meta.categories,
      uploader: {
        name: meta.provider?.username || "Unknown",
        profile: `https://www.pornhub.com${meta.provider?.url || ''}`
      },
      videos: [
        ...(dlData?.videos?.map(v => ({
          type: "mp4",
          quality: v.quality,
          url: v.url
        })) || []),
        ...(meta.mediaDefinitions?.map(m => ({
          type: m.format,
          quality: m.quality || "default",
          url: m.videoUrl,
          isDefault: m.defaultQuality
        })) || [])
      ]
    };

  } catch (error) {
    return {
      status: false,
      message: error.message || 'Something went wrong'
    };
  }
};

module.exports = getPornhubVideo;
