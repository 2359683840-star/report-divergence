// 分歧计算 + AI分步分析
import { DIVERGENCE_LEVELS } from "./constants";
import type { RatingRecord } from "./reports";

export function calculateDivergenceScore(ratings: RatingRecord[]): number {
  if (ratings.length < 2) return 0;
  const scores = ratings.map(r => r.rating_score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  return Math.min(100, (std / 2) * 100);
}

export function getDivergenceLevel(score: number): { level: string; level_desc: string } {
  for (const [low, high, level, desc] of DIVERGENCE_LEVELS) {
    if (score >= low && score < high) return { level, level_desc: desc };
  }
  return { level: "未知", level_desc: "" };
}

export function analyzeDistribution(ratings: RatingRecord[]) {
  const distribution: Record<string, number> = {};
  for (const r of ratings) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  }
  const bullish = ratings.filter(r => r.rating_score >= 4).length;
  const neutral = ratings.filter(r => r.rating_score === 3).length;
  const bearish = ratings.filter(r => r.rating_score <= 2).length;
  return {
    distribution,
    total: ratings.length,
    bullish_count: bullish,
    neutral_count: neutral,
    bearish_count: bearish,
    bullish_ratio: ratings.length ? Math.round((bullish / ratings.length) * 1000) / 1000 : 0,
    unique_orgs: new Set(ratings.map(r => r.org)).size,
  };
}

export function analyzeTargetPrice(ratings: RatingRecord[]) {
  const prices = ratings.filter(r => r.target_price !== null).map(r => r.target_price as number);
  if (prices.length < 2) return { available: false };
  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0], max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const spread = median > 0 ? ((max - min) / median) * 100 : 0;
  return {
    available: true,
    count: prices.length, min, max, median,
    mean: Math.round(mean * 100) / 100,
    std: 0,
    spread_pct: Math.round(spread * 10) / 10,
    spread_level: spread < 20 ? "窄" : spread < 50 ? "中等" : "宽",
  };
}

// ─── AI分析 ───
const LLM_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.LLM_API_KEY || "";
const LLM_BASE_URL = process.env.API_BASE_URL || "https://api.deepseek.com";
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";

function buildContext(ratings: RatingRecord[], distribution: ReturnType<typeof analyzeDistribution>, targetPrice: ReturnType<typeof analyzeTargetPrice>, recentTitles: string[]): string {
  const distStr = Object.entries(distribution.distribution).map(([k, v]) => `${k}: ${v}份`).join("、");
  const orgs = [...new Set(ratings.map(r => r.org))].slice(0, 8).join(", ");
  const tpLine = targetPrice.available
    ? `- 目标价: ${targetPrice.min} ~ ${targetPrice.max}元, 中位数${targetPrice.median}元, 价差${targetPrice.spread_pct}%(${targetPrice.spread_level})`
    : "目标价数据不足";

  return `## 评级分布
共 ${distribution.total} 份研报，${distribution.unique_orgs} 家机构
评级: ${distStr}
看多/中性/看空: ${distribution.bullish_count}/${distribution.neutral_count}/${distribution.bearish_count}

## 目标价
${tpLine}

## 参与机构
${orgs}

## 最近研报
${recentTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
}

async function callLLM(system: string, user: string): Promise<Record<string, unknown> | null> {
  if (!LLM_API_KEY) return null;
  try {
    const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0,
      }),
    });
    const data = await res.json();
    let content = data?.choices?.[0]?.message?.content || "";
    if (content.includes("```json")) content = content.split("```json")[1].split("```")[0];
    else if (content.includes("```")) content = content.split("```")[1].split("```")[0];
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function aiStep1Stance(ratings: RatingRecord[], distribution: ReturnType<typeof analyzeDistribution>, targetPrice: ReturnType<typeof analyzeTargetPrice>, recentTitles: string[]) {
  const ctx = buildContext(ratings, distribution, targetPrice, recentTitles);
  const result = await callLLM(
    "你是资深金融分析师。识别多空阵营和核心分歧。只输出JSON。",
    `${ctx}\n\n任务：识别分析师的多空立场和核心分歧。\n\n输出JSON格式：\n{"core_tension":"一句话概括最核心的分歧（20字以内）","bull_orgs":["看多机构1"],"bull_case":["看多论点1"],"bear_orgs":["看空机构1"],"bear_case":["看空论点1"]}`
  );
  return (result || { core_tension: "分析暂不可用", bull_orgs: [], bull_case: [], bear_orgs: [], bear_case: [] }) as Record<string, unknown>;
}

export async function aiStep2Assumptions(ratings: RatingRecord[], distribution: ReturnType<typeof analyzeDistribution>, targetPrice: ReturnType<typeof analyzeTargetPrice>, recentTitles: string[]) {
  const ctx = buildContext(ratings, distribution, targetPrice, recentTitles);
  const result = await callLLM(
    "你是资深金融分析师。识别分析师研报中关键假设的冲突。只输出JSON。",
    `${ctx}\n\n任务：识别不同机构研报在关键变量上的判断差异。\n\n输出JSON格式：\n{"assumption_conflicts":[{"variable":"变量","bull_view":"看多方判断","bear_view":"看空方判断","impact":"意义"}]}\n最多5个。`
  );
  return (result || { assumption_conflicts: [] }) as Record<string, unknown>;
}

export async function aiStep3Data(ratings: RatingRecord[], distribution: ReturnType<typeof analyzeDistribution>, targetPrice: ReturnType<typeof analyzeTargetPrice>, recentTitles: string[]) {
  const ctx = buildContext(ratings, distribution, targetPrice, recentTitles);
  const result = await callLLM(
    "你是资深金融分析师。检测研报数据一致性和评级变动。只输出JSON。",
    `${ctx}\n\n任务：1)检测数据不一致 2)识别评级变动趋势。\n\n输出JSON格式：\n{"data_inconsistencies":[{"metric":"指标","range":"A vs B","severity":"高/中/低"}],"rating_changes":[{"org":"机构","direction":"上调/下调/维持","signal":"信号"}]}`
  );
  return (result || { data_inconsistencies: [], rating_changes: [] }) as Record<string, unknown>;
}

export async function aiStep4Summary(ratings: RatingRecord[], distribution: ReturnType<typeof analyzeDistribution>, targetPrice: ReturnType<typeof analyzeTargetPrice>, recentTitles: string[], stance: Record<string, unknown>, assumptions: Record<string, unknown>, dataCheck: Record<string, unknown>) {
  const ctx = buildContext(ratings, distribution, targetPrice, recentTitles);
  const prev = JSON.stringify({ 多空分析: stance, 假设冲突: assumptions, 数据检查: dataCheck });
  const result = await callLLM(
    "你是资深金融分析师。基于分歧分析给出投资建议。只输出JSON。",
    `${ctx}\n\n前序分析结果：\n${prev}\n\n任务：给出2-3句话综合投资建议。\n\n输出JSON格式：\n{"summary":"2-3句话投资建议，包含风险提示"}`
  );
  return (result || { summary: "综合分析暂不可用" }) as Record<string, unknown>;
}
