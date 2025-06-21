// pornhubdl.js
const { PornHub } = require('pornhub.js');
const pornhub = new PornHub();

module.exports = async (url) => {
  if (!url || !url.includes('pornhub.com')) {
    throw new Error('Invalid Pornhub URL');
  }

  try {
    const video = await pornhub.video(url)
    res.json(video)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch video info', details: err.message })
  }
};
