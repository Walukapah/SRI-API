const axios = require('axios');
const cheerio = require('cheerio');

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
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      throw new Error('Invalid YouTube URL');
    }

    // Extract video ID
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Could not extract video ID');
    const videoId = videoIdMatch[1];

    // Fetch video page
    const { data: html } = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 5000
    });

    // Parse metadata from HTML
    const $ = cheerio.load(html);
    const script = $('script:contains("ytInitialPlayerResponse")').html();
    if (!script) throw new Error('YouTube metadata not found');
    
    // Extract JSON data
    const jsonStr = script.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/)?.[1];
    if (!jsonStr) throw new Error('Could not parse YouTube data');
    const jsonData = JSON.parse(jsonStr);

    const videoDetails = jsonData.videoDetails;
    const microformat = jsonData.microformat?.playerMicroformatRenderer;
    const streamingData = jsonData.streamingData;

    if (!videoDetails || !microformat || !streamingData) {
      throw new Error('Video data extraction failed');
    }

    // Get best quality video URL (without watermark)
    let videoUrl = '';
    let quality = '';
    if (streamingData.formats && streamingData.formats.length > 0) {
      // Sort by quality (highest first)
      const formats = streamingData.formats.sort((a, b) => (b.height || 0) - (a.height || 0));
      videoUrl = formats[0].url;
      quality = formats[0].qualityLabel || `${formats[0].height}p`;
    }

    // Get audio URL
    let audioUrl = '';
    if (streamingData.adaptiveFormats) {
      const audioFormats = streamingData.adaptiveFormats.filter(f => f.mimeType.includes('audio'));
      if (audioFormats.length > 0) {
        // Get the best audio quality
        const bestAudio = audioFormats.sort((a, b) => {
          const aBitrate = parseInt(a.bitrate || '0');
          const bBitrate = parseInt(b.bitrate || '0');
          return bBitrate - aBitrate;
        })[0];
        audioUrl = bestAudio.url;
      }
    }

    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoDetails.videoId,
          title: videoDetails.title,
          description: videoDetails.shortDescription || "No description",
          original_url: url,
          created_at: microformat.publishDate || "",
          duration: parseInt(videoDetails.lengthSeconds) || 0,
          duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds) || 0),
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          width: 1280,
          height: 720,
          keywords: videoDetails.keywords || []
        },
        statistics: {
          views: parseInt(videoDetails.viewCount) || 0,
          views_formatted: formatCount(parseInt(videoDetails.viewCount) || 0),
          likes: 0, // YouTube doesn't expose this in initial data
          comments: 0 // Would require additional API call
        },
        download_links: {
          video: {
            url: videoUrl,
            quality: quality,
            type: "video/mp4"
          },
          audio: {
            url: audioUrl,
            quality: "128kbps",
            type: "audio/mp4"
          }
        },
        channel: {
          id: videoDetails.channelId,
          name: videoDetails.author,
          url: `https://www.youtube.com/channel/${videoDetails.channelId}`,
          subscribers: 0 // Would require additional API call
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "WALUKA 🇱🇰"
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
