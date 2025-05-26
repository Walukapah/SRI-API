const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('url');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (!num) return "0";
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return num.toString();
};

const extractVideoId = (url) => {
  const parsed = parse(url, true);
  
  // Handle youtu.be URLs
  if (url.includes('youtu.be')) {
    return parsed.pathname.slice(1);
  }
  
  // Handle YouTube URLs with v parameter
  if (parsed.query.v) {
    return parsed.query.v;
  }
  
  // Handle YouTube share URLs
  if (parsed.pathname.includes('/watch')) {
    return parsed.query.v;
  }
  
  throw new Error('Could not extract video ID from URL');
};

// Main function
module.exports = async (url) => {
  try {
    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');
    
    // Get video info from YouTube
    const embedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const embedResponse = await axios.get(embedUrl);
    const embedData = embedResponse.data;
    
    // Get video page for additional metadata
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const { data: html } = await axios.get(videoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Parse metadata from page
    const $ = cheerio.load(html);
    const script = $('script').filter((i, el) => 
      $(el).html().includes('var ytInitialPlayerResponse =')
    ).first().html();
    
    if (!script) throw new Error('YouTube metadata not found');
    
    // Extract JSON data
    const jsonStr = script.split('var ytInitialPlayerResponse = ')[1].split('};')[0] + '}';
    const jsonData = JSON.parse(jsonStr);
    
    const videoDetails = jsonData.videoDetails;
    const microformat = jsonData.microformat.playerMicroformatRenderer;
    
    // Format download URLs (using external service)
    const downloadBaseUrl = `https://ytdl-api.vercel.app/api/download`;
    
    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: videoDetails.title,
          description: videoDetails.shortDescription,
          original_url: url,
          created_at: microformat.publishDate || new Date().toISOString(),
          duration: parseInt(videoDetails.lengthSeconds),
          duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds)),
          keywords: videoDetails.keywords || [],
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          views: parseInt(videoDetails.viewCount) || 0,
          views_formatted: formatCount(parseInt(videoDetails.viewCount) || 0),
          is_live: videoDetails.isLiveContent || false
        },
        statistics: {
          likes: 0, // YouTube doesn't show this in the initial response
          comments: 0, // Would need additional API call
          shares: 0
        },
        download_links: {
          video: {
            url: `${downloadBaseUrl}?id=${videoId}&type=video`,
            quality: 'HD',
            formats: ['mp4', 'webm', '3gp']
          },
          audio: {
            url: `${downloadBaseUrl}?id=${videoId}&type=audio`,
            formats: ['mp3', 'm4a', 'ogg']
          }
        },
        channel: {
          id: videoDetails.channelId,
          name: videoDetails.author,
          url: `https://www.youtube.com/channel/${videoDetails.channelId}`,
          avatar: embedData.author_url ? `${embedData.author_url}/avatar` : ''
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "YourName"
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
