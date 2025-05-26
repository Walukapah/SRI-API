const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getResolution = (quality) => {
  return quality.includes('1080') ? '1080p' :
         quality.includes('720') ? '720p' :
         quality.includes('480') ? '480p' : '360p';
};

const formatCount = (num) => {
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

// Function to extract video ID from various YouTube URL formats
const extractVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Main function to get download links from y2mate
const getY2MateLinks = async (videoId) => {
  try {
    // Step 1: Get initial page to get the k_token
    const initialUrl = `https://www.y2mate.com/mates/en68/analyze/ajax`;
    const initialData = new URLSearchParams();
    initialData.append('url', `https://www.youtube.com/watch?v=${videoId}`);
    initialData.append('q_auto', '0');
    initialData.append('ajax', '1');

    const initialResponse = await axios.post(initialUrl, initialData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.y2mate.com/'
      }
    });

    const $ = cheerio.load(initialResponse.data.result);
    const kToken = $('input[name="k__token"]').val();
    if (!kToken) throw new Error('Failed to get k_token from y2mate');

    // Step 2: Get download links
    const downloadUrl = `https://www.y2mate.com/mates/en68/convert`;
    const downloadData = new URLSearchParams();
    downloadData.append('type', 'youtube');
    downloadData.append('_id', $('input[name="_id"]').val());
    downloadData.append('v_id', videoId);
    downloadData.append('ajax', '1');
    downloadData.append('token', $('input[name="token"]').val());
    downloadData.append('ftype', 'mp4');
    downloadData.append('fquality', '720');
    downloadData.append('k__token', kToken);

    const downloadResponse = await axios.post(downloadUrl, downloadData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': `https://www.y2mate.com/en68/youtube/${videoId}`
      }
    });

    const $$ = cheerio.load(downloadResponse.data.result);
    const links = [];

    $$('table.table-bordered tbody tr').each((i, el) => {
      const quality = $$(el).find('td').eq(0).text().trim();
      const type = $$(el).find('td').eq(1).text().trim();
      const size = $$(el).find('td').eq(2).text().trim();
      const url = $$(el).find('a').attr('href');
      
      if (url && type.includes('mp4')) {
        links.push({
          quality: getResolution(quality),
          type: type,
          size: size,
          url: url
        });
      }
    });

    if (links.length === 0) throw new Error('No download links found');
    return links;

  } catch (error) {
    console.error('Error getting y2mate links:', error);
    throw error;
  }
};

// Main function to get YouTube video info
const getYouTubeInfo = async (videoId) => {
  try {
    const response = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    return response.data;
  } catch (error) {
    console.error('Error getting YouTube info:', error);
    throw error;
  }
};

// Main function
module.exports = async (url) => {
  try {
    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    // Get video info and download links in parallel
    const [videoInfo, downloadLinks] = await Promise.all([
      getYouTubeInfo(videoId),
      getY2MateLinks(videoId)
    ]);

    // Find the highest quality download link
    const highestQuality = downloadLinks.reduce((prev, current) => 
      (parseInt(current.quality) > parseInt(prev.quality)) ? current : prev
    );

    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: videoInfo.title || "No title",
          original_url: url,
          thumbnail_url: videoInfo.thumbnail_url || "",
          author_name: videoInfo.author_name || "Unknown",
          author_url: videoInfo.author_url || "",
          provider_name: videoInfo.provider_name || "YouTube"
        },
        download_links: {
          all_qualities: downloadLinks,
          highest_quality: {
            url: highestQuality.url,
            quality: highestQuality.quality,
            type: highestQuality.type,
            size: highestQuality.size
          }
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "YourName",
        source: "y2mate"
      }
    };

    return response;

  } catch (error) {
    console.error('Error:', error);
    return {
      status: "error",
      code: 500,
      message: error.message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0"
      }
    };
  }
};
