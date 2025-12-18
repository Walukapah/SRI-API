const axios = require('axios');
const qs = require('qs');

/* ------------------ Helpers ------------------ */
const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num = 0) => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
};

const getQualityLabel = (quality) => {
  const map = {
    '18': '360p',
    '22': '720p',
    '137': '1080p',
    '140': '128kbps',
    'mp3128': '128kbps',
    'auto': 'auto'
  };
  return map[quality] || quality;
};

/* ------------------ Headers ------------------ */
const headers = {
  "Accept": "*/*",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
  "Origin": "https://ssvid.app",
  "Referer": "https://ssvid.app/en82",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
};

/* ------------------ API Calls ------------------ */
async function searchVideo(youtubeUrl) {
  const url = "https://ssvid.app/api/ajax/search?hl=en";

  const data = qs.stringify({
    hl: "en",
    query: youtubeUrl,
    cf_token: "",
    vt: "home"
  });

  const res = await axios.post(url, data, { headers, timeout: 15000 });
  return res.data;
}

async function convertVideo(vid, k) {
  const url = "https://ssvid.app/api/ajax/convert?hl=en";

  const data = qs.stringify({
    hl: "en",
    vid,
    k
  });

  const res = await axios.post(url, data, { headers, timeout: 15000 });
  return res.data;
}

/* ------------------ Main Export ------------------ */
module.exports = async (youtubeUrl) => {
  try {
    if (!youtubeUrl || (!youtubeUrl.includes("youtube.com") && !youtubeUrl.includes("youtu.be"))) {
      throw new Error("Invalid YouTube URL");
    }

    /* Extract video ID */
    let videoId = "";
    if (youtubeUrl.includes("youtube.com")) {
      const m = youtubeUrl.match(/[?&]v=([^&]+)/);
      videoId = m ? m[1] : "";
    } else {
      videoId = youtubeUrl.split("/").pop().split("?")[0];
    }
    if (!videoId) throw new Error("Failed to extract video ID");

    /* Search */
    console.log("🔍 Searching:", youtubeUrl);
    const searchRes = await searchVideo(youtubeUrl);

    if (!searchRes || !searchRes.vid) {
      throw new Error("Search failed or video not found");
    }

    const vid = searchRes.vid;
    const links = searchRes.links || {};

    /* Convert all formats */
    const downloadLinks = {};

    for (const type of Object.keys(links)) {
      downloadLinks[type] = {};

      for (const q of Object.keys(links[type])) {
        const item = links[type][q];
        try {
          console.log(`⚙️ Converting ${type} ${q}`);
          const conv = await convertVideo(vid, item.k);

          if (conv.status === "ok") {
            downloadLinks[type][getQualityLabel(q)] = {
              size: item.size || null,
              download_url: conv.dlink
            };
          } else {
            downloadLinks[type][getQualityLabel(q)] = {
              error: conv.mess || "Convert failed"
            };
          }
        } catch (e) {
          downloadLinks[type][getQualityLabel(q)] = { error: e.message };
        }
      }
    }

    /* Final response */
    return {
      status: "success",
      code: 200,
      message: "YouTube data fetched successfully",
      data: {
        video_info: {
          id: vid,
          title: searchRes.title || "Unknown",
          url: youtubeUrl,
          duration: searchRes.duration || 0,
          duration_formatted: formatDuration(searchRes.duration),
          thumbnail: searchRes.image,
          views: searchRes.views || 0,
          views_formatted: formatCount(searchRes.views)
        },
        download_links: downloadLinks
      },
      meta: {
        timestamp: new Date().toISOString(),
        source: "ssvid.app",
        version: "1.0"
      }
    };

  } catch (err) {
    return {
      status: "error",
      code: 500,
      message: err.message,
      data: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }
};
