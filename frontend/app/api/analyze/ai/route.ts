// POST /api/analyze/ai — AI深度分析（流式SSE，4步）
import { aiStep1Stance, aiStep2Assumptions, aiStep3Data, aiStep4Summary } from "@/lib/server/analysis";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "请求格式错误" }, { status: 400 });
  }

  const ratings = body.ratings as Record<string, unknown>[];
  const distribution = body.distribution as never;
  const targetPrice = body.target_price as never;
  const recentTitles = (body.recent_titles as string[]) || [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        // 步骤1
        send({ step: "stance", label: "识别多空阵营与核心分歧", data: await aiStep1Stance(ratings as never, distribution, targetPrice, recentTitles) });
        // 步骤2
        const s2 = await aiStep2Assumptions(ratings as never, distribution, targetPrice, recentTitles);
        send({ step: "assumptions", label: "提取关键假设冲突", data: s2 });
        // 步骤3
        const s3 = await aiStep3Data(ratings as never, distribution, targetPrice, recentTitles);
        send({ step: "data_check", label: "检测数据一致性与评级变动", data: s3 });
        // 步骤4
        const s1 = await aiStep1Stance(ratings as never, distribution, targetPrice, recentTitles);
        const s4 = await aiStep4Summary(ratings as never, distribution, targetPrice, recentTitles, s1, s2, s3);
        send({ step: "summary", label: "生成综合投资建议", data: s4 });
      } catch (e) {
        send({ step: "error", label: "分析失败", data: { error: String(e) } });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
