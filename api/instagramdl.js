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

    // Get fresh tokens from the page first
    const pageResponse = await axios.get('https://saveinsta.me/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    // Extract tokens from the page HTML
    const $page = cheerio.load(pageResponse.data);
    const kExp = $page('input[name="k_exp"]').val() || $page('#k_exp').val() || '1773732308';
    const kToken = $page('input[name="k_token"]').val() || $page('#k_token').val() || '';

    // If tokens not found in inputs, try to extract from script tags
    let extractedKExp = kExp;
    let extractedKToken = kToken;

    if (!kToken) {
      const scripts = $page('script').toArray();
      for (const script of scripts) {
        const scriptContent = $page(script).html();
        if (scriptContent) {
          const kExpMatch = scriptContent.match(/k_exp["']?\s*[:=]\s*["']?(\d+)/);
          const kTokenMatch = scriptContent.match(/k_token["']?\s*[:=]\s*["']?([a-f0-9]+)/);
          if (kExpMatch) extractedKExp = kExpMatch[1];
          if (kTokenMatch) extractedKToken = kTokenMatch[1];
        }
      }
    }

    // Prepare request data with fresh tokens
    const data = {
      k_exp: extractedKExp,
      k_token: extractedKToken,
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
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Ch-Ua': '"Not A(Brand";v="8", "Chromium";v="132"',
      'Sec-Ch-Ua-Mobile': '?1',
      'Sec-Ch-Ua-Platform': '"Android"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    };

    // Make the API request
    const response = await axios.post(
      "https://saveinsta.me/api/ajaxSearch",
      qs.stringify(data),
      { 
        headers,
        timeout: 30000
      }
    );

    if (response.data.status !== 'ok') {
      throw new Error(response.data.message || 'Failed to fetch Instagram data');
    }

    // Parse the HTML response
    const $ = cheerio.load(response.data.data);
    const downloadLinks = [];
    let thumbnailUrl = '';
    let title = '';
    let duration = '';

    // Extract title
    const titleEl = $('.download-items__title, .download-title, h1, h2').first();
    if (titleEl.length) {
      title = titleEl.text().trim();
    }

    // Extract thumbnail
    const thumbImg = $('.download-items__thumb img, .download-thumb img, img').first();
    if (thumbImg.length) {
      thumbnailUrl = thumbImg.attr('src') || thumbImg.attr('data-src') || '';
    }

    // Extract all download links
    $('.download-items__btn a, .download-btn a, a[href*="download"]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim() || $(el).attr('title') || '';
      const quality = $(el).closest('.download-items, .download-item').find('.download-quality, .quality, span').text().trim() || '';

      if (href && (href.startsWith('http') || href.startsWith('//'))) {
        const cleanHref = href.startsWith('//') ? 'https:' + href : href;
        downloadLinks.push({
          url: cleanHref,
          type: text.toLowerCase().includes('thumbnail') ? 'thumbnail' : 
                text.toLowerCase().includes('video') ? 'video' : 
                text.toLowerCase().includes('audio') ? 'audio' : 'unknown',
          quality: quality,
          text: text
        });
      }
    });

    // If no links found with primary selector, try alternative selectors
    if (downloadLinks.length === 0) {
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('download') || href.includes('.mp4') || href.includes('.jpg'))) {
          const text = $(el).text().trim() || $(el).attr('title') || 'Download';
          const cleanHref = href.startsWith('//') ? 'https:' + href : href;
          if (cleanHref.startsWith('http')) {
            downloadLinks.push({
              url: cleanHref,
              type: text.toLowerCase().includes('thumbnail') ? 'thumbnail' : 'video',
              quality: '',
              text: text
            });
          }
        }
      });
    }

    // Separate video and thumbnail links
    const videoLinks = downloadLinks.filter(link => link.type === 'video');
    const thumbnailLinks = downloadLinks.filter(link => link.type === 'thumbnail');

    // Format the response
    const result = {
      status: "success",
      code: 200,
      message: "Instagram data retrieved successfully",
      data: {
        original_url: url,
        title: title,
        thumbnail: thumbnailUrl,
        duration: duration,
        download_links: {
          videos: videoLinks.length > 0 ? videoLinks : downloadLinks.filter(l => l.type !== 'thumbnail'),
          thumbnails: thumbnailLinks
        },
        all_links: downloadLinks
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.0",
        creator: "WALUKA🇱🇰",
        service: "saveinsta.me"
      }
    };

    return result;

  } catch (error) {
    console.error('InstagramDL Error:', error.message);
    return {
      status: "error",
      code: error.response?.status || 500,
      message: error.message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.0",
        creator: "WALUKA🇱🇰"
      }
    };
  }
};
