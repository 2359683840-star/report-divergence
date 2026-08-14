"""
分歧分析引擎 — 量化分析师评级分歧程度

设计决策:
- 规则层（本模块）：统计学计算，确定性，秒级返回
- AI层（Phase 2）：LLM语义分析，深入但需API调用
"""
import json
import numpy as np
from collections import Counter
from config import DIVERGENCE_LEVELS, RATING_SCORE_MAP
from openai import OpenAI
from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL


def calculate_divergence_score(ratings: list[dict]) -> float:
    """
    计算分歧分数 (0-100)。
    算法: rating_score 的标准差 / 理论最大标准差(2) × 100

    0 = 所有机构评级一致
    50 = 评级分散在相邻2-3档
    100 = 同时出现买入和卖出（极端分歧）
    """
    if len(ratings) < 2:
        return 0.0

    scores = [r.get("rating_score", 3) for r in ratings]
    std = float(np.std(scores))
    # 理论最大标准差: (5-1)/2 = 2.0
    return min(100.0, (std / 2.0) * 100)


def get_divergence_level(score: float) -> dict:
    """根据分歧分数返回等级信息"""
    for low, high, level, desc in DIVERGENCE_LEVELS:
        if low <= score < high:
            return {"level": level, "level_desc": desc}
    return {"level": "未知", "level_desc": ""}


def analyze_rating_distribution(ratings: list[dict]) -> dict:
    """统计评级分布"""
    counter = Counter(r.get("rating", "未知") for r in ratings)
    bullish = sum(1 for r in ratings if r.get("rating_score", 3) >= 4)
    neutral = sum(1 for r in ratings if r.get("rating_score", 3) == 3)
    bearish = sum(1 for r in ratings if r.get("rating_score", 3) <= 2)

    return {
        "distribution": dict(counter.most_common()),
        "total": len(ratings),
        "bullish_count": bullish,
        "neutral_count": neutral,
        "bearish_count": bearish,
        "bullish_ratio": round(bullish / max(len(ratings), 1), 3),
        "unique_orgs": len(set(r.get("org", "") for r in ratings)),
    }


def analyze_target_price(ratings: list[dict]) -> dict:
    """分析目标价：范围、中位数、价差"""
    prices = [
        r.get("target_price") for r in ratings
        if r.get("target_price") is not None
    ]
    if len(prices) < 2:
        return {"available": False}

    prices = [float(p) for p in prices]
    median = float(np.median(prices))
    p_min = float(min(prices))
    p_max = float(max(prices))
    spread_pct = (p_max - p_min) / median * 100 if median > 0 else 0

    if spread_pct < 20:
        spread_level = "窄"
    elif spread_pct < 50:
        spread_level = "中等"
    else:
        spread_level = "宽"

    return {
        "available": True,
        "count": len(prices),
        "min": p_min,
        "max": p_max,
        "median": median,
        "mean": round(float(np.mean(prices)), 2),
        "std": round(float(np.std(prices)), 2),
        "spread_pct": round(spread_pct, 1),
        "spread_level": spread_level,
    }


def _build_context(
    ratings: list[dict],
    distribution: dict,
    target_price: dict,
    recent_titles: list[str],
) -> str:
    """构建所有分析步骤共用的上下文"""
    dist_str = "、".join(
        f"{k}: {v}份" for k, v in distribution["distribution"].items()
    )
    orgs = list(set(r["org"] for r in ratings))[:8]

    tp_line = ""
    if target_price.get("available"):
        tp = target_price
        tp_line = (
            f"- 目标价: {tp['min']} ~ {tp['max']}元, "
            f"中位数{tp['median']}元, 价差{tp['spread_pct']}%({tp['spread_level']})"
        )

    return f"""## 评级分布
共 {distribution['total']} 份研报，{distribution['unique_orgs']} 家机构
评级: {dist_str}
看多/中性/看空: {distribution['bullish_count']}/{distribution['neutral_count']}/{distribution['bearish_count']}

## 目标价
{tp_line or '目标价数据不足'}

## 参与机构
{', '.join(orgs)}

## 最近研报
{chr(10).join(f'{i+1}. {t}' for i, t in enumerate(recent_titles[:5]))}"""


def _call_llm(system: str, user: str) -> dict:
    """调用LLM并解析JSON返回"""
    if not LLM_API_KEY:
        return None

    client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.0,
        )
        content = resp.choices[0].message.content
        # 解析JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        return json.loads(content)
    except Exception as e:
        return {"error": str(e)}


# ─── 四个分析步骤 ───

STEP1_SYSTEM = "你是资深金融分析师。识别多空阵营和核心分歧。只输出JSON。"

def step1_stance(
    ratings: list[dict], distribution: dict,
    target_price: dict, recent_titles: list[str],
) -> dict:
    """步骤1: 多空阵营识别 + 核心分歧"""
    ctx = _build_context(ratings, distribution, target_price, recent_titles)
    user = f"""{ctx}

任务：识别分析师的多空立场和核心分歧。

输出JSON格式：
{{
    "core_tension": "一句话概括最核心的分歧（20字以内）",
    "bull_orgs": ["看多机构1", "看多机构2"],
    "bull_case": ["看多论点1", "看多论点2", "看多论点3"],
    "bear_orgs": ["看空/谨慎机构1"],
    "bear_case": ["看空论点1", "看空论点2", "看多论点3"]
}}"""
    result = _call_llm(STEP1_SYSTEM, user)
    return result or {"core_tension": "分析暂不可用", "bull_orgs": [], "bull_case": [], "bear_orgs": [], "bear_case": []}


STEP2_SYSTEM = "你是资深金融分析师。识别分析师研报中关键假设的冲突。只输出JSON。"

def step2_assumptions(
    ratings: list[dict], distribution: dict,
    target_price: dict, recent_titles: list[str],
) -> dict:
    """步骤2: 关键假设冲突"""
    ctx = _build_context(ratings, distribution, target_price, recent_titles)
    user = f"""{ctx}

任务：识别不同机构研报在关键变量上的判断差异。

输出JSON格式：
{{
    "assumption_conflicts": [
        {{"variable": "关键变量名", "bull_view": "看多方判断", "bear_view": "看空方判断", "impact": "对投资决策的意义"}}
    ]
}}
最多列出5个关键冲突。如无明显冲突，返回空数组。"""
    result = _call_llm(STEP2_SYSTEM, user)
    return result or {"assumption_conflicts": []}


STEP3_SYSTEM = "你是资深金融分析师。检测研报数据一致性和评级变动。只输出JSON。"

def step3_data(
    ratings: list[dict], distribution: dict,
    target_price: dict, recent_titles: list[str],
) -> dict:
    """步骤3: 数据一致性 + 评级变动"""
    ctx = _build_context(ratings, distribution, target_price, recent_titles)
    user = f"""{ctx}

任务：
1. 检测不同研报引用的数据有无明显出入
2. 识别近期评级变动趋势

输出JSON格式：
{{
    "data_inconsistencies": [
        {{"metric": "指标名", "range": "A机构说X vs B机构说Y", "severity": "高/中/低"}}
    ],
    "rating_changes": [
        {{"org": "机构名", "direction": "上调/下调/首次覆盖/维持", "signal": "反映了什么信号"}}
    ]
}}
如无数据不一致，返回空数组。"""
    result = _call_llm(STEP3_SYSTEM, user)
    return result or {"data_inconsistencies": [], "rating_changes": []}


STEP4_SYSTEM = "你是资深金融分析师。基于分歧分析给出投资建议。只输出JSON。"

def step4_summary(
    ratings: list[dict], distribution: dict,
    target_price: dict, recent_titles: list[str],
    stance: dict, assumptions: dict, data_check: dict,
) -> dict:
    """步骤4: 综合总结（基于前3步结果）"""
    ctx = _build_context(ratings, distribution, target_price, recent_titles)
    # 把前3步结果打包给LLM
    prev = json.dumps({
        "多空分析": stance,
        "假设冲突": assumptions,
        "数据检查": data_check,
    }, ensure_ascii=False)

    user = f"""{ctx}

前序分析结果：
{prev}

任务：基于以上分析，给出2-3句话的综合投资建议。

输出JSON格式：
{{"summary": "2-3句话投资建议，包含风险提示"}}"""
    result = _call_llm(STEP4_SYSTEM, user)
    return result or {"summary": "综合分析暂不可用"}


# ─── 流式分析 generator ───

def run_ai_analysis_stream(
    ratings: list[dict],
    distribution: dict,
    target_price: dict,
    recent_titles: list[str],
) -> list[dict]:
    """
    分步执行AI分析，每一步返回一个事件。
    设计决策: 拆成4步而非1次调用——
    (1) 用户可以逐步看到分析结果，等待变期待
    (2) 每步prompt更聚焦，分析质量更高
    (3) 单步失败不影响其他步骤
    """
    if not LLM_API_KEY:
        return [{"step": "error", "data": {"error": "API Key 未配置"}}]

    events = []

    # 步骤1: 多空阵营
    s1 = step1_stance(ratings, distribution, target_price, recent_titles)
    events.append({"step": "stance", "label": "识别多空阵营与核心分歧", "data": s1})

    # 步骤2: 假设冲突
    s2 = step2_assumptions(ratings, distribution, target_price, recent_titles)
    events.append({"step": "assumptions", "label": "提取关键假设冲突", "data": s2})

    # 步骤3: 数据一致性
    s3 = step3_data(ratings, distribution, target_price, recent_titles)
    events.append({"step": "data_check", "label": "检测数据一致性与评级变动", "data": s3})

    # 步骤4: 总结
    s4 = step4_summary(ratings, distribution, target_price, recent_titles, s1, s2, s3)
    events.append({"step": "summary", "label": "生成综合投资建议", "data": s4})

    return events
