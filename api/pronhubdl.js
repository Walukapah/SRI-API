// pornhubdl.js
const { PornHub } = require('pornhub.js');
const pornhub = new PornHub();

module.exports = async (url) => {
  if (!url || !url.includes('pornhub.com')) {
    throw new Error('Invalid Pornhub URL');
  }

  try {
    const video = await pornhub.video(url);
    return {
      title: video.title,
      url: video.url,
      duration: video.duration,
      views: video.views,
      rating: video.rating,
      percent: video.percent,
      tags: video.tags.map(tag => tag.name),
      thumbnails: video.preview,
      author: {
        name: video.author?.name,
        url: video.author?.url,
        verified: video.author?.verified,
      },
      download: video.downloadUrls || []
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
