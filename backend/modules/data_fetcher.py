"""
研报数据获取 — 东方财富研报API直连（替代akshare）
"""
import json
import os
import requests
from config import RATING_SCORE_MAP, AKSHARE_TIMEOUT

EM_REPORT_API = "http://reportapi.eastmoney.com/report/list"

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "cache")
CACHE_PATH = os.path.join(CACHE_DIR, "stock_cache.json")


# ─── 缓存 ───
def load_cache() -> dict:
    if not os.path.exists(CACHE_PATH):
        return {}
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("stocks", {})
    except Exception:
        return {}


def get_cached_ratings(stock_code: str) -> list[dict] | None:
    cache = load_cache()
    if stock_code in cache:
        return cache[stock_code].get("ratings", [])
    return None


# ─── 东财研报API直连 ───
def fetch_ratings_live(stock_code: str) -> list[dict]:
    """从东方财富研报API获取分析师评级"""
    params = {
        "code": stock_code,
        "qType": "0",
        "pageNo": "1",
        "pageSize": "50",
        "industry": "*",
        "rating": "",
        "ratingChange": "",
        "beginTime": "2020-01-01",
        "endTime": "2030-12-31",
    }
    r = requests.get(EM_REPORT_API, params=params, timeout=AKSHARE_TIMEOUT)
    r.raise_for_status()
    data = r.json().get("data", [])
    if not data:
        return []

    ratings = []
    for item in data:
        try:
            rating = str(item.get("emRatingName", "") or "").strip()
            org = str(item.get("orgSName", "") or "").strip()
            title = str(item.get("title", "") or "").strip()
            date = str(item.get("publishDate", "") or "")[:10]
            industry = str(item.get("indvInduName", "") or "").strip()
            analyst = str(item.get("researcher", "") or "").strip()

            # 目标价（可能为空）
            target_price = None
            tp = item.get("indvAimPriceT")
            if tp:
                try:
                    target_price = float(tp)
                except (ValueError, TypeError):
                    target_price = None

            ratings.append({
                "org": org,
                "analyst": analyst,
                "rating": rating,
                "rating_score": RATING_SCORE_MAP.get(rating, 3),
                "title": title,
                "date": date,
                "target_price": target_price,
                "industry": industry,
            })
        except Exception:
            continue

    ratings.sort(key=lambda x: x["date"], reverse=True)
    return ratings[:30]  # 最多30条


# ─── 带降级的统一入口 ───
def fetch_with_fallback(stock_code: str) -> tuple[list[dict], str, str | None]:
    """获取研报数据，自动降级。返回 (ratings, source, cache_time)"""
    # 1. 东财API直连
    try:
        ratings = fetch_ratings_live(stock_code)
        if ratings:
            return ratings, "live", None
    except Exception:
        pass

    # 2. 本地缓存
    cached = get_cached_ratings(stock_code)
    if cached:
        updated = ""
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                updated = json.load(f).get("updated_at", "")[:10]
        except Exception:
            pass
        return cached, "cache", updated

    return [], "none", None


# 兼容旧接口
def fetch_analyst_ratings(stock_code: str) -> list[dict]:
    ratings, _, _ = fetch_with_fallback(stock_code)
    return ratings
