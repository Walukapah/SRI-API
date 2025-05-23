const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function(url) {
  try {
    // 1. URL වලංගු කිරීම සහ video ID උපුටා ගැනීම
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid TikTok URL - Could not extract video ID');
    }

    // 2. ප්‍රධාන API උත්සාහ කිරීම
    try {
      const apiData = await getFromOfficialAPI(videoId);
      return formatResponse(apiData);
    } catch (apiError) {
      console.log('Official API failed, trying HTML scraping...');
      // 3. API අසාර්ථක වුවහොත් HTML scraping උත්සාහ කරන්න
      const htmlData = await scrapeViaHTML(url);
      return htmlData;
    }
  } catch (error) {
    console.error('Final Error in tiktokdl:', error);
    throw error;
  }
};

// Helper functions
function extractVideoId(url) {
  // සියලුම ජනප්‍රිය TikTok URL ආකෘති සඳහා
  const patterns = [
    /tiktok\.com\/@.+\/video\/(\d+)/,
    /tiktok\.com\/v\/(\d+)/,
    /vm\.tiktok\.com\/.+\/(\d+)/,
    /\/video\/(\d+)/,
    /\/v\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function getFromOfficialAPI(videoId) {
  const apiUrl = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`;
  
  const response = await axios.get(apiUrl, {
    headers: {
      'User-Agent': 'com.ss.android.ugc.trill/2613 (Linux; U; Android 10; en_US; Pixel 4; Build/QQ3A.200805.001; Cronet/58.0.2991.0)',
      'X-Gorgon': '0404807300000131234e6d50d3e065e8b4c0',
      'X-Khronos': Math.floor(Date.now() / 1000).toString()
    },
    timeout: 10000 // 10 seconds timeout
  });

  if (!response.data.aweme_list || response.data.aweme_list.length === 0) {
    throw new Error('No video data found in API response');
  }

  return response.data.aweme_list[0];
}

async function scrapeViaHTML(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 10000
  });

  const $ = cheerio.load(response.data);
  const scriptContent = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();

  if (!scriptContent) {
    throw new Error('No data script found in HTML');
  }

  const parsedData = JSON.parse(scriptContent);
  const videoData = parsedData.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;

  if (!videoData) {
    throw new Error('Could not extract video data from HTML');
  }

  return {
    title: videoData.desc || 'No title',
    caption: videoData.desc || 'No caption',
    nowm: videoData.video?.downloadAddr || videoData.video?.playAddr || '',
    mp3: videoData.music?.playUrl || '',
    thumbnail: videoData.video?.cover || videoData.video?.dynamicCover || ''
  };
}

function formatResponse(awemeData) {
  return {
    title: awemeData.desc || 'No title',
    caption: awemeData.desc || 'No caption',
    nowm: awemeData.video?.play_addr?.url_list?.[0] || '',
    mp3: awemeData.music?.play_url?.url_list?.[0] || '',
    thumbnail: awemeData.video?.cover?.url_list?.[0] || awemeData.video?.dynamic_cover?.url_list?.[0] || ''
  };
}
