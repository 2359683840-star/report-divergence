"use client";

import { useState, useCallback, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import CountUp from "../components/CountUp";
import SVGPie from "../components/SVGPie";
import SVGBar from "../components/SVGBar";
import AIAnalysis from "../components/AIAnalysis";
import MetricCard from "../components/MetricCard";
import Skeleton from "../components/Skeleton";
import MarketBg from "../components/MarketBg";
import { analyzeStock, previewAIAnalysis, streamAIAnalysis, fetchPriceData, fetchRatingTimeline, fetchIndustryCompare } from "../lib/api";
import type { DivergenceResult, AIProgressiveState, PageState } from "../types";
import type { KlineData, VolatilityData, TimelineEntry, IndustryPeer } from "../lib/api";
import PriceChart from "../components/PriceChart";
import IndustryCompare from "../components/IndustryCompare";

const EXAMPLES = [
  { name: "宁德时代", code: "300750", tag: "新能源电池龙头" },
  { name: "贵州茅台", code: "600519", tag: "白酒龙头 · 常见分歧" },
  { name: "比亚迪",   code: "002594", tag: "新能源汽车" },
  { name: "隆基绿能", code: "601012", tag: "光伏龙头" },
];

export default function Home() {
  const [state, setState] = useState<PageState>({ type: "initial" });
  const [ai, setAi] = useState<AIProgressiveState>({ inProgress: false });
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [volatility, setVolatility] = useState<VolatilityData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [industry, setIndustry] = useState<{ industry: string; peers: IndustryPeer[] } | null>(null);

  const search = async (kw: string) => {
    setAi({ inProgress: false }); setState({ type: "loading" });
    setKlines([]); setVolatility(null); setTimeline([]); setIndustry(null);
    try {
      const d = await analyzeStock(kw);
      setState({ type: "result", data: d });
      // 并行拉取股价 + 评级时间线 + 行业对比 + AI预览
      fetchPriceData(d.stock.code).then(r => { setKlines(r.klines); setVolatility(r.volatility); }).catch(() => {});
      fetchRatingTimeline(d.stock.code).then(r => setTimeline(r.timeline)).catch(() => {});
      fetchIndustryCompare(d.stock.code).then(r => setIndustry(r)).catch(() => {});
      previewAIAnalysis(d.ratings, d.distribution, d.target_price, d.recent_titles)
        .then(p => { if (!p.error) setAi({ inProgress: false, core_tension: p.core_tension, bull_orgs: p.bull_orgs, bull_case: p.bull_case, bear_orgs: p.bear_orgs, bear_case: p.bear_case }); })
        .catch(() => {});
    } catch (e) { setState({ type: "error", message: (e as Error).message || "未知错误" }); }
  };

  const fullAI = useCallback(async () => {
    if (state.type !== "result") return;
    setAi(p => ({ ...p, inProgress: true, currentStep: "准备分析..." }));
    try {
      for await (const e of streamAIAnalysis(state.data.ratings, state.data.distribution, state.data.target_price, state.data.recent_titles)) {
        setAi(p => {
          const n: AIProgressiveState = { ...p, inProgress: e.step !== "summary", currentStep: e.step !== "summary" ? e.label : undefined };
          const d = e.data as Record<string, unknown>;
          if (e.step === "stance") { n.core_tension = d.core_tension as string; n.bull_orgs = d.bull_orgs as string[]; n.bull_case = d.bull_case as string[]; n.bear_orgs = d.bear_orgs as string[]; n.bear_case = d.bear_case as string[]; }
          else if (e.step === "assumptions") n.assumption_conflicts = (d.assumption_conflicts || []) as AIProgressiveState["assumption_conflicts"];
          else if (e.step === "data_check") { n.data_inconsistencies = (d.data_inconsistencies || []) as AIProgressiveState["data_inconsistencies"]; n.rating_changes = (d.rating_changes || []) as AIProgressiveState["rating_changes"]; }
          else if (e.step === "summary") n.summary = d.summary as string;
          return n;
        });
      }
    } catch { setAi(p => ({ ...p, inProgress: false })); }
  }, [state]);

  return (
    <div className="min-h-screen relative">
      {/* Animated background - always visible, dimmer on result pages */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, opacity: state.type === "result" ? 0.35 : 0.7 }}>
        <MarketBg />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl">
        <div className="relative">
          <div className="absolute bottom-0 left-0 right-0 h-px header-glow opacity-30" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a18] flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                探
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold tracking-tight">研报分歧探测器</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] sm:text-xs text-[#a09c94] font-medium tracking-wide uppercase">Data · 东方财富</span>
              <span className="w-1 h-1 rounded-full bg-[#eae8e3]" />
              <span className="text-[10px] sm:text-xs text-[#a09c94] font-medium tracking-wide uppercase">AI · DeepSeek</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Search */}
        <div className="max-w-2xl mx-auto mb-10">
          <SearchBar onSearch={search} isLoading={state.type === "loading"} />
        </div>

        {/* Quick stocks */}
        {state.type === "initial" && (
          <div className="animate-in max-w-2xl mx-auto mb-10">
            <p className="text-xs font-semibold text-[#a09c94] uppercase tracking-wider mb-3">试试这些热门股票</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {EXAMPLES.map(s => (
                <button key={s.code} onClick={() => search(s.name)}
                  className="card p-3.5 text-left group cursor-pointer">
                  <div className="font-semibold text-sm group-hover:text-[#5b5af0] transition-colors">{s.name}</div>
                  <div className="text-xs text-[#a09c94] mt-0.5">{s.tag}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content — key triggers re-mount animation on state change */}
        <div key={state.type}>
          {state.type === "initial" && <HeroSection />}
          {state.type === "loading" && <LoadingState />}
          {state.type === "error" && <ErrorState message={state.message} />}
          {state.type === "result" && <Result data={state.data} ai={ai} klines={klines} volatility={volatility} timeline={timeline} industry={industry} onFullAI={fullAI} />}
        </div>
      </main>

      <footer>
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-px header-glow opacity-20" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-[#a09c94]">
              <span>数据来源: 东方财富</span>
              <span className="text-[#eae8e3]">|</span>
              <span>AI 分析: DeepSeek</span>
            </div>
            <span className="text-[11px] text-[#d4d1ca]">仅作信息参考，不构成投资建议</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="text-center pt-16 sm:pt-24 pb-8">
      <h2
        className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        分析师们在<span className="text-[#5b5af0]">吵</span>什么？
      </h2>
      <p
        className="text-[#6b6760] text-base sm:text-lg max-w-md mx-auto"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.8s 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        多家机构同时对一只股票发布研报，观点却常常打架
      </p>
    </div>
  );
}

// ─── States ───
function LoadingState() {
  return (
    <div className="animate-in">
      <div className="flex items-center gap-2 mb-4 text-sm text-[#6b6760]">
        <div className="w-3.5 h-3.5 border-2 border-[#eae8e3] border-t-[#5b5af0] rounded-full animate-spin" />
        正在拉取最新研报数据...
      </div>
      <Skeleton />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const tips: Record<string,string> = { "超时":"网络较慢，请稍后重试。热门股票已预缓存。","503":"网络较慢，请稍后重试。","未找到":"检查股票代码，如 600519 贵州茅台。","404":"检查股票代码，如 600519 贵州茅台。","仅有1份":"仅1份研报无法分析分歧。","暂无":"该股票暂无分析师覆盖。" };
  const tip = Object.entries(tips).find(([k]) => message.includes(k))?.[1] || "请检查网络或换只股票试试。";
  return (
    <div className="animate-in text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-[#f5f4f1] flex items-center justify-center mx-auto mb-4 text-2xl">!</div>
      <h3 className="text-lg font-semibold mb-2">查询失败</h3>
      <p className="text-sm text-[#a09c94] max-w-sm mx-auto mb-1">{message}</p>
      <p className="text-xs text-[#a09c94]">{tip}</p>
    </div>
  );
}

// ─── Result ───
function Result({ data, ai, klines, volatility, timeline, industry, onFullAI }: {
  data: DivergenceResult; ai: AIProgressiveState;
  klines: KlineData[]; volatility: VolatilityData | null; timeline: TimelineEntry[];
  industry: { industry: string; peers: IndustryPeer[] } | null;
  onFullAI: () => void;
}) {
  const { total, bulls, neutrals, bears } = { total: data.distribution.total, bulls: data.distribution.bullish_count, neutrals: data.distribution.neutral_count, bears: data.distribution.bearish_count };
  const [filter, setFilter] = useState<"all"|"bull"|"bear"|"neutral">("all");

  const filteredRatings = data.ratings.filter(r => {
    if (filter === "bull") return r.rating_score >= 4;
    if (filter === "bear") return r.rating_score <= 2;
    if (filter === "neutral") return r.rating_score === 3;
    return true;
  });

  return (
    <div className="space-y-5 stagger">
      {/* Stock header with integrated score */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#eae8e3] shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5b5af0] via-[#818cf8] to-transparent" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{data.stock.name}</h2>
                <span className="text-sm text-[#a09c94] font-medium mt-1">{data.stock.code}</span>
                {data.source === "live" && <span className="badge badge-live">实时</span>}
                {data.source === "cache" && <span className="badge badge-cache text-[11px]">缓存{data.cache_updated_at ? ` ${data.cache_updated_at}` : ""}</span>}
              </div>
              <div className="flex items-center gap-4 text-xs text-[#a09c94]">
                <span>{total} 份研报</span><span className="text-[#eae8e3]">|</span>
                <span>{data.distribution.unique_orgs} 家机构</span><span className="text-[#eae8e3]">|</span>
                <span className="text-[#e03a3a]">{bulls} 看多</span>
                {neutrals > 0 && <><span className="text-[#eae8e3]">|</span><span className="text-[#8b8680]">{neutrals} 中性</span></>}
                {bears > 0 && <><span className="text-[#eae8e3]">|</span><span className="text-[#0d9e55]">{bears} 看空</span></>}
              </div>
            </div>
            <div className="flex items-center gap-6 sm:flex-col sm:items-end">
              <div
                className="text-5xl sm:text-6xl font-extrabold tracking-tighter tabular-nums"
                style={{
                  color: data.score < 20 ? "#0d9e55" : data.score < 50 ? "#d4942b" : data.score < 80 ? "#e03a3a" : "#7c3aed",
                  animation: "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                }}
              >
                <CountUp to={data.score} duration={1.5} />
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: data.score < 20 ? "#0d9e55" : data.score < 50 ? "#d4942b" : data.score < 80 ? "#e03a3a" : "#7c3aed" }}>{data.level}</div>
                <div className="text-[10px] text-[#a09c94]">{data.level_desc}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 flex justify-center"><SVGPie distribution={data.distribution.distribution} /></div>
        <div className="card p-5"><SVGBar ratings={data.ratings} /></div>
      </div>

      {/* Price chart */}
      {klines.length > 0 && (
        <div className="card p-4 sm:p-5"><PriceChart klines={klines} timeline={timeline} /></div>
      )}

      {/* Industry comparison */}
      {industry?.peers && industry.peers.length > 0 && (
        <div className="card p-4 sm:p-5">
          <IndustryCompare industry={industry.industry} peers={industry.peers} />
        </div>
      )}

      {/* Volatility + Timeline row */}
      {(volatility || timeline.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {volatility?.available && (
            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-[#6b6760] mb-3">波动率分析</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#a09c94]">日波动率</span>
                  <span className="text-sm font-bold">{volatility.daily_volatility}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#a09c94]">年化波动率</span>
                  <span className="text-sm font-bold">{volatility.annual_volatility}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#a09c94]">近期波动趋势</span>
                  <span className={`text-sm font-bold ${volatility.vol_trend === "上升" ? "text-[#e03a3a]" : volatility.vol_trend === "下降" ? "text-[#0d9e55]" : "text-[#8b8680]"}`}>
                    {volatility.vol_trend}（{volatility.earlier_volatility}% → {volatility.recent_volatility}%）
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#a09c94]">期间涨跌幅</span>
                  <span className={`text-sm font-bold ${volatility.price_change_pct >= 0 ? "text-[#e03a3a]" : "text-[#0d9e55]"}`}>
                    {volatility.price_change_pct >= 0 ? "+" : ""}{volatility.price_change_pct}%
                  </span>
                </div>
              </div>
            </div>
          )}
          {timeline.length > 0 && (
            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-[#6b6760] mb-3">评级变动</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {timeline.slice(-8).reverse().map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-[#a09c94] w-16 flex-shrink-0">{t.date}</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${
                      t.direction === "上调" ? "bg-red-50 text-[#e03a3a]" :
                      t.direction === "下调" ? "bg-emerald-50 text-[#0d9e55]" :
                      "bg-gray-100 text-[#8b8680]"
                    }`}>{t.direction}</span>
                    <span className="font-medium flex-shrink-0">{t.org}</span>
                    <span className="text-[#6b6760] truncate">{t.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI section */}
      {ai.core_tension && !ai.summary && (
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-[#5b5af0] flex items-center justify-center text-[10px] font-bold text-white">AI</span><h3 className="font-bold">速览 · 多空分歧</h3></div>
            <span className="badge badge-auto">自动</span>
          </div>
          <p className="text-[#6b6760] text-sm leading-relaxed mb-4">{ai.core_tension}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#fef3f2] p-4 border border-red-100"><div className="text-xs font-bold text-[#e03a3a] mb-1.5">看多 · {ai.bull_orgs?.join(" ")}</div><ul className="text-sm text-[#6b6760] space-y-1">{ai.bull_case?.slice(0,2).map((p,i)=><li key={i}>{p}</li>)}</ul></div>
            <div className="rounded-xl bg-[#eefaf3] p-4 border border-emerald-100"><div className="text-xs font-bold text-[#0d9e55] mb-1.5">谨慎 · {ai.bear_orgs?.join(" ")}</div><ul className="text-sm text-[#6b6760] space-y-1">{ai.bear_case?.slice(0,2).map((p,i)=><li key={i}>{p}</li>)}</ul></div>
          </div>
          {!ai.inProgress && <div className="text-center mt-4 pt-3 border-t border-[#eae8e3]"><button onClick={onFullAI} className="text-sm font-medium text-[#5b5af0] hover:text-[#4a49d8] transition-colors">查看完整深度分析 →</button><p className="text-xs text-[#a09c94] mt-1">假设冲突 · 数据一致性 · 投资建议</p></div>}
        </div>
      )}

      {(ai.inProgress || ai.summary) && (
        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4"><span className="w-5 h-5 rounded-md bg-[#5b5af0] flex items-center justify-center text-[10px] font-bold text-white">AI</span><h3 className="text-lg font-bold">深度分析</h3></div>
          <AIAnalysis aiState={ai} onTrigger={onFullAI} />
        </div>
      )}

      {!ai.core_tension && !ai.inProgress && (
        <div className="card p-4 flex items-center gap-3 text-sm text-[#a09c94]"><div className="w-3.5 h-3.5 rounded-full border-2 border-[#eae8e3] border-t-[#5b5af0] animate-spin" />AI 正在分析多空分歧...</div>
      )}

      {/* Report list with filter tabs */}
      <details className="card p-4" open>
        <summary className="text-sm font-semibold text-[#6b6760] hover:text-[#1a1a18] transition-colors cursor-pointer">研报明细 ({data.ratings.length} 份)</summary>
        <div className="flex gap-1.5 mt-3 mb-2">
          {(["all","bull","neutral","bear"] as const).map(t => {
            const label = t === "all" ? "全部" : t === "bull" ? "看多" : t === "neutral" ? "中性" : "看空";
            const count = t === "all" ? total : t === "bull" ? bulls : t === "neutral" ? neutrals : bears;
            if (count === 0) return null;
            return (
              <button key={t} onClick={() => setFilter(t)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${filter === t ? "bg-[#1a1a18] text-white" : "bg-[#f5f4f1] text-[#6b6760] hover:bg-[#eae8e3]"}`}>
                {label} {count}
              </button>
            );
          })}
        </div>
        <div className="divide-y divide-[#f5f4f1] max-h-80 overflow-y-auto -mx-1">
          {filteredRatings.map((r,i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-[#f8f7f5] transition-colors text-sm">
              <span className="text-xs text-[#a09c94] w-20 flex-shrink-0">{r.date}</span>
              <span className="font-medium w-20 flex-shrink-0">{r.org}</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${r.rating_score>=4?"tag-bull":r.rating_score===3?"tag-neutral":"tag-bear"}`}>{r.rating}</span>
              <span className="text-[#6b6760] truncate text-xs sm:text-sm">{r.title}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
