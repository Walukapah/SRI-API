document.getElementById('downloadBtn').addEventListener('click', async () => {
    const url = document.getElementById('tiktokUrl').value.trim();
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
    
    document.getElementById('video-title').textContent = videoData.title;
    document.getElementById('video-desc').textContent = videoData.caption;
    document.getElementById('thumbnail').src = videoData.thumbnail;
    
    const videoLink = document.getElementById('videoLink');
    videoLink.href = videoData.nowm;
    videoLink.setAttribute('download', videoData.title + '.mp4');
    
    const audioLink = document.getElementById('audioLink');
    audioLink.href = videoData.mp3;
    audioLink.setAttribute('download', videoData.title + '.mp3');
}
