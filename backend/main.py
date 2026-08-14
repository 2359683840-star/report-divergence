"""
研报分歧探测器 — FastAPI 后端
"""
import json
import time
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from modules.models import (
    AnalyzeRequest, DivergenceResult, AIAnalysisRequest,
    StockInfo, RatingRecord, RatingDistribution, TargetPriceAnalysis,
)
from modules.stock_lookup import resolve_stock, search_stocks
from modules.data_fetcher import fetch_with_fallback
from modules.price_fetcher import fetch_daily_kline, calc_volatility
from modules.industry_compare import compare_in_industry
from modules.divergence_analyzer import (
    calculate_divergence_score, get_divergence_level,
    analyze_rating_distribution, analyze_target_price,
    run_ai_analysis_stream, step1_stance,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("divergence")

app = FastAPI(
    title="研报分歧探测器 API",
    description="股票分析师评级分歧分析",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """请求日志 + 耗时追踪"""
    start = time.time()
    response = await call_next(request)
    duration = (time.time() - start) * 1000
    status = response.status_code
    path = request.url.path
    if status >= 400:
        logger.warning(f"{request.method} {path} -> {status} ({duration:.0f}ms)")
    else:
        logger.info(f"{request.method} {path} -> {status} ({duration:.0f}ms)")
    return response


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze", response_model=DivergenceResult)
def analyze(req: AnalyzeRequest):
    """核心API：输入股票代码/名称，返回分歧分析结果"""
    # 1. 解析股票
    stock = resolve_stock(req.keyword)
    if stock is None:
        # 尝试模糊搜索
        suggestions = search_stocks(req.keyword)
        detail = ""
        if suggestions:
            items = [f"{s['code']} {s['name']}" for s in suggestions[:5]]
            detail = f"你是否想搜: {', '.join(items)}"
        raise HTTPException(
            status_code=404,
            detail=f"未找到股票 '{req.keyword}'。{detail}",
        )

    # 2. 拉取研报数据（自动降级到缓存）
    ratings, source, cache_updated = fetch_with_fallback(stock["code"])

    if len(ratings) == 0:
        raise HTTPException(
            status_code=404,
            detail=f"{stock['name']}({stock['code']}) 暂无研报覆盖",
        )
    if len(ratings) == 1:
        raise HTTPException(
            status_code=400,
            detail=f"{stock['name']} 仅有1份研报，分析分歧需要至少2家机构的独立观点",
        )

    # 3. 计算分歧
    score = calculate_divergence_score(ratings)
    level_info = get_divergence_level(score)
    distribution = analyze_rating_distribution(ratings)
    tp_analysis = analyze_target_price(ratings)
    recent_titles = [r["title"][:80] for r in ratings[:5]]

    # 4. 组装响应
    return DivergenceResult(
        score=round(score, 1),
        level=level_info["level"],
        level_desc=level_info["level_desc"],
        stock=StockInfo(**stock),
        ratings=[RatingRecord(**r) for r in ratings],
        distribution=RatingDistribution(**distribution),
        target_price=TargetPriceAnalysis(**tp_analysis),
        recent_titles=recent_titles,
        source=source,
        cache_updated_at=cache_updated,
    )


@app.post("/api/analyze/ai/preview")
def analyze_ai_preview(req: AIAnalysisRequest):
    """AI预览：仅运行步骤1（多空阵营识别），搜索后自动触发"""
    result = step1_stance(
        [r.model_dump() for r in req.ratings],
        req.distribution.model_dump(),
        req.target_price.model_dump(),
        req.recent_titles,
    )
    return result


@app.post("/api/analyze/ai")
async def analyze_with_ai_stream(req: AIAnalysisRequest):
    """AI深度分析（流式SSE）：分4步逐步返回分析结果"""
    def generate():
        events = run_ai_analysis_stream(
            [r.model_dump() for r in req.ratings],
            req.distribution.model_dump(),
            req.target_price.model_dump(),
            req.recent_titles,
        )
        for event in events:
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/price/{stock_code}")
def get_price_data(stock_code: str, days: int = 120):
    """获取股价K线数据 + 波动率指标"""
    try:
        klines = fetch_daily_kline(stock_code, days)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"获取股价数据失败: {e}")

    if not klines:
        raise HTTPException(status_code=404, detail="暂无股价数据")

    vol = calc_volatility(klines)
    return {"klines": klines, "volatility": vol}


@app.get("/api/industry-compare/{stock_code}")
def get_industry_compare(stock_code: str):
    """行业分歧对比"""
    ratings, _, _ = fetch_with_fallback(stock_code)
    if not ratings:
        raise HTTPException(status_code=404, detail="暂无研报数据")

    # 解析股票名
    from modules.stock_lookup import resolve_stock
    stock = resolve_stock(stock_code)
    name = stock["name"] if stock else stock_code

    result = compare_in_industry(stock_code, name, ratings)
    if not result["available"]:
        raise HTTPException(status_code=404, detail=result.get("reason", "无法对比"))
    return result


@app.get("/api/rating-timeline/{stock_code}")
def get_rating_timeline(stock_code: str):
    """获取评级变动时间线（从已有研报数据中提取）"""
    ratings, source, _ = fetch_with_fallback(stock_code)
    if not ratings:
        raise HTTPException(status_code=404, detail="暂无研报数据")

    # 按日期排序，标记评级变化
    ratings.sort(key=lambda x: x["date"])
    timeline = []
    prev_org_rating = {}
    for r in ratings:
        org = r["org"]
        key = org
        prev = prev_org_rating.get(key)
        direction = "维持"
        if prev is None:
            direction = "首次覆盖"
        elif r["rating_score"] > prev:
            direction = "上调"
        elif r["rating_score"] < prev:
            direction = "下调"
        timeline.append({
            "date": r["date"],
            "org": org,
            "rating": r["rating"],
            "rating_score": r["rating_score"],
            "direction": direction,
            "title": r["title"][:60],
        })
        prev_org_rating[key] = r["rating_score"]

    # 只返回有变动的 + 最近3条维持
    changes = [t for t in timeline if t["direction"] != "维持"]
    recent = [t for t in timeline if t["direction"] == "维持"][-3:]
    return {"timeline": changes + recent, "total_ratings": len(ratings)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
