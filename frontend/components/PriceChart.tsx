"use client";

import { useMemo } from "react";
import type { KlineData, TimelineEntry } from "../lib/api";

interface Props { klines: KlineData[]; timeline?: TimelineEntry[]; }

function sma(data: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let s = 0; for (let j = i - period + 1; j <= i; j++) s += data[j];
    r.push(s / period);
  }
  return r;
}

export default function PriceChart({ klines, timeline }: Props) {
  const { candles, ma5, ma20, ma60, minP, maxP, maxV, events } = useMemo(() => {
    if (!klines.length) return { candles: [] as KlineData[], ma5: [], ma20: [], ma60: [], minP: 0, maxP: 0, maxV: 0, events: [] as { idx: number; dir: string; org: string; rating: string; date: string }[] };
    const closes = klines.map(k => k.close);
    // 只保留真实变动（上调/下调/首次），去掉"维持"避免噪音
    const ev: { idx: number; dir: string; org: string; rating: string; date: string }[] = [];
    if (timeline) {
      for (const t of timeline) {
        if (t.direction.charCodeAt(0) === 0x7EF4) continue; // 维=维持，跳过
        const idx = klines.findIndex(k => k.date === t.date);
        if (idx >= 0) ev.push({ idx, dir: t.direction, org: t.org, rating: t.rating, date: t.date });
      }
      // 最多显示8个，优先最近的
      ev.sort((a, b) => b.idx - a.idx);
      ev.length = Math.min(ev.length, 8);
      ev.sort((a, b) => a.idx - b.idx);
    }
    return {
      candles: klines,
      ma5: sma(closes, 5), ma20: sma(closes, 20), ma60: sma(closes, 60),
      minP: Math.min(...klines.map(k => k.low)),
      maxP: Math.max(...klines.map(k => k.high)),
      maxV: Math.max(...klines.map(k => k.volume)),
      events: ev,
    };
  }, [klines, timeline]);

  if (!klines.length) return null;

  const W = 780, H = 340, padL = 56, padR = 20, padT = 30, padB = 60;
  const chartW = W - padL - padR, chartH = H - padT - padB - 40;
  const volTop = chartH + padT + 8, volH = 30;
  const barW = Math.max(1, chartW / candles.length * 0.7);
  const gap = chartW / candles.length * 0.3;
  const range = maxP - minP || 1, rpad = range * 0.1;
  function toY(v: number) { return padT + chartH - ((v - (minP - rpad)) / (range + rpad * 2)) * chartH; }

  // 按日期分组事件，同一天的事件垂直错开
  const grouped: Record<number, { idx: number; dir: string; org: string; rating: string }[]> = {};
  for (const e of events) {
    if (!grouped[e.idx]) grouped[e.idx] = [];
    grouped[e.idx].push({ idx: e.idx, dir: e.dir, org: e.org, rating: e.rating });
  }

  const eventList = events.slice().reverse(); // 最近在前

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <h3 className="text-sm font-semibold text-[#6b6760]">股价走势 · 近{klines.length}日</h3>
        <div className="flex items-center gap-3 text-[10px] text-[#a09c94]">
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[5px] border-r-[5px] border-b-[7px] border-b-[#e03a3a] border-l-transparent border-r-transparent" /> 上调</span>
          <span className="flex items-center gap-1"><span className="inline-block w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-t-[#0d9e55] border-l-transparent border-r-transparent" /> 下调</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#5b5af0]" /> 首次覆盖</span>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px]" style={{ maxHeight: 340 }}>
          {/* Grid */}
          {[0,0.25,0.5,0.75,1].map(pct => {
            const y = padT + chartH * pct;
            return (
              <g key={pct}>
                <line x1={padL} y1={y} x2={W-padR} y2={y} stroke="#f0eeeb" strokeWidth="0.5" />
                <text x={padL-4} y={y+3} textAnchor="end" fill="#a09c94" fontSize="9">
                  {((maxP+rpad)-(range+rpad*2)*pct).toFixed(1)}
                </text>
              </g>
            );
          })}
          {/* Candles */}
          {candles.map((k, i) => {
            const x = padL + i * (barW + gap) + gap / 2;
            if (x > W - padR) return null;
            const up = k.close >= k.open, c = up ? "#e03a3a" : "#0d9e55";
            const yO = toY(k.open), yC = toY(k.close);
            const bt = Math.min(yO, yC), bh = Math.max(Math.abs(yC - yO), 0.5);
            return (
              <g key={i}>
                <line x1={x+barW/2} y1={toY(k.high)} x2={x+barW/2} y2={toY(k.low)} stroke={c} strokeWidth="0.6" opacity="0.6" />
                <rect x={x} y={bt} width={barW} height={bh} fill={c} opacity="0.8" rx="1" />
              </g>
            );
          })}
          {/* MA */}
          {[{d:ma5,c:"#5b5af0"},{d:ma20,c:"#f59e0b"},{d:ma60,c:"#94a3b8"}].map(ma =>
            <g key={ma.c}>
              {ma.d.map((v, i) => {
                if (v === null || i === 0) return null;
                const p = ma.d[i-1]; if (p === null) return null;
                const x1 = padL + (i-1)*(barW+gap)+gap/2+barW/2;
                const x2 = padL + i*(barW+gap)+gap/2+barW/2;
                return <line key={i} x1={x1} y1={toY(p)} x2={x2} y2={toY(v)} stroke={ma.c} strokeWidth="1" opacity="0.7" />;
              })}
            </g>
          )}
          {/* Rating events — clean staggered markers */}
          {Object.entries(grouped).map(([idxStr, marks]) => {
            const idx = Number(idxStr);
            const cx = padL + idx * (barW + gap) + gap / 2 + barW / 2;
            // 同一天多个事件：交替上下错开
            return marks.map((m, k) => {
              const dc = m.dir.charCodeAt(0); // 上=0x4E0A 下=0x4E0B 首=0x9996
              const isUp = dc === 0x4E0A;
              const isFirst = dc === 0x9996;
              const dir = isUp ? -1 : isFirst ? 0 : 1; // 上调在上，下调在下，首次中间
              const baseY = isUp ? toY(candles[idx].high) : toY(candles[idx].low);
              const offset = k * 14 * dir;
              const c = isUp ? "#e03a3a" : isFirst ? "#5b5af0" : "#0d9e55";
              const my = baseY + offset * 0.6 - (isUp ? 10 : 0) + (isFirst ? -6 : 0);

              return (
                <g key={`${idx}-${k}`}>
                  {/* connector */}
                  <line x1={cx} y1={isUp ? toY(candles[idx].high) - 4 : toY(candles[idx].low) + 4}
                    x2={cx} y2={my + (isUp ? 6 : isFirst ? 4 : -6)}
                    stroke={c} strokeWidth="0.8" strokeDasharray="2 3" opacity="0.4" />
                  {/* marker shape */}
                  {isUp ? <polygon points={`${cx},${my} ${cx-4},${my+7} ${cx+4},${my+7}`} fill={c} opacity="0.95" />
                    : isFirst ? <circle cx={cx} cy={my} r="3.5" fill={c} opacity="0.95" />
                    : <polygon points={`${cx},${my+7} ${cx-4},${my} ${cx+4},${my}`} fill={c} opacity="0.95" />}
                </g>
              );
            });
          })}
          {/* Volume */}
          {candles.map((k, i) => {
            const x = padL + i*(barW+gap)+gap/2, h = (k.volume/maxV)*volH;
            return <rect key={i} x={x} y={volTop+volH-h} width={barW} height={Math.max(h,0.5)}
              fill={k.close>=k.open?"rgba(224,58,58,0.3)":"rgba(13,158,85,0.3)"} rx="1" />;
          })}
          <line x1={padL} y1={volTop} x2={W-padR} y2={volTop} stroke="#f0eeeb" strokeWidth="0.5" />
          {/* Date labels */}
          {[0,0.25,0.5,0.75,1].map(pct => {
            const idx = Math.floor(pct*(candles.length-1));
            return <text key={pct} x={padL+idx*(barW+gap)+gap/2+barW/2} y={H-8} textAnchor="middle" fill="#a09c94" fontSize="9">
              {candles[idx].date.slice(5)}
            </text>;
          })}
          {/* Legend */}
          <g transform={`translate(${padL},${H-34})`}>
            {[{c:"#5b5af0",l:"MA5"},{c:"#f59e0b",l:"MA20"},{c:"#94a3b8",l:"MA60"}].map((m,i) =>
              <g key={m.l} transform={`translate(${i*70},0)`}>
                <line x1={0} y1={4} x2={16} y2={4} stroke={m.c} strokeWidth="1.5" />
                <text x={20} y={8} fill="#6b6760" fontSize="10">{m.l}</text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Event strip below chart */}
      {eventList.length > 0 && (
        <div className="mt-3 rounded-xl bg-[#f8f7f5] p-3 border border-[#eae8e3]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-[#a09c94] uppercase tracking-wide">评级事件</span>
            <span className="text-[10px] text-[#d4d1ca]">最近 {eventList.length} 条</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {eventList.map((e, i) => {
              // 用首字符码判断方向，避免中文字面量引号问题
              const c0 = e.dir.charCodeAt(0); // 上=0x4E0A 下=0x4E0B 首=0x9996 维=0x7EF4
              const isUp = c0 === 0x4E0A;
              const isDown = c0 === 0x4E0B;
              const color = isUp ? "#e03a3a" : isDown ? "#0d9e55" : "#5b5af0";
              const icon = isUp ? "↑" : isDown ? "↓" : "●";
              return (
                <div key={i} className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-[#eae8e3] text-[10px]">
                  <span className="text-[#a09c94]">{e.date.slice(5)}</span>
                  <span className="font-bold" style={{ color }}>{icon} {e.dir}</span>
                  <span className="font-medium text-[#1a1a18]">{e.org}</span>
                  <span className="text-[#6b6760]">{e.rating}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
