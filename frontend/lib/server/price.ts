// 股价K线 — 新浪财经API
const SINA_API = "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData";

export interface KlineData {
  date: string; open: number; close: number;
  high: number; low: number; volume: number; turnover: number;
}

function sinaSymbol(code: string): string {
  return /^(6|5|9)/.test(code) ? `sh${code}` : `sz${code}`;
}

export async function fetchDailyKline(stockCode: string, days = 120): Promise<KlineData[]> {
  try {
    const params = new URLSearchParams({
      symbol: sinaSymbol(stockCode), scale: "240", ma: "no",
      datalen: String(Math.min(days + 10, 150)),
    });
    const res = await fetch(`${SINA_API}?${params}`, {
      cache: "no-store",
      headers: { Referer: "https://finance.sina.com.cn" },
    });
    const raw = await res.json();
    if (!Array.isArray(raw) || !raw.length) return [];
    const klines: KlineData[] = raw.map((item: Record<string, string>) => ({
      date: item.day || "",
      open: Number(item.open || 0),
      close: Number(item.close || 0),
      high: Number(item.high || 0),
      low: Number(item.low || 0),
      volume: Math.round(Number(item.volume || 0)),
      turnover: 0,
    }));
    return klines.slice(-days);
  } catch {
    return [];
  }
}

export function calcVolatility(klines: KlineData[]) {
  if (klines.length < 5) return { available: false };
  const closes = klines.map(k => k.close);
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  const std = (arr: number[]) => {
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
  };
  const dailyVol = std(returns);
  const annualVol = dailyVol * Math.sqrt(252);
  const half = Math.floor(returns.length / 2);
  const recentVol = std(returns.slice(-half));
  const earlierVol = std(returns.slice(0, half));
  const priceChange = (closes[closes.length - 1] - closes[0]) / closes[0];
  return {
    available: true,
    daily_volatility: Math.round(dailyVol * 10000) / 100,
    annual_volatility: Math.round(annualVol * 1000) / 10,
    recent_volatility: Math.round(recentVol * 10000) / 100,
    earlier_volatility: Math.round(earlierVol * 10000) / 100,
    vol_trend: recentVol > earlierVol * 1.1 ? "上升" : recentVol < earlierVol * 0.9 ? "下降" : "持平",
    price_change_pct: Math.round(priceChange * 1000) / 10,
    data_points: klines.length,
  };
}
