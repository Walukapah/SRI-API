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
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        "X-Recaptcha-Token": "03AFcWeA4-ddChgW34z0RAXtlSPw4bqdfzhQaEuAmng-H31POKCFwq6lcRNGDXGTJUoA7V7m1Fasbg1v7h1vUkOW9LXYswwFDgKsMhPAzG_j16WUWoezuVtH5W50_vECuLPm10MPfOzFNW3JSxBl_4HX5kCFQtHsJsRlv_xk9c6lc39Spv-UeFv3UEDdYO_40HgtxrzljWzT1h1YYRMIgj47zo7pkCWNGTfT1caPglBlN8Y4HqZsujNbztOlzOQgmLjw1aTw3v2N2-nh82k_skS5Nu4xEDpnyjkQN4Kw48INeiHVYNx1HXKu72G60JQ7PPID1E8zSWqnUeFm0wdQ8ExFwKqTQ8LV1-P2C95elchVzyLV_8tQT3CoBBh4N1i5fp6nIelU3OZegzD-HXk3TsWqIX7G0SdwsIFLSinobgGJkwE3vje6oWfb9lpatC8FWigwRCMbG7AsGCv-0kn092BgTI2akz3yLTv1lNusZizCi7AQnHCsaZUA9OhfhCcXQpRaprnqkyTttvsvmK2g-YL7VkdRumU_yFnVmAvdANE1De9qvJzcDmBTAghd2tJu2Yof65tyc-Dnon4YA_tIwkgy4VaaY2_p02hmtxhnxNsKOKJaEcc-3FNg1Qkm2BnfGJ0vE4hl3ezJn6E8LzwoJy4Z1oEhq9j2wwECn3ZlXnF-YD1bjK9vjwWWvBKd_AXlsPHyyhxVgmbKmEvlYLDKxPRb0GmYWDy936HVobEhJDpxvBokICliNBo5B6a2PrGZp5jUE3qe5lHr6mgnQhYpoaK6U6RIovhVZr17KmNcSd4tJAX1UtYIJr3kIgrlLt_ndoqyUT3yfDdJGDHnqw2J8nwv_XihK60rtXLrDHKr5QtHynoNoeUweEAIg-dIEtP6Cns3B47cutChPl0cN07OMwiOP_GsxtWgpPlijzWV9L4qct3nSHR46lhiyJn_-WiJPeYNZ5pVlN46HRLeIdGCFysoyCIwPBUwFsSqIU3bKyLPrkuzE6B8HzlBQ618Ft7I17bNNbSYglxfwH5Tq1LrE8LUHQ2HfpUjXjA2-EO5xQsSRWBvv-urgbWsMZ6y_SpxMP_ayBGHn4VLG3h2UdGlOTQY9aQdoPDfC9v0f1QcWENVIofy3SEz2_EdYJxTnYQuua_JNAZDZ-m_K9_Ok6cgrqrupbpeFdz9JCgVbvSIqeLyGImeTGqhzozp8SLbefXWixECpA0GG1hz35tJbbIQmqXDxncXnnwk_6uVh6DXWStLNimd_2yPeP_x3YxkjgC_0J5LE6IygK-kaOWV3OhT7I-pCVvpcHoBDmrHtPQnIxgyv4EXH7eFivA3yc7zg0EK407HC0DKIMRKLUCkCsU4TkAveGIy_i0j-cBHGT8k3VuLF7md6vLaHHEBN1N1VZqpivn3ChpOPN23yqiJyO2_tRDmnVxGHFxIn6zmTOXMbE-UyxCm9MskE7kzwea7AOERPB5Xe4P8wmrA7A1--lXRH82eeBTvUj4LaCC8B1tXh__FHI1_BAl7u--hPrxrrIU6FNsasSOnbhIOUSDc3VMu4Nw3VNZwwJivPA5e2OFKSfFlqCAQjt81eV6Uq2484h01u9PShGRCmggglo1BV4_4OrRwZViPg-LuCEG1Uqu0z9TSGA71oMti9dUCylRlhN0LjhtZXAm6iBijVo7nuVpn3lMvU-bxXZEzKVKG_TetgEibKLHlyq4f1pYvmrP1Su1bQrQtsFcchu_tQFHG9E6w1-IgF4HBDTpTgBZWhCKEevuLyoaxeD_iWv88PxN5bejJ5CQ8zGRbYCjCREgFn-Y7w-_KqYGfOO12fkJBUQAzywn_Oesf8Zc6U27hhNiv1uD19yjMBFLxS1F4ggoH5KEZH-zNieD5ObzGTanwB57oZodUrbUntN6DK9U-4QhkEv3b5gtdB0pYudVmHatwnemTmCPh5G5AdoLYh1Vqoa_ocX4ohRMcuTSQKTifkV-gKZ0tHLFsagKWhB4nj1Q7OdQxT7SoBwrBtMeolb1pmEIYykQTsG1Vp7dC_BDGWo4Vszii-iUfXUhjg1NZVeT2dzd3BREng9MeVF_A4FmAkrvxsLEMnzUGZ2xzmW7dQXCPiMj4aq0vnzq2glPoUD-FUEauuDBthPOq0PPgPwm899KP8Q6592yjiHeY2JQSo"
  };

  try {
    const accountResponse = await axios.post(accountUrl, accountData, { headers });
    return accountResponse.data;
  } catch (err) {
    return null; // Error නම් null
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
    "Origin": "https://www.hlgamingofficial.com",
    "Referer": "https://www.hlgamingofficial.com/",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
  };

  try {
    const dataResponse = await axios.get(dataUrl, { params, headers });
    return dataResponse.data;
  } catch (err) {
    return null; // Error නම් null
  }
}

module.exports = async (uid, region) => {
  const [accountInfo, data] = await Promise.all([
    getAccountInfo(uid, region),
    getData(uid, region)
  ]);

  if (!accountInfo && !data) {
    return {
      status: "error",
      code: 500,
      message: "Both data sources failed.",
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0"
      }
    };
  }

  const response = {
    status: "success",
    code: 200,
    message: "Partial data retrieved",
    data: {},
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      creator: "WALUKA🇱🇰",
      service: "HLGamingOfficial"
    }
  };

  if (accountInfo) {
    response.data.account_info = {
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
    };

    response.data.guild_info = {
      id: accountInfo?.GuildInfo?.GuildID || "0",
      name: accountInfo?.GuildInfo?.GuildName || "No Guild",
      level: accountInfo?.GuildInfo?.GuildLevel || 0,
      members: accountInfo?.GuildInfo?.GuildMember || 0,
      capacity: accountInfo?.GuildInfo?.GuildCapacity || 0,
      owner: accountInfo?.GuildInfo?.GuildOwner || "0"
    };

    response.data.pet_info = {
      id: accountInfo?.petInfo?.id || 0,
      name: accountInfo?.petInfo?.name || "No Pet",
      level: accountInfo?.petInfo?.level || 0,
      exp: accountInfo?.petInfo?.exp || 0,
      skin_id: accountInfo?.petInfo?.skinId || 0,
      selected_skill_id: accountInfo?.petInfo?.selectedSkillId || 0,
      is_selected: accountInfo?.petInfo?.isSelected || false
    };
  }

  if (data) {
    response.data.resources = {
      outfit: data?.outfit || "",
      banner: data?.banner || ""
    };
  }

  response.message = (!accountInfo || !data) ? "Partial data retrieved, one source failed" : "All data retrieved successfully";

  return response;
};
