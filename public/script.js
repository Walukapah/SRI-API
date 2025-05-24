document.getElementById('downloadBtn').addEventListener('click', async () => {
  const urlInput = document.getElementById('tiktokUrl');
  const url = urlInput.value.trim();
  
  if (!url) {
    alert('Please enter a TikTok URL');
    return;
  }

  try {
    const response = await fetch(`/download/tiktokdl?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.status) {
      displayResults(data.result);
    } else {
      alert('Error: ' + (data.message || 'Failed to fetch video info'));
    }
  } catch (error) {
    alert('An error occurred. Please try again.');
    console.error(error);
  }
});

function displayResults(videoData) {
  const resultDiv = document.getElementById('result');
  resultDiv.classList.remove('hidden');
  
  // Set video info
  document.getElementById('video-title').textContent = videoData.title;
  document.getElementById('thumbnail').src = videoData.video.cover;
  
  // Set stats
  const stats = `
    👍 ${videoData.stats.likeCount} | 
    💬 ${videoData.stats.commentCount} | 
    🔗 ${videoData.stats.shareCount} | 
    ▶️ ${videoData.stats.playCount}
  `;
  document.getElementById('video-stats').innerHTML = stats;
  
  // Set download links
  const videoLink = document.getElementById('videoLink');
  videoLink.href = videoData.video.noWatermark;
  videoLink.download = `${videoData.title}.mp4`;
  
  const audioLink = document.getElementById('audioLink');
  audioLink.href = videoData.music.play_url;
  audioLink.download = `${videoData.music.title}.mp3`;
}
