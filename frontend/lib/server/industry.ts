// 行业对比 — 同行业股票分歧分数排名
import { INDUSTRY_PEERS, INDUSTRY_ALIASES } from "./constants";
import { fetchRatings, type RatingRecord } from "./reports";
import { calculateDivergenceScore, getDivergenceLevel } from "./analysis";

function normalizeIndustry(raw: string): string {
  return INDUSTRY_ALIASES[raw.trim()] || raw.trim();
}

export function getIndustry(ratings: RatingRecord[]): string {
  for (const r of ratings) {
    const ind = normalizeIndustry(r.industry);
    if (ind) return ind;
  }
  return "";
}

export async function compareInIndustry(stockCode: string, stockName: string, ratings: RatingRecord[]) {
  const industry = getIndustry(ratings);
  if (!industry) return { industry, peers: [], available: false, reason: "无法识别行业" };

  const peers = INDUSTRY_PEERS[industry] || [];
  if (!peers.length) {
    const score = calculateDivergenceScore(ratings);
    return {
      industry,
      peers: [{ code: stockCode, name: stockName, score: Math.round(score * 10) / 10, level: getDivergenceLevel(score).level, total: ratings.length, is_current: true }],
      available: true,
    };
  }

  const results: { code: string; name: string; score: number; level: string; total: number; is_current: boolean }[] = [];
  const score = calculateDivergenceScore(ratings);
  results.push({ code: stockCode, name: stockName, score: Math.round(score * 10) / 10, level: getDivergenceLevel(score).level, total: ratings.length, is_current: true });

  for (const [code, name] of peers) {
    if (code === stockCode) continue;
    try {
      const peerRatings = await fetchRatings(code);
      if (peerRatings.length < 2) continue;
      const ps = calculateDivergenceScore(peerRatings);
      results.push({ code, name, score: Math.round(ps * 10) / 10, level: getDivergenceLevel(ps).level, total: peerRatings.length, is_current: false });
    } catch { /* skip peer */ }
  }

  results.sort((a, b) => b.score - a.score);
  return { industry, peers: results, available: true };
}
