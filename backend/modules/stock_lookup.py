"""
股票代码与名称互查
三级降级：本地缓存 → 东方财富API直连 → 硬编码后备
"""
import json
import os
import requests

CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "stock_map.json")
EM_API = "http://80.push2.eastmoney.com/api/qt/clist/get"

# 硬编码后备列表
FALLBACK_STOCKS = {
    "300750": {"code": "300750", "name": "宁德时代"},
    "600519": {"code": "600519", "name": "贵州茅台"},
    "002594": {"code": "002594", "name": "比亚迪"},
    "601012": {"code": "601012", "name": "隆基绿能"},
    "300274": {"code": "300274", "name": "阳光电源"},
    "600438": {"code": "600438", "name": "通威股份"},
    "601088": {"code": "601088", "name": "中国神华"},
    "000858": {"code": "000858", "name": "五粮液"},
    "002475": {"code": "002475", "name": "立讯精密"},
    "601318": {"code": "601318", "name": "中国平安"},
    "000001": {"code": "000001", "name": "平安银行"},
    "600036": {"code": "600036", "name": "招商银行"},
    "601899": {"code": "601899", "name": "紫金矿业"},
    "000333": {"code": "000333", "name": "美的集团"},
    "600900": {"code": "600900", "name": "长江电力"},
    "000002": {"code": "000002", "name": "万科A"},
    "600030": {"code": "600030", "name": "中信证券"},
    "601398": {"code": "601398", "name": "工商银行"},
    "000651": {"code": "000651", "name": "格力电器"},
    "002415": {"code": "002415", "name": "海康威视"},
    "000725": {"code": "000725", "name": "京东方A"},
    "600887": {"code": "600887", "name": "伊利股份"},
    "000568": {"code": "000568", "name": "泸州老窖"},
    "002714": {"code": "002714", "name": "牧原股份"},
    "600809": {"code": "600809", "name": "山西汾酒"},
    "300059": {"code": "300059", "name": "东方财富"},
    "000063": {"code": "000063", "name": "中兴通讯"},
    "600585": {"code": "600585", "name": "海螺水泥"},
    "601888": {"code": "601888", "name": "中国中免"},
    "600031": {"code": "600031", "name": "三一重工"},
    "002352": {"code": "002352", "name": "顺丰控股"},
    "300124": {"code": "300124", "name": "汇川技术"},
    "603259": {"code": "603259", "name": "药明康德"},
    "002230": {"code": "002230", "name": "科大讯飞"},
    "600050": {"code": "600050", "name": "中国联通"},
    "601728": {"code": "601728", "name": "中国电信"},
    "600941": {"code": "600941", "name": "中国移动"},
    "300760": {"code": "300760", "name": "迈瑞医疗"},
    "002459": {"code": "002459", "name": "晶澳科技"},
    "300014": {"code": "300014", "name": "亿纬锂能"},
    "002460": {"code": "002460", "name": "赣锋锂业"},
    "688981": {"code": "688981", "name": "中芯国际"},
    "601138": {"code": "601138", "name": "工业富联"},
    "002371": {"code": "002371", "name": "北方华创"},
    "300033": {"code": "300033", "name": "同花顺"},
    "000625": {"code": "000625", "name": "长安汽车"},
    "600104": {"code": "600104", "name": "上汽集团"},
    "002142": {"code": "002142", "name": "宁波银行"},
    "600276": {"code": "600276", "name": "恒瑞医药"},
    "000338": {"code": "000338", "name": "潍柴动力"},
    "600690": {"code": "600690", "name": "海尔智家"},
    "000100": {"code": "000100", "name": "TCL科技"},
}


def _fetch_from_eastmoney() -> dict[str, dict] | None:
    """从东方财富API逐页拉取全A股列表（~5500只），失败返回None"""
    stock_map = {}
    page = 1
    page_size = 500
    try:
        while True:
            params = {
                "pn": str(page), "pz": str(page_size),
                "po": "1", "np": "1", "fltt": "2", "invt": "2",
                "fid": "f3",
                "fs": "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",
                "fields": "f12,f14",
            }
            r = requests.get(EM_API, params=params, timeout=8)
            r.raise_for_status()
            data = r.json()
            items = data.get("data", {}).get("diff", [])
            if not items:
                break
            for item in items:
                code = str(item.get("f12", "")).strip()
                name = str(item.get("f14", "")).strip()
                if code and name:
                    stock_map[code] = {"code": code, "name": name}
            total = data.get("data", {}).get("total", 0)
            if page * page_size >= total:
                break
            page += 1
        return stock_map if stock_map else None
    except Exception:
        return None


def _load_stock_map() -> dict[str, dict]:
    """加载股票映射，永不报错"""
    # 1. 本地缓存
    if os.path.exists(CACHE_PATH):
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            if len(data) > 100:
                return data
        except Exception:
            pass

    # 2. 东方财富在线API
    online = _fetch_from_eastmoney()
    if online and len(online) > 500:
        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        try:
            with open(CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(online, f, ensure_ascii=False)
        except Exception:
            pass
        return online

    # 3. 硬编码后备
    return dict(FALLBACK_STOCKS)


def resolve_stock(keyword: str) -> dict | None:
    """解析用户输入（代码或名称），返回 {"code": str, "name": str} 或 None"""
    stock_map = _load_stock_map()
    keyword = keyword.strip()

    if keyword.isdigit():
        if keyword in stock_map:
            return stock_map[keyword]
        for z in ["00000", "0000", "000", "00", "0"]:
            padded = (z + keyword)[-6:]
            if padded in stock_map:
                return stock_map[padded]
        return None

    for info in stock_map.values():
        if info["name"] == keyword:
            return info
    matches = [info for info in stock_map.values() if keyword in info["name"]]
    if len(matches) == 1:
        return matches[0]
    return None


def search_stocks(keyword: str, limit: int = 10) -> list[dict]:
    """模糊搜索股票"""
    stock_map = _load_stock_map()
    keyword = keyword.strip()
    results = []
    for info in stock_map.values():
        if keyword in info["name"] or keyword in info["code"]:
            results.append(info)
            if len(results) >= limit:
                break
    return results
