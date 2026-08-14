"use client";

import type { IndustryPeer } from "../lib/api";

interface Props { industry: string; peers: IndustryPeer[]; }

function levelColor(score: number) {
  if (score < 20) return "#0d9e55";
  if (score < 50) return "#d4942b";
  if (score < 80) return "#e03a3a";
  return "#7c3aed";
}

export default function IndustryCompare({ industry, peers }: Props) {
  if (!peers.length) return null;

  const maxScore = Math.max(...peers.map(p => p.score), 20);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#6b6760]">行业分歧对比 · {industry}</h3>
        <span className="text-[10px] text-[#a09c94]">同业分歧分数排名</span>
      </div>
      <div className="space-y-2.5">
        {peers.map(p => {
          const w = Math.max((p.score / maxScore) * 100, 2);
          const color = levelColor(p.score);
          return (
            <div key={p.code} className="flex items-center gap-3">
              <span className={`w-20 flex-shrink-0 text-xs font-medium truncate ${p.is_current ? "text-[#1a1a18] font-bold" : "text-[#6b6760]"}`}>
                {p.name}
              </span>
              <div className="relative flex-1 h-5 bg-[#f5f4f1] rounded overflow-hidden">
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-r flex items-center justify-end pr-1.5 transition-all duration-700 ease-out"
                  style={{
                    width: `${w}%`,
                    background: p.is_current
                      ? `linear-gradient(90deg, ${color}, ${color}CC)`
                      : `${color}55`,
                    boxShadow: p.is_current ? `0 0 8px ${color}40` : "none",
                  }}
                >
                  <span className="text-[10px] font-bold text-white">{p.score.toFixed(0)}</span>
                </div>
              </div>
              <span className={`w-16 flex-shrink-0 text-right text-[10px] ${p.is_current ? "font-bold text-[#1a1a18]" : "text-[#a09c94]"}`}>
                {p.total}份研报
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-[#a09c94] mt-3 text-center">
        深色 = 当前股票 · 分数越高代表分析师分歧越大
      </p>
    </div>
  );
}
