const mumaker = require('mumaker');

// List of available text effect types and their corresponding ephoto360 URLs
const effectTypes = {
  metallic: "https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html",
  ice: "https://en.ephoto360.com/ice-text-effect-online-101.html",
  snow: "https://en.ephoto360.com/snow-text-effect-online-102.html",
  impressive: "https://en.ephoto360.com/impressive-glow-text-effect-online-103.html",
  matrix: "https://en.ephoto360.com/matrix-text-effect-online-104.html",
  light: "https://en.ephoto360.com/light-text-effect-online-105.html",
  neon: "https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html",
  devil: "https://en.ephoto360.com/devil-wings-text-effect-online-106.html",
  purple: "https://en.ephoto360.com/purple-text-effect-online-107.html",
  thunder: "https://en.ephoto360.com/thunder-text-effect-online-108.html",
  leaves: "https://en.ephoto360.com/leaves-text-effect-online-109.html",
  1917: "https://en.ephoto360.com/1917-text-effect-online-110.html",
  arena: "https://en.ephoto360.com/arena-text-effect-online-111.html",
  hacker: "https://en.ephoto360.com/hacker-text-effect-online-112.html",
  sand: "https://en.ephoto360.com/sand-text-effect-online-113.html",
  blackpink: "https://en.ephoto360.com/blackpink-text-effect-online-114.html",
  glitch: "https://en.ephoto360.com/glitch-text-effect-online-115.html",
  fire: "https://en.ephoto360.com/fire-text-effect-online-116.html"
};

module.exports = async (text, type) => {
  try {
    if (!text || !type) {
      throw new Error("Both 'text' and 'type' parameters are required");
    }

    if (!effectTypes[type]) {
      throw new Error("Invalid effect type specified");
    }

    const result = await mumaker.ephoto(effectTypes[type], text);

    if (!result || !result.image) {
      throw new Error("Failed to generate text effect image");
    }

    return {
      status: "success",
      code: 200,
      message: "Text effect generated successfully",
      data: {
        text: text,
        type: type,
        imageUrl: result.image,
        effectInfo: {
          name: type,
          source: "ephoto360.com",
          url: effectTypes[type]
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "WALUKA🇱🇰"
      }
    };

  } catch (error) {
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
