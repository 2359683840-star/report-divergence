"""
行业对比 — 同行业股票分歧分数排名
"""
from modules.data_fetcher import fetch_with_fallback
from modules.divergence_analyzer import calculate_divergence_score, get_divergence_level, analyze_rating_distribution

# 行业 → 同业股票（代码, 名称）
INDUSTRY_PEERS = {
    "电池": [("300750","宁德时代"),("300014","亿纬锂能"),("002074","国轩高科"),("300207","欣旺达"),("002709","天赐材料")],
    "白酒": [("600519","贵州茅台"),("000858","五粮液"),("000568","泸州老窖"),("600809","山西汾酒"),("002304","洋河股份")],
    "汽车": [("002594","比亚迪"),("601127","赛力斯"),("000625","长安汽车"),("601633","长城汽车"),("600104","上汽集团")],
    "光伏": [("601012","隆基绿能"),("300274","阳光电源"),("600438","通威股份"),("688599","天合光能"),("002459","晶澳科技")],
    "光伏设备": [("601012","隆基绿能"),("300274","阳光电源"),("600438","通威股份"),("688599","天合光能"),("002459","晶澳科技")],
    "煤炭": [("601088","中国神华"),("601225","陕西煤业"),("600188","兖矿能源"),("601898","中煤能源"),("600985","淮北矿业")],
    "煤炭开采": [("601088","中国神华"),("601225","陕西煤业"),("600188","兖矿能源"),("601898","中煤能源"),("600985","淮北矿业")],
    "保险": [("601318","中国平安"),("601628","中国人寿"),("601601","中国太保"),("601336","新华保险"),("600030","中国人保")],
    "保险Ⅱ": [("601318","中国平安"),("601628","中国人寿"),("601601","中国太保"),("601336","新华保险"),("600030","中国人保")],
    "消费电子": [("002475","立讯精密"),("002241","歌尔股份"),("300433","蓝思科技"),("000725","京东方A"),("300115","长盈精密")],
    "银行": [("600036","招商银行"),("601398","工商银行"),("002142","宁波银行"),("601166","兴业银行"),("600000","浦发银行")],
    "半导体": [("688981","中芯国际"),("002371","北方华创"),("603501","韦尔股份"),("603986","兆易创新"),("688012","中微公司")],
}

# 行业名归一化
INDUSTRY_ALIASES = {
    "电池": "电池", "锂电池": "电池", "电池Ⅱ": "电池",
    "白酒": "白酒", "白酒Ⅱ": "白酒",
    "汽车": "汽车", "汽车整车": "汽车",
    "光伏": "光伏", "光伏设备": "光伏",
    "煤炭": "煤炭", "煤炭开采": "煤炭",
    "保险": "保险", "保险Ⅱ": "保险",
    "消费电子": "消费电子",
    "银行": "银行",
    "半导体": "半导体", "半导体设备": "半导体",
}


def _normalize_industry(raw: str) -> str:
    return INDUSTRY_ALIASES.get(raw.strip(), raw.strip())


def get_industry(stock_code: str, ratings: list[dict]) -> str:
    """从研报数据推断行业"""
    for r in ratings:
        ind = _normalize_industry(r.get("industry", ""))
        if ind:
            return ind
    return ""


def compare_in_industry(stock_code: str, stock_name: str, ratings: list[dict]) -> dict:
    """
    计算该股票及其同业的分歧分数排名
    返回: {industry, peers: [{code, name, score, level, total, is_current}]}
    """
    industry = get_industry(stock_code, ratings)
    if not industry:
        return {"industry": industry, "peers": [], "available": False, "reason": "无法识别行业"}

    peers = INDUSTRY_PEERS.get(industry, [])
    if not peers:
        # 兜底：如果行业不在映射中，返回该股票本身
        score = calculate_divergence_score(ratings)
        return {
            "industry": industry,
            "peers": [{"code": stock_code, "name": stock_name, "score": round(score, 1), "level": get_divergence_level(score)["level"], "total": len(ratings), "is_current": True}],
            "available": True,
        }

    results = []
    # 先处理当前股票
    score = calculate_divergence_score(ratings)
    results.append({"code": stock_code, "name": stock_name, "score": round(score, 1), "level": get_divergence_level(score)["level"], "total": len(ratings), "is_current": True})

    # 处理同业
    for code, name in peers:
        if code == stock_code:
            continue
        try:
            peer_ratings, _, _ = fetch_with_fallback(code)
            if len(peer_ratings) < 2:
                continue
            peer_score = calculate_divergence_score(peer_ratings)
            results.append({
                "code": code, "name": name,
                "score": round(peer_score, 1),
                "level": get_divergence_level(peer_score)["level"],
                "total": len(peer_ratings),
                "is_current": False,
            })
        except Exception:
            continue

    # 按分数降序
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"industry": industry, "peers": results, "available": True}
