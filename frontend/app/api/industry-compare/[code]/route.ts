// GET /api/industry-compare/[code] — 行业分歧对比
import { resolveStock } from "@/lib/server/stock";
import { fetchRatings } from "@/lib/server/reports";
import { compareInIndustry } from "@/lib/server/industry";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const ratings = await fetchRatings(code);
  if (!ratings.length) return Response.json({ detail: "暂无研报数据" }, { status: 404 });

  const stock = await resolveStock(code);
  const name = stock?.name || code;

  const result = await compareInIndustry(code, name, ratings);
  if (!result.available) return Response.json({ detail: result.reason || "无法对比" }, { status: 404 });
  return Response.json(result);
}
