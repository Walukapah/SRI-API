const { PornHub } = require('pornhub.js');
const pornhub = new PornHub();

module.exports = async (url) => {
  try {
    const video = await pornhub.video(url);

    const downloadLinks = (video.mediaDefinitions || [])
      .filter(def => def.videoUrl)
      .map(def => ({
        format: def.format,
        quality: def.quality || 'unknown',
        url: def.videoUrl,
        default: def.defaultQuality || false
      }));

    return {
      status: true,
      id: video.id,
      title: video.title,
      url: video.url,
      duration: video.durationFormatted,
      views: video.views,
      rating: video.vote.rating,
      likes: video.vote.up,
      pornstars: video.pornstars,
      categories: video.categories,
      tags: video.tags,
      premium: video.premium,
      thumbnail: video.thumb,
      preview: video.preview,
      uploadDate: video.uploadDate,
      provider: {
        name: video.provider?.username || "Unknown",
        profile: `https://www.pornhub.com${video.provider?.url || ''}`
      },
      downloads: downloadLinks
    };

  } catch (err) {
    return {
      status: false,
      message: err.message || "Failed to fetch Pornhub video"
    };
  }
};
