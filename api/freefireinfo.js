const axios = require('axios');

const formatNumber = (num) => {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatTimestamp = (timestamp) => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toISOString();
};

module.exports = async (region, uid) => {
  try {
    if (!region || !uid) {
      throw new Error('Region and UID parameters are required');
    }

    const response = await axios.get(`https://free-fire-info-site-phi.vercel.app/player-info?region=${region}&uid=${uid}`);
    const playerData = response.data;

    // Format the response structure
    const formattedResponse = {
      status: "success",
      code: 200,
      message: "Player data retrieved successfully",
      data: {
        basicInfo: {
          accountId: playerData.basicInfo?.accountId || "",
          accountType: playerData.basicInfo?.accountType || 0,
          nickname: playerData.basicInfo?.nickname || "",
          region: playerData.basicInfo?.region || "",
          level: playerData.basicInfo?.level || 0,
          exp: playerData.basicInfo?.exp || 0,
          bannerId: playerData.basicInfo?.bannerId || 0,
          headPic: playerData.basicInfo?.headPic || 0,
          rank: playerData.basicInfo?.rank || 0,
          rankingPoints: playerData.basicInfo?.rankingPoints || 0,
          role: playerData.basicInfo?.role || 0,
          hasElitePass: playerData.basicInfo?.hasElitePass || false,
          badgeCnt: playerData.basicInfo?.badgeCnt || 0,
          badgeId: playerData.basicInfo?.badgeId || 0,
          seasonId: playerData.basicInfo?.seasonId || 0,
          liked: playerData.basicInfo?.liked || 0,
          liked_formatted: formatNumber(playerData.basicInfo?.liked || 0),
          lastLoginAt: playerData.basicInfo?.lastLoginAt || "0",
          lastLoginAt_formatted: formatTimestamp(playerData.basicInfo?.lastLoginAt || "0"),
          csRank: playerData.basicInfo?.csRank || 0,
          csRankingPoints: playerData.basicInfo?.csRankingPoints || 0,
          weaponSkinShows: playerData.basicInfo?.weaponSkinShows || [],
          maxRank: playerData.basicInfo?.maxRank || 0,
          csMaxRank: playerData.basicInfo?.csMaxRank || 0,
          accountPrefers: playerData.basicInfo?.accountPrefers || {},
          createAt: playerData.basicInfo?.createAt || "0",
          createAt_formatted: formatTimestamp(playerData.basicInfo?.createAt || "0"),
          title: playerData.basicInfo?.title || 0,
          externalIconInfo: playerData.basicInfo?.externalIconInfo || {},
          releaseVersion: playerData.basicInfo?.releaseVersion || "",
          showBrRank: playerData.basicInfo?.showBrRank || false,
          showCsRank: playerData.basicInfo?.showCsRank || false,
          socialHighLightsWithBasicInfo: playerData.basicInfo?.socialHighLightsWithBasicInfo || {}
        },
        profileInfo: {
          avatarId: playerData.profileInfo?.avatarId || 0,
          skinColor: playerData.profileInfo?.skinColor || 0,
          clothes: playerData.profileInfo?.clothes || [],
          equipedSkills: playerData.profileInfo?.equipedSkills || [],
          isSelected: playerData.profileInfo?.isSelected || false,
          isSelectedAwaken: playerData.profileInfo?.isSelectedAwaken || false
        },
        clanBasicInfo: {
          clanId: playerData.clanBasicInfo?.clanId || "",
          clanName: playerData.clanBasicInfo?.clanName || "",
          captainId: playerData.clanBasicInfo?.captainId || "",
          clanLevel: playerData.clanBasicInfo?.clanLevel || 0,
          capacity: playerData.clanBasicInfo?.capacity || 0,
          memberNum: playerData.clanBasicInfo?.memberNum || 0,
          memberNum_formatted: formatNumber(playerData.clanBasicInfo?.memberNum || 0)
        },
        captainBasicInfo: {
          accountId: playerData.captainBasicInfo?.accountId || "",
          accountType: playerData.captainBasicInfo?.accountType || 0,
          nickname: playerData.captainBasicInfo?.nickname || "",
          region: playerData.captainBasicInfo?.region || "",
          level: playerData.captainBasicInfo?.level || 0,
          exp: playerData.captainBasicInfo?.exp || 0,
          bannerId: playerData.captainBasicInfo?.bannerId || 0,
          headPic: playerData.captainBasicInfo?.headPic || 0,
          rank: playerData.captainBasicInfo?.rank || 0,
          rankingPoints: playerData.captainBasicInfo?.rankingPoints || 0,
          role: playerData.captainBasicInfo?.role || 0,
          hasElitePass: playerData.captainBasicInfo?.hasElitePass || false,
          badgeCnt: playerData.captainBasicInfo?.badgeCnt || 0,
          badgeId: playerData.captainBasicInfo?.badgeId || 0,
          seasonId: playerData.captainBasicInfo?.seasonId || 0,
          liked: playerData.captainBasicInfo?.liked || 0,
          liked_formatted: formatNumber(playerData.captainBasicInfo?.liked || 0),
          lastLoginAt: playerData.captainBasicInfo?.lastLoginAt || "0",
          lastLoginAt_formatted: formatTimestamp(playerData.captainBasicInfo?.lastLoginAt || "0"),
          csRank: playerData.captainBasicInfo?.csRank || 0,
          csRankingPoints: playerData.captainBasicInfo?.csRankingPoints || 0,
          weaponSkinShows: playerData.captainBasicInfo?.weaponSkinShows || [],
          maxRank: playerData.captainBasicInfo?.maxRank || 0,
          csMaxRank: playerData.captainBasicInfo?.csMaxRank || 0,
          accountPrefers: playerData.captainBasicInfo?.accountPrefers || {},
          createAt: playerData.captainBasicInfo?.createAt || "0",
          createAt_formatted: formatTimestamp(playerData.captainBasicInfo?.createAt || "0"),
          title: playerData.captainBasicInfo?.title || 0,
          externalIconInfo: playerData.captainBasicInfo?.externalIconInfo || {},
          releaseVersion: playerData.captainBasicInfo?.releaseVersion || "",
          showBrRank: playerData.captainBasicInfo?.showBrRank || false,
          showCsRank: playerData.captainBasicInfo?.showCsRank || false,
          socialHighLightsWithBasicInfo: playerData.captainBasicInfo?.socialHighLightsWithBasicInfo || {}
        },
        petInfo: {
          id: playerData.petInfo?.id || 0,
          name: playerData.petInfo?.name || "",
          level: playerData.petInfo?.level || 0,
          exp: playerData.petInfo?.exp || 0,
          isSelected: playerData.petInfo?.isSelected || false,
          skinId: playerData.petInfo?.skinId || 0,
          selectedSkillId: playerData.petInfo?.selectedSkillId || 0
        },
        socialInfo: {
          accountId: playerData.socialInfo?.accountId || "",
          language: playerData.socialInfo?.language || "",
          modePrefer: playerData.socialInfo?.modePrefer || "",
          signature: playerData.socialInfo?.signature || "",
          rankShow: playerData.socialInfo?.rankShow || ""
        },
        diamondCostRes: {
          diamondCost: playerData.diamondCostRes?.diamondCost || 0
        },
        creditScoreInfo: {
          creditScore: playerData.creditScoreInfo?.creditScore || 0,
          rewardState: playerData.creditScoreInfo?.rewardState || "",
          periodicSummaryEndTime: playerData.creditScoreInfo?.periodicSummaryEndTime || "0",
          periodicSummaryEndTime_formatted: formatTimestamp(playerData.creditScoreInfo?.periodicSummaryEndTime || "0")
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "WALUKA🇱🇰",
        source: "free-fire-info-site-phi.vercel.app"
      }
    };

    return formattedResponse;

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
