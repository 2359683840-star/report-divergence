// 研报数据获取 — 东方财富研报API直连
import { RATING_SCORE_MAP } from "./constants";

const EM_REPORT_API = "http://reportapi.eastmoney.com/report/list";

export interface RatingRecord {
  org: string; analyst: string; rating: string;
  rating_score: number; title: string; date: string;
  target_price: number | null; industry: string;
}

export async function fetchRatings(stockCode: string): Promise<RatingRecord[]> {
  try {
    const params = new URLSearchParams({
      code: stockCode, qType: "0", pageNo: "1", pageSize: "50",
      industry: "*", rating: "", ratingChange: "",
      beginTime: "2020-01-01", endTime: "2030-12-31",
    });
    const res = await fetch(`${EM_REPORT_API}?${params}`, { cache: "no-store" });
    const data = await res.json();
    const items = data?.data || [];
    if (!Array.isArray(items) || !items.length) return [];

    const ratings: RatingRecord[] = [];
    for (const item of items) {
      try {
        const rating = String(item.emRatingName || "").trim();
        ratings.push({
          org: String(item.orgSName || "").trim(),
          analyst: String(item.researcher || "").trim(),
          rating,
          rating_score: RATING_SCORE_MAP[rating] ?? 3,
          title: String(item.title || "").trim(),
          date: String(item.publishDate || "").slice(0, 10),
          target_price: item.indvAimPriceT ? Number(item.indvAimPriceT) : null,
          industry: String(item.indvInduName || "").trim(),
        });
      } catch { /* skip bad record */ }
    }
    ratings.sort((a, b) => b.date.localeCompare(a.date));
    return ratings.slice(0, 30);
  } catch {
    return [];
  }
}

export async function fetchRatingTimeline(stockCode: string) {
  const ratings = await fetchRatings(stockCode);
  if (!ratings.length) return { timeline: [], total_ratings: 0 };

  ratings.sort((a, b) => a.date.localeCompare(b.date));
  const prev: Record<string, number> = {};
  const timeline: { date: string; org: string; rating: string; rating_score: number; direction: string; title: string }[] = [];

  for (const r of ratings) {
    const prevScore = prev[r.org];
    let direction = "维持";
    if (prevScore === undefined) direction = "首次覆盖";
    else if (r.rating_score > prevScore) direction = "上调";
    else if (r.rating_score < prevScore) direction = "下调";
    timeline.push({ date: r.date, org: r.org, rating: r.rating, rating_score: r.rating_score, direction, title: r.title.slice(0, 60) });
    prev[r.org] = r.rating_score;
  }

  const changes = timeline.filter(t => t.direction !== "维持");
  const recent = timeline.filter(t => t.direction === "维持").slice(-3);
  return { timeline: [...changes, ...recent], total_ratings: ratings.length };
}
