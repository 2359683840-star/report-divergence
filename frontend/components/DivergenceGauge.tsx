"use client";

import { useMemo } from "react";

export default function DivergenceGauge({ score, level, levelDesc }: { score: number; level: string; levelDesc: string }) {
  const color = useMemo(() => {
    if (score < 20) return "#0d9e55";
    if (score < 50) return "#d4942b";
    if (score < 80) return "#e03a3a";
    return "#7c3aed";
  }, [score]);

  const r = 64;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg width="170" height="130" viewBox="0 0 170 130">
        <path d="M 18 114 A 64 64 0 0 1 152 114" fill="none" stroke="#f0eeeb" strokeWidth="10" strokeLinecap="round" />
        <path d="M 18 114 A 64 64 0 0 1 152 114" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 1px 3px ${color}30)` }} />
        <text x="85" y="76" textAnchor="middle" fill="#1a1a18" fontSize="26" fontWeight="800">{score.toFixed(0)}</text>
        <text x="85" y="96" textAnchor="middle" fill="#a09c94" fontSize="11" fontWeight="500">分岐分数</text>
      </svg>
      <div className="text-center -mt-1">
        <div className="text-base font-bold" style={{ color }}>{level}</div>
        <div className="text-[11px] text-[#a09c94] mt-0.5">{levelDesc}</div>
      </div>
    </div>
  );
}
