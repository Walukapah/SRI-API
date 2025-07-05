const axios = require('axios');

const formatNumber = (num) => {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatTime = (timestamp) => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleString();
};

async function getAccountInfo(uid, region) {
  const accountUrl = "https://client-hlgamingofficial.vercel.app/api/ff-hl-gaming-official-api-account-v2-latest/account";
  
  const accountData = {
    key: "FFwlx",
    region: region || "sg",
    uid: uid || "12345678"
  };

  const headers = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Origin": "https://www.hlgamingofficial.com",
    "Referer": "https://www.hlgamingofficial.com/",
    "Sec-Ch-Ua": '"Not A(Brand";v="8", "Chromium";v="132"',
    "Sec-Ch-Ua-Mobile": "?1",
    "Sec-Ch-Ua-Platform": '"Android"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
  };

  try {
    const accountResponse = await axios.post(accountUrl, accountData, { headers });
    return accountResponse.data;
  } catch (err) {
    console.error("Account info error:", err);
    throw err;
  }
}

async function getData(uid, region) {
  const dataUrl = "https://client3-hlgamingofficial.vercel.app/api/hl-gaming-official-v10-img-res/v10/data";
  
  const params = {
    uid: uid || "12345678",
    region: region || "sg"
  };

  const headers = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "If-None-Match": 'W/"137-8l1zkyDxNPG496hrkdKJUE38WHc"',
    "Origin": "https://www.hlgamingofficial.com",
    "Referer": "https://www.hlgamingofficial.com/",
    "Sec-Ch-Ua": '"Not A(Brand";v="8", "Chromium";v="132"',
    "Sec-Ch-Ua-Mobile": "?1",
    "Sec-Ch-Ua-Platform": '"Android"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
  };

  try {
    const dataResponse = await axios.get(dataUrl, {
      params: params,
      headers: headers
    });
    return dataResponse.data;
  } catch (error) {
    console.error("Data error:", error);
    throw error;
  }
}

module.exports = async (uid, region) => {
  try {
    const [accountInfo, data] = await Promise.all([
      getAccountInfo(uid, region),
      getData(uid, region)
    ]);

    // Format the response similar to youtubedl.js
    const mainResponse = {
      status: "success",
      code: 200,
      message: "Free Fire data retrieved successfully",
      data: {
        account_info: {
          uid: uid || "12345678",
          region: region || "sg",
          name: accountInfo?.AccountInfo?.AccountName || "Unknown",
          level: accountInfo?.AccountInfo?.AccountLevel || 0,
          experience: accountInfo?.AccountInfo?.AccountEXP || 0,
          create_time: accountInfo?.AccountInfo?.AccountCreateTime || "0",
          create_time_formatted: formatTime(accountInfo?.AccountInfo?.AccountCreateTime || "0"),
          last_login: accountInfo?.AccountInfo?.AccountLastLogin || "0",
          last_login_formatted: formatTime(accountInfo?.AccountInfo?.AccountLastLogin || "0"),
          avatar_id: accountInfo?.AccountInfo?.AccountAvatarId || 0,
          banner_id: accountInfo?.AccountInfo?.AccountBannerId || 0,
          title_id: accountInfo?.AccountInfo?.Title || 0,
          bp_id: accountInfo?.AccountInfo?.AccountBPID || 0,
          bp_badges: accountInfo?.AccountInfo?.AccountBPBadges || 0,
          likes: accountInfo?.AccountInfo?.AccountLikes || 0,
          likes_formatted: formatNumber(accountInfo?.AccountInfo?.AccountLikes || 0),
          diamond_cost: accountInfo?.AccountInfo?.DiamondCost || 0,
          release_version: accountInfo?.AccountInfo?.ReleaseVersion || "Unknown",
          signature: accountInfo?.socialinfo?.AccountSignature || "",
          br_rank: accountInfo?.AccountInfo?.BrRankPoint || 0,
          br_max_rank: accountInfo?.AccountInfo?.BrMaxRank || 0,
          cs_rank: accountInfo?.AccountInfo?.CsRankPoint || 0,
          cs_max_rank: accountInfo?.AccountInfo?.CsMaxRank || 0,
          show_br_rank: accountInfo?.AccountInfo?.ShowBrRank || false,
          show_cs_rank: accountInfo?.AccountInfo?.ShowCsRank || false
        },
        guild_info: {
          id: accountInfo?.GuildInfo?.GuildID || "0",
          name: accountInfo?.GuildInfo?.GuildName || "No Guild",
          level: accountInfo?.GuildInfo?.GuildLevel || 0,
          members: accountInfo?.GuildInfo?.GuildMember || 0,
          capacity: accountInfo?.GuildInfo?.GuildCapacity || 0,
          owner: accountInfo?.GuildInfo?.GuildOwner || "0"
        },
        pet_info: {
          id: accountInfo?.petInfo?.id || 0,
          name: accountInfo?.petInfo?.name || "No Pet",
          level: accountInfo?.petInfo?.level || 0,
          exp: accountInfo?.petInfo?.exp || 0,
          skin_id: accountInfo?.petInfo?.skinId || 0,
          selected_skill_id: accountInfo?.petInfo?.selectedSkillId || 0,
          is_selected: accountInfo?.petInfo?.isSelected || false
        },
        resources: {
          outfit: data?.outfit || "",
          banner: data?.banner || ""
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "WALUKA🇱🇰",
        service: "HLGamingOfficial"
      }
    };

    return mainResponse;

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
