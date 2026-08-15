// POST /api/analyze — 核心分歧分析
import { resolveStock, searchStocks } from "@/lib/server/stock";
import { fetchRatings } from "@/lib/server/reports";
import { calculateDivergenceScore, getDivergenceLevel, analyzeDistribution, analyzeTargetPrice } from "@/lib/server/analysis";

export async function POST(request: Request) {
  let keyword: string;
  try {
    const body = await request.json();
    keyword = String(body.keyword || "").trim();
  } catch {
    return Response.json({ detail: "请求格式错误" }, { status: 400 });
  }

  if (!keyword) return Response.json({ detail: "请输入股票代码或名称" }, { status: 400 });

  const stock = await resolveStock(keyword);
  if (!stock) {
    const suggestions = await searchStocks(keyword);
    let detail = `未找到股票 '${keyword}'。`;
    if (suggestions.length) {
      detail += ` 你是否想搜: ${suggestions.map(s => `${s.code} ${s.name}`).join(", ")}`;
    }
    return Response.json({ detail }, { status: 404 });
  }

  const ratings = await fetchRatings(stock.code);
  if (ratings.length === 0) {
    return Response.json({ detail: `${stock.name}(${stock.code}) 暂无研报覆盖` }, { status: 404 });
  }
  if (ratings.length === 1) {
    return Response.json({ detail: `${stock.name} 仅有1份研报，分析分歧需要至少2家机构的独立观点` }, { status: 400 });
  }

  const score = calculateDivergenceScore(ratings);
  const levelInfo = getDivergenceLevel(score);
  const distribution = analyzeDistribution(ratings);
  const targetPrice = analyzeTargetPrice(ratings);
  const recentTitles = ratings.slice(0, 5).map(r => r.title.slice(0, 80));

  return Response.json({
    score: Math.round(score * 10) / 10,
    level: levelInfo.level,
    level_desc: levelInfo.level_desc,
    stock,
    ratings,
    distribution,
    target_price: targetPrice,
    recent_titles: recentTitles,
    source: "live",
    cache_updated_at: null,
  });
}
