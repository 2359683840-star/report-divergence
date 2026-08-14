"""
预缓存热门股票研报数据 — 应对 akshare 不稳定
运行: python build_cache.py
"""
import json, os, time
from modules.data_fetcher import fetch_analyst_ratings
from datetime import datetime

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

STOCKS = [
    ("300750", "宁德时代"),
    ("600519", "贵州茅台"),
    ("002594", "比亚迪"),
    ("601012", "隆基绿能"),
    ("300274", "阳光电源"),
    ("600438", "通威股份"),
    ("601088", "中国神华"),
    ("000858", "五粮液"),
    ("002475", "立讯精密"),
    ("601318", "中国平安"),
]


def build():
    results = {}
    for code, name in STOCKS:
        print(f"  {name}({code})...", end=" ", flush=True)
        try:
            ratings = fetch_analyst_ratings(code)
            results[code] = {
                "name": name,
                "count": len(ratings),
                "ratings": ratings,
            }
            print(f"{len(ratings)} 条")
        except Exception as e:
            print(f"失败: {e}")
        time.sleep(1)

    cache_path = os.path.join(CACHE_DIR, "stock_cache.json")
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump({
            "updated_at": datetime.now().isoformat(),
            "stocks": results,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n缓存已保存: {cache_path} ({len(results)} 只股票)")


if __name__ == "__main__":
    build()
