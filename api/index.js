app.get('/download/tiktokdl', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ 
        status: false, 
        message: "URL parameter is required" 
      });
    }

    const data = await tiktokdl(url);
    res.json({
      status: true,
      creator: "YourName",
      result: data
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      status: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
