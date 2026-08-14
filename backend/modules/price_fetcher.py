"""
股价历史数据 — 新浪财经API
"""
import requests
import numpy as np

SINA_API = "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData"
HEADERS = {"Referer": "https://finance.sina.com.cn"}


def _sina_symbol(stock_code: str) -> str:
    """300750→sz300750, 600519→sh600519"""
    if stock_code.startswith(("6", "5", "9")):
        return f"sh{stock_code}"
    return f"sz{stock_code}"


def fetch_daily_kline(stock_code: str, days: int = 120) -> list[dict]:
    """获取日K线（最近N个交易日），来自新浪财经"""
    try:
        params = {
            "symbol": _sina_symbol(stock_code),
            "scale": "240",  # 日线
            "ma": "no",
            "datalen": str(min(days + 10, 150)),
        }
        r = requests.get(SINA_API, params=params, headers=HEADERS, timeout=8)
        r.raise_for_status()
        raw = r.json()
        if not raw or not isinstance(raw, list):
            return []

        klines = []
        for item in raw:
            klines.append({
                "date": item.get("day", ""),
                "open": float(item.get("open", 0)),
                "close": float(item.get("close", 0)),
                "high": float(item.get("high", 0)),
                "low": float(item.get("low", 0)),
                "volume": int(float(item.get("volume", 0))),
                "turnover": 0,
            })
        return klines[-days:] if len(klines) > days else klines
    except Exception:
        return []


def calc_volatility(klines: list[dict]) -> dict:
    if len(klines) < 5:
        return {"available": False}

    closes = [k["close"] for k in klines]
    returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
    daily_vol = float(np.std(returns))
    annual_vol = daily_vol * np.sqrt(252)
    half = len(returns) // 2
    recent_vol = float(np.std(returns[-half:])) if half > 0 else daily_vol
    earlier_vol = float(np.std(returns[:half])) if half > 0 else daily_vol
    price_change = (closes[-1] - closes[0]) / closes[0]

    return {
        "available": True,
        "daily_volatility": round(daily_vol * 100, 2),
        "annual_volatility": round(annual_vol * 100, 1),
        "recent_volatility": round(recent_vol * 100, 2),
        "earlier_volatility": round(earlier_vol * 100, 2),
        "vol_trend": "上升" if recent_vol > earlier_vol * 1.1 else ("下降" if recent_vol < earlier_vol * 0.9 else "持平"),
        "price_change_pct": round(price_change * 100, 1),
        "data_points": len(klines),
    }
