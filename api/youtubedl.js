const axios = require('axios');
const cheerio = require('cheerio');

// Extract YouTube video ID from various URL formats
const getVideoId = (url) => {
  const pattern = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:shorts\/)?(?:watch\?.*(?:|\&)v=|embed\/|v\/)|youtu\.be\/([-_0-9A-Za-z]{11})/;
  const match = url.match(pattern);
  return match ? match[1] : null;
};

// Main y2mate downloader function
const y2mate = async (url, type = 'mp4', quality = '720p', server = 'en68') => {
  try {
    // Validate YouTube URL
    const videoId = getVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Step 1: Get analysis page to extract required tokens
    const analyzeUrl = `https://www.y2mate.com/mates/${server}/analyze/ajax`;
    const analyzeData = new URLSearchParams();
    analyzeData.append('url', `https://youtu.be/${videoId}`);
    analyzeData.append('q_auto', '0');
    analyzeData.append('ajax', '1');

    const analyzeResponse = await axios.post(analyzeUrl, analyzeData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(analyzeResponse.data.result);
    const scriptContent = $('script').eq(1).html() || '';
    
    // Extract required tokens from script
    const kIdMatch = scriptContent.match(/var k__id = "(.+?)"/);
    if (!kIdMatch) {
      throw new Error('Failed to extract required tokens from y2mate');
    }
    const kId = kIdMatch[1];

    // Step 2: Get download link
    const convertUrl = `https://www.y2mate.com/mates/${server}/convert`;
    const convertData = new URLSearchParams();
    convertData.append('type', 'youtube');
    convertData.append('_id', kId);
    convertData.append('v_id', videoId);
    convertData.append('ajax', '1');
    convertData.append('token', '');
    convertData.append('ftype', type);
    convertData.append('fquality', quality);

    const convertResponse = await axios.post(convertUrl, convertData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $$ = cheerio.load(convertResponse.data.result);
    const downloadLink = $$('a').attr('href');

    if (!downloadLink) {
      throw new Error('Failed to get download link from y2mate');
    }

    return {
      status: 'success',
      videoId: videoId,
      type: type,
      quality: quality,
      url: downloadLink,
      server: server
    };

  } catch (error) {
    console.error('Error in y2mate:', error);
    return {
      status: 'error',
      message: error.message || 'An error occurred while processing your request'
    };
  }
};

// Example usage:
// y2mate('https://youtu.be/pOWuBM2RNmI', 'mp3', '128')
//   .then(result => console.log(result))
//   .catch(error => console.error(error));

module.exports = youtubedl;
