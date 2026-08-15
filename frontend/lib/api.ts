// API 调用封装 — 后端已改写为 Next.js API 路由，同源调用

import type { DivergenceResult } from "../types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { detail?: string }).detail || res.statusText;
    throw new Error(detail);
  }
  return res.json();
}

export async function analyzeStock(keyword: string): Promise<DivergenceResult> {
  return request<DivergenceResult>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ keyword }),
  });
}

// ─── 股价数据 ───
export interface KlineData {
  date: string; open: number; close: number;
  high: number; low: number; volume: number; turnover: number;
}
export interface VolatilityData {
  available: boolean;
  daily_volatility: number;
  annual_volatility: number;
  recent_volatility: number;
  earlier_volatility: number;
  vol_trend: string;
  price_change_pct: number;
  data_points: number;
}

export async function fetchPriceData(stockCode: string): Promise<{ klines: KlineData[]; volatility: VolatilityData }> {
  return request(`/api/price/${stockCode}?days=120`);
}

export interface TimelineEntry {
  date: string; org: string; rating: string;
  rating_score: number; direction: string; title: string;
}
export async function fetchRatingTimeline(stockCode: string): Promise<{ timeline: TimelineEntry[]; total_ratings: number }> {
  return request(`/api/rating-timeline/${stockCode}`);
}

// ─── 行业对比 ───
export interface IndustryPeer {
  code: string; name: string; score: number;
  level: string; total: number; is_current: boolean;
}
export async function fetchIndustryCompare(stockCode: string): Promise<{ industry: string; peers: IndustryPeer[] }> {
  return request(`/api/industry-compare/${stockCode}`);
}

// ─── AI预览（自动触发，仅步骤1） ───
export interface StancePreview {
  core_tension: string;
  bull_orgs: string[];
  bull_case: string[];
  bear_orgs: string[];
  bear_case: string[];
  error?: string;
}

export async function previewAIAnalysis(
  ratings: DivergenceResult["ratings"],
  distribution: DivergenceResult["distribution"],
  targetPrice: DivergenceResult["target_price"],
  recentTitles: string[]
): Promise<StancePreview> {
  return request<StancePreview>("/api/analyze/ai/preview", {
    method: "POST",
    body: JSON.stringify({
      stock_code: "",
      ratings,
      distribution,
      target_price: targetPrice,
      recent_titles: recentTitles,
    }),
  });
}

// ─── 流式AI深度分析（手动触发，4步完整） ───
export interface SSEEvent {
  step: "stance" | "assumptions" | "data_check" | "summary";
  label: string;
  data: Record<string, unknown>;
}

export async function* streamAIAnalysis(
  ratings: DivergenceResult["ratings"],
  distribution: DivergenceResult["distribution"],
  targetPrice: DivergenceResult["target_price"],
  recentTitles: string[]
): AsyncGenerator<SSEEvent> {
  const res = await fetch("/api/analyze/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stock_code: "",
      ratings,
      distribution,
      target_price: targetPrice,
      recent_titles: recentTitles,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || "AI分析请求失败");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("无法读取响应流");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const json = line.slice(6);
        try {
          yield JSON.parse(json) as SSEEvent;
        } catch {
          // skip malformed
        }
      }
    }
  }
}
