// POST /api/analyze/ai/preview — AI预览（仅步骤1）
import { aiStep1Stance } from "@/lib/server/analysis";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ratings, distribution, target_price, recent_titles } = body;
    const result = await aiStep1Stance(ratings, distribution, target_price, recent_titles || []);
    if (result.error) return Response.json({ error: String(result.error) }, { status: 503 });
    return Response.json(result);
  } catch {
    return Response.json({ error: "AI分析失败" }, { status: 500 });
  }
}
