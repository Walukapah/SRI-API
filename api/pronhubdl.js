const { PornHub } = require('pornhub.js');
const pornhub = new PornHub();

module.exports = async (url) => {
  try {
    const video = await pornhub.video(url);

    // STEP 1: Print the full raw response for inspection
    console.log('🔍 Full Pornhub API Response:\n', video);

    // STEP 2: Build clean response from extracted data
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
      likes: video.vote?.up || 0,
      rating: video.vote?.rating || 0,
      premium: video.premium,
      pornstars: video.pornstars || [],
      categories: video.categories || [],
      tags: video.tags || [],
      thumbnail: video.thumb,
      preview: video.preview,
      uploadDate: video.uploadDate,
      provider: {
        name: video.provider?.username || "Unknown",
        profile: video.provider?.url
          ? `https://www.pornhub.com${video.provider.url}`
          : "Unknown"
      },
      downloads: downloadLinks
    };

  } catch (err) {
    console.error('❌ Error fetching video:', err.message);
    return {
      status: false,
      message: err.message || "Failed to fetch Pornhub video"
    };
  }
};
