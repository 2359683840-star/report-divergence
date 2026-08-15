// GET /api/price/[code] — 股价K线 + 波动率
import { fetchDailyKline, calcVolatility } from "@/lib/server/price";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days")) || 120;

  const klines = await fetchDailyKline(code, days);
  if (!klines.length) return Response.json({ detail: "暂无股价数据" }, { status: 404 });

  const volatility = calcVolatility(klines);
  return Response.json({ klines, volatility });
}
