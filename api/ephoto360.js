const mumaker = require('mumaker');

// Map of type to ephoto360 URLs - This is now the single source of truth
const typeToUrlMap = {
    'metallic': 'https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html',
    'ice': 'https://en.ephoto360.com/ice-text-effect-online-101.html',
    'snow': 'https://en.ephoto360.com/create-snow-text-effects-online-102.html',
    'impressive': 'https://en.ephoto360.com/impressive-glitter-text-effects-online-103.html',
    'matrix': 'https://en.ephoto360.com/matrix-text-effect-generator-online-104.html',
    'light': 'https://en.ephoto360.com/light-text-effect-online-105.html',
    'neon': 'https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html',
    'devil': 'https://en.ephoto360.com/devil-text-effect-online-106.html',
    'purple': 'https://en.ephoto360.com/purple-text-effect-online-107.html',
    'thunder': 'https://en.ephoto360.com/thunder-text-effect-online-108.html',
    'leaves': 'https://en.ephoto360.com/leaves-text-effect-online-109.html',
    '1917': 'https://en.ephoto360.com/1917-text-effect-online-110.html',
    'arena': 'https://en.ephoto360.com/arena-text-effect-online-111.html',
    'hacker': 'https://en.ephoto360.com/hacker-text-effect-online-112.html',
    'sand': 'https://en.ephoto360.com/sand-text-effect-online-113.html',
    'blackpink': 'https://en.ephoto360.com/blackpink-text-effect-online-114.html',
    'glitch': 'https://en.ephoto360.com/create-a-glitch-text-effect-online-free-1000.html',
    'fire': 'https://en.ephoto360.com/fire-text-effect-online-116.html'
};

// Automatically generate availableTypes from typeToUrlMap keys
const availableTypes = Object.keys(typeToUrlMap);

module.exports = async (text, type) => {
    try {
        if (!text || !type) {
            throw new Error("Both 'text' and 'type' parameters are required");
        }

        if (!availableTypes.includes(type)) {
            throw new Error(`Invalid type. Available types are: ${availableTypes.join(', ')}`);
        }

        const url = typeToUrlMap[type];
        const result = await mumaker.ephoto(url, text);

        if (!result || !result.image) {
            throw new Error('Failed to generate image');
        }

        return {
            status: "success",
            code: 200,
            message: "Text image generated successfully",
            data: {
                imageUrl: result.image,
                text: text,
                type: type,
                effectUrl: url
            },
            meta: {
                timestamp: new Date().toISOString(),
                version: "1.0",
                creator: "WALUKA🇱🇰",
                availableTypes: availableTypes // Include in successful response too
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
                version: "1.0",
                availableTypes: availableTypes
            }
        };
    }
};
