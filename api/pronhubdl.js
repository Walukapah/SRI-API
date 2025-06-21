// pronhubdl.js
const { PornHub } = require('pornhub.js');

const pornhub = new PornHub();

const getPornhubVideo = async (url) => {
  try {
    if (!url.includes('pornhub.com')) {
      throw new Error('Invalid Pornhub URL');
    }

    const video = await pornhub.video(url);
    console.log(video)

    if (!video || !video.title) {
      throw new Error('Failed to fetch video info');
    }

    return {
      title: video.title,
      duration: video.duration,
      views: video.views,
      likes: video.rating,
      preview: video.preview,
      thumbnail: video.thumb,
      video_url: video.url,
      tags: video.tags,
      pornstars: video.pornstars,
      videos: video.media // Contains download URLs (qualities and formats)
    };

  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = getPornhubVideo;
