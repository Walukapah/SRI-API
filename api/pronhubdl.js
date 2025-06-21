// pornhubdl.js
const { PornHub } = require('pornhub.js');
const pornhub = new PornHub();

module.exports = async (url) => {
  if (!url || !url.includes('pornhub.com')) {
    throw new Error('Invalid Pornhub URL');
  }

  try {
    const video = await pornhub.video(url);
    res.json(video)
  } catch (error) {
    throw new Error(error.message);
  }
};
