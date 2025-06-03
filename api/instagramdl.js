const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

// Main function
module.exports = async (url) => {
  try {
    // Validate URL
    if (!url || !url.includes('instagram.com')) {
      throw new Error('Invalid Instagram URL');
    }

    // Prepare request data
    const data = {
      k_exp: "174883043",
      k_token: "4be712781df85f885178b194776b4a7724c9a04c57585dba75bd3e43fdcc656a",
      q: url,
      t: "media",
      lang: "en",
      v: "v2"
    };

    const headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://saveinsta.me',
      'Referer': 'https://saveinsta.me/',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Make the API request
    const response = await axios.post(
      "https://saveinsta.me/api/ajaxSearch",
      qs.stringify(data),
      { headers }
    );

    if (response.data.status !== 'ok') {
      throw new Error('Failed to fetch Instagram data');
    }

    // Parse the HTML response
    const $ = cheerio.load(response.data.data);
    const downloadLinks = {
      thumbnail: '',
      video: ''
    };

    // Extract download links
    $('.download-items__btn a').each((i, el) => {
      const href = $(el).attr('href');
      const title = $(el).attr('title');
      if (title === 'Download Thumbnail') {
        downloadLinks.thumbnail = href;
      } else if (title === 'Download Video') {
        downloadLinks.video = href;
      }
    });

    // Extract thumbnail image URL
    const thumbnailImg = $('.download-items__thumb img').attr('src');

    // Format the response
    const result = {
      status: "success",
      code: 200,
      message: "Instagram data retrieved successfully",
      data: {
        original_url: url,
        thumbnail: thumbnailImg || "",
        download_links: {
          thumbnail: downloadLinks.thumbnail || "",
          video: downloadLinks.video || ""
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "YourName",
        service: "saveinsta.me"
      }
    };

    return result;

  } catch (error) {
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
