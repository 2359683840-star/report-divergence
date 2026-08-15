// GET /api/rating-timeline/[code] — 评级变动时间线
import { fetchRatingTimeline } from "@/lib/server/reports";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await fetchRatingTimeline(code);
  if (!result.total_ratings) return Response.json({ detail: "暂无研报数据" }, { status: 404 });
  return Response.json(result);
}
