const axios = require('axios');
const cheerio = require('cheerio');
const { execSync } = require('child_process');
const ytdl = require('ytdl-core'); // Add this package
const fs = require('fs');
const path = require('path');

// Helper functions
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
};

const cleanTitle = (title) => {
  return title.replace(/[^\w\s]/gi, '').trim();
};

// Function to get download links
const getDownloadLinks = async (videoId, title) => {
  const cleanTitleStr = cleanTitle(title);
  const timestamp = Date.now();
  
  // MP4 Download Link (360p as default)
  const mp4Info = await ytdl.getInfo(videoId);
  const mp4Format = ytdl.chooseFormat(mp4Info.formats, { quality: '18' }); // 360p MP4
  
  // MP3 Download Link (using highest quality audio)
  const audioFormats = ytdl.filterFormats(mp4Info.formats, 'audioonly');
  const mp3Format = audioFormats[0]; // Highest quality audio
  
  return {
    mp4: {
      url: mp4Format.url,
      quality: mp4Format.qualityLabel,
      mimeType: mp4Format.mimeType,
      bitrate: mp4Format.bitrate,
      size: mp4Format.contentLength ? formatFileSize(parseInt(mp4Format.contentLength)) : 'Unknown',
      filename: `${cleanTitleStr}_${timestamp}.mp4`
    },
    mp3: {
      url: mp3Format.url,
      quality: 'Audio',
      mimeType: mp3Format.mimeType,
      bitrate: mp3Format.bitrate,
      size: mp3Format.contentLength ? formatFileSize(parseInt(mp3Format.contentLength)) : 'Unknown',
      filename: `${cleanTitleStr}_${timestamp}.mp3`
    }
  };
};

// Main function
module.exports = async (url, options = {}) => {
  try {
    // Validate URL
    if (!url || !ytdl.validateURL(url)) {
      throw new Error('Please provide a valid YouTube URL');
    }

    // Extract video info using ytdl-core
    const videoId = ytdl.getURLVideoID(url);
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    const formats = info.formats;

    // Get download links
    const downloadLinks = await getDownloadLinks(videoId, videoDetails.title);

    // Format response
    const response = {
      status: "success",
      code: 200,
      message: "YouTube video data retrieved successfully",
      data: {
        video_info: {
          id: videoDetails.videoId,
          title: videoDetails.title,
          description: videoDetails.description || "No description",
          original_url: url,
          duration: parseInt(videoDetails.lengthSeconds),
          duration_formatted: formatDuration(parseInt(videoDetails.lengthSeconds)),
          view_count: videoDetails.viewCount,
          thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
          keywords: videoDetails.keywords || [],
          is_live: videoDetails.isLiveContent,
          upload_date: videoDetails.uploadDate || new Date().toISOString(),
          channel: {
            id: videoDetails.channelId,
            name: videoDetails.author.name,
            url: videoDetails.author.channel_url
          }
        },
        download_links: {
          mp4: downloadLinks.mp4,
          mp3: downloadLinks.mp3,
          other_formats: formats.map(format => ({
            itag: format.itag,
            url: format.url,
            mimeType: format.mimeType,
            quality: format.qualityLabel,
            audioBitrate: format.audioBitrate,
            container: format.container,
            codecs: format.codecs,
            size: format.contentLength ? formatFileSize(parseInt(format.contentLength)) : 'Unknown'
          }))
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
    console.error('YouTube Downloader Error:', error);
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
