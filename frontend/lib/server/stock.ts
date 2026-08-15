// 股票代码/名称互查 — 先查后备表，再查东方财富API
import { FALLBACK_STOCKS } from "./constants";

const EM_LIST_API = "http://80.push2.eastmoney.com/api/qt/clist/get";

export interface StockInfo { code: string; name: string; }

let stockMapCache: Record<string, StockInfo> | null = null;

async function fetchStockMap(): Promise<Record<string, StockInfo>> {
  // 单次大请求拉全A股（pz=6000 一页拿完）
  try {
    const params = new URLSearchParams({
      pn: "1", pz: "6000", po: "1", np: "1", fltt: "2", invt: "2", fid: "f3",
      fs: "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",
      fields: "f12,f14",
    });
    const res = await fetch(`${EM_LIST_API}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const items = data?.data?.diff || [];
    const map: Record<string, StockInfo> = {};
    for (const item of items) {
      const code = String(item.f12 || "").trim();
      const name = String(item.f14 || "").trim();
      if (code && name) map[code] = { code, name };
    }
    return map;
  } catch {
    return {};
  }
}

async function getStockMap(): Promise<Record<string, StockInfo>> {
  if (stockMapCache && Object.keys(stockMapCache).length > 100) return stockMapCache;
  const online = await fetchStockMap();
  if (online && Object.keys(online).length > 100) {
    stockMapCache = online;
    return online;
  }
  return { ...FALLBACK_STOCKS };
}

export async function resolveStock(keyword: string): Promise<StockInfo | null> {
  const kw = keyword.trim();

  // 1. 先查硬编码后备（快，无网络）
  if (/^\d+$/.test(kw)) {
    if (FALLBACK_STOCKS[kw]) return FALLBACK_STOCKS[kw];
    for (const z of ["00000", "0000", "000", "00", "0"]) {
      const padded = (z + kw).slice(-6);
      if (FALLBACK_STOCKS[padded]) return FALLBACK_STOCKS[padded];
    }
  } else {
    for (const info of Object.values(FALLBACK_STOCKS)) {
      if (info.name === kw) return info;
    }
  }

  // 2. 查东方财富API
  const map = await getStockMap();
  if (/^\d+$/.test(kw)) {
    if (map[kw]) return map[kw];
    for (const z of ["00000", "0000", "000", "00", "0"]) {
      const padded = (z + kw).slice(-6);
      if (map[padded]) return map[padded];
    }
    return null;
  }

  for (const info of Object.values(map)) {
    if (info.name === kw) return info;
  }
  const matches = Object.values(map).filter(i => i.name.includes(kw));
  if (matches.length === 1) return matches[0];
  return null;
}

export async function searchStocks(keyword: string, limit = 10): Promise<StockInfo[]> {
  const kw = keyword.trim();
  const results: StockInfo[] = [];
  for (const info of Object.values(FALLBACK_STOCKS)) {
    if (info.name.includes(kw) || info.code.includes(kw)) results.push(info);
    if (results.length >= limit) return results;
  }
  const map = await getStockMap();
  for (const info of Object.values(map)) {
    if (info.name.includes(kw) || info.code.includes(kw)) {
      results.push(info);
      if (results.length >= limit) break;
    }
  }
  return results;
}
