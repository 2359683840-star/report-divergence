"""
Pydantic 数据模型 — 定义所有API请求/响应结构
"""
from pydantic import BaseModel


# ─── 请求模型 ───
class AnalyzeRequest(BaseModel):
    keyword: str  # 股票代码或名称


# ─── 响应模型 ───
class StockInfo(BaseModel):
    code: str
    name: str


class RatingRecord(BaseModel):
    org: str            # 机构名称
    analyst: str        # 分析师
    rating: str         # 评级（买入/增持/中性等）
    rating_score: int   # 评级量化分（5-1）
    title: str          # 研报标题
    date: str           # 发布日期
    target_price: float | None = None  # 目标价（可能缺失）
    industry: str = ""  # 行业


class RatingDistribution(BaseModel):
    distribution: dict[str, int]  # {"买入": 8, "增持": 4, ...}
    total: int
    bullish_count: int
    neutral_count: int
    bearish_count: int
    bullish_ratio: float
    unique_orgs: int


class TargetPriceAnalysis(BaseModel):
    available: bool
    count: int = 0
    min: float = 0
    max: float = 0
    median: float = 0
    mean: float = 0
    std: float = 0
    spread_pct: float = 0
    spread_level: str = ""


class DivergenceResult(BaseModel):
    score: float                            # 分歧分数 0-100
    level: str                              # 低/中/高/极度
    level_desc: str                         # 等级描述
    stock: StockInfo                        # 股票信息
    ratings: list[RatingRecord]             # 原始评级列表
    distribution: RatingDistribution        # 评级分布
    target_price: TargetPriceAnalysis       # 目标价分析
    recent_titles: list[str]                # 最近研报标题（供AI分析用）
    source: str = "live"                    # 数据来源: "live" | "cache" | "none"
    cache_updated_at: str | None = None     # 缓存更新时间（仅cache模式）


class AIAnalysisRequest(BaseModel):
    stock_code: str
    ratings: list[RatingRecord]
    distribution: RatingDistribution
    target_price: TargetPriceAnalysis
    recent_titles: list[str]


class AIAnalysisResult(BaseModel):
    core_tension: str
    bull_case: list[str]
    bear_case: list[str]
    assumption_conflicts: list[dict]
    data_inconsistencies: list[dict]
    rating_changes: list[dict]
    summary: str


class ErrorResponse(BaseModel):
    error: str
    detail: str = ""
