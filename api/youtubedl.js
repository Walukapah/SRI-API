const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

// 设置 ffmpeg 路径
ffmpeg.setFfmpegPath(ffmpegStatic);

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const getVideoData = async (videoUrl) => {
  const data = { url: videoUrl };
  const headers = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://ytsave.to",
    "Referer": "https://ytsave.to/en2",
    "Sec-Ch-Ua": '"Not A(Brand";v="8", "Chromium";v="132"',
    "Sec-Ch-Ua-Mobile": "?1",
    "Sec-Ch-Ua-Platform": '"Android"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
    "X-Requested-With": "XMLHttpRequest"
  };

  try {
    const response = await axios.post(
      "https://ytsave.to/proxy.php",
      qs.stringify(data),
      { headers }
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch video data from iloveyt.net');
  }
};

const fetchRealDownloadUrl = async (mediaUrl) => {
  try {
    const response = await axios.get(mediaUrl);
    if (response.data && response.data.fileUrl) {
      return response.data.fileUrl;
    }
    return mediaUrl;
  } catch (err) {
    console.error('Error fetching real media URL:', err.message);
    return mediaUrl;
  }
};

const convertM4aToMp3 = async (m4aUrl, outputFilename) => {
  const tempDir = '/tmp';
  const inputPath = path.join(tempDir, `input_${Date.now()}.m4a`);
  const outputPath = path.join(tempDir, outputFilename);

  try {
    // 1. 下载 M4A 文件到临时目录
    const response = await axios({
      method: 'GET',
      url: m4aUrl,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(inputPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 2. 使用 FFmpeg 转换为 MP3[citation:3]
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioBitrate('128k')
        .toFormat('mp3')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    // 3. 清理临时 M4A 文件
    fs.unlinkSync(inputPath);

    return outputPath;
  } catch (error) {
    // 清理临时文件
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw new Error(`音频转换失败: ${error.message}`);
  }
};

module.exports = async (url) => {
  try {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL');
    const videoId = videoIdMatch[1];

    // 1. 获取原始响应
    const videoData = await getVideoData(url);
    if (!videoData || !videoData.api || videoData.api.status !== "OK") {
      throw new Error('Failed to process YouTube video');
    }

    const mediaItems = videoData.api.mediaItems || [];

    // 2. 构造初始主响应
    const mainResponse = {
      status: "success",
      code: 200,
      message: "Video data retrieved successfully",
      data: {
        video_info: {
          id: videoId,
          title: videoData.api.title || "No title",
          description: videoData.api.description || "No description",
          original_url: url,
          previewUrl: videoData.api.previewUrl || "",
          imagePreviewUrl: videoData.api.imagePreviewUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          permanentLink: videoData.api.permanentLink || `https://youtu.be/${videoId}`,
          duration: mediaItems[0]?.mediaDuration || 0,
          duration_formatted: mediaItems[0]?.mediaDuration || "00:00"
        },
        statistics: {
          views: videoData.api.mediaStats?.viewsCount || 0,
          views_formatted: formatCount(videoData.api.mediaStats?.viewsCount || 0),
          likes: videoData.api.mediaStats?.likesCount || 0,
          likes_formatted: formatCount(videoData.api.mediaStats?.likesCount || 0),
          comments: videoData.api.mediaStats?.commentsCount || 0,
          comments_formatted: formatCount(videoData.api.mediaStats?.commentsCount || 0)
        },
        download_links: {
          status: true,
          items: []
        },
        audio_conversions: {
          status: true,
          items: []
        },
        author: {
          name: videoData.api.userInfo?.name || "Unknown",
          username: videoData.api.userInfo?.username || "",
          userId: videoData.api.userInfo?.userId || "",
          avatar: videoData.api.userInfo?.userAvatar || "",
          bio: videoData.api.userInfo?.userBio || "",
          verified: videoData.api.userInfo?.isVerified || false,
          followers: videoData.api.mediaStats?.followersCount || 0,
          followers_formatted: formatCount(videoData.api.mediaStats?.followersCount || 0),
          country: videoData.api.userInfo?.accountCountry || ""
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.0",
        creator: "YourName",
        service: "iLoveYT.net",
        note: "MP3文件在/tmp目录下，服务器重启后会自动清理[citation:9]"
      }
    };

    // 3. 获取每个 mediaUrl 的 fileUrl 并更新
    const updatedItems = await Promise.all(mediaItems.map(async (item) => {
      const fileUrl = await fetchRealDownloadUrl(item.mediaUrl);
      return {
        type: item.type,
        quality: item.mediaQuality,
        url: fileUrl,
        previewUrl: item.mediaPreviewUrl,
        thumbnail: item.mediaThumbnail,
        resolution: item.mediaRes,
        duration: item.mediaDuration,
        extension: item.mediaExtension,
        size: item.mediaFileSize
      };
    }));

    // 4. 设置到主响应
    mainResponse.data.download_links.items = updatedItems;

    // 5. 为每个音频项目创建 MP3 转换
    const audioItems = mediaItems.filter(item => item.type === "Audio");
    
    for (const audioItem of audioItems) {
      try {
        const realUrl = await fetchRealDownloadUrl(audioItem.mediaUrl);
        const mp3Filename = `yt_${videoId}_${audioItem.mediaQuality.replace('K', 'k')}.mp3`;
        
        // 转换为 MP3
        const mp3Path = await convertM4aToMp3(realUrl, mp3Filename);
        
        // 添加到响应中
        mainResponse.data.audio_conversions.items.push({
          original_quality: audioItem.mediaQuality,
          format: "MP3",
          bitrate: "128k",
          filename: mp3Filename,
          temp_path: mp3Path,
          download_url: `/api/download?file=${mp3Filename}&id=${videoId}`,
          note: "文件存储在Vercel的/tmp目录中，链接有效期至服务器重启[citation:9]"
        });
      } catch (convError) {
        console.error(`转换失败 ${audioItem.mediaQuality}:`, convError.message);
        // 即使转换失败，也继续处理其他音频
      }
    }

    return mainResponse;

  } catch (error) {
    return {
      status: "error",
      code: 500,
      message: error.message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.0"
      }
    };
  }
};
