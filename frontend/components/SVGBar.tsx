"use client";

import { useMemo } from "react";
import type { RatingRecord } from "../types";

interface Props { ratings: RatingRecord[]; }

export default function SVGBar({ ratings }: Props) {
  const data = useMemo(() => {
    const m: Record<string, { t: number; n: number }> = {};
    ratings.forEach(r => { if (!m[r.org]) m[r.org] = { t: 0, n: 0 }; m[r.org].t += r.rating_score; m[r.org].n++; });
    return Object.entries(m)
      .map(([org, { t, n }]) => ({ org: org.length > 14 ? org.slice(0, 14) + "…" : org, score: +(t / n).toFixed(1), n }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [ratings]);

  if (data.length === 0) {
    return (
      <div className="w-full py-10 flex flex-col items-center justify-center">
        <h3 className="text-sm font-semibold text-[#6b6760] mb-1">机构观点对比</h3>
        <p className="text-sm text-[#a09c94]">暂无数据</p>
      </div>
    );
  }

  const barH = 28, gap = 6, topPad = 20;
  const labelW = 120, chartW = 380, rightPad = 60;
  const svgW = labelW + chartW + rightPad;
  const svgH = topPad + data.length * (barH + gap) + 20;
  const maxScore = 5;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-[#6b6760] mb-3 text-center">机构观点对比</h3>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ maxHeight: 380 }}>
        {/* Grid lines + labels */}
        {[1, 2, 3, 4, 5].map(v => {
          const x = labelW + (v / maxScore) * chartW;
          return (
            <g key={v}>
              <line x1={x} y1={0} x2={x} y2={svgH - 16} stroke="#f0eeeb" strokeWidth="0.5" />
              <text x={x} y={svgH - 4} textAnchor="middle" fill="#a09c94" fontSize="10">{v}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const y = topPad + i * (barH + gap);
          const w = (d.score / maxScore) * chartW;
          const color = d.score >= 4 ? "#e03a3a" : d.score >= 3 ? "#8b8680" : "#0d9e55";

          return (
            <g key={i}>
              {/* Label */}
              <text x={labelW - 6} y={y + barH / 2 + 4} textAnchor="end" fill="#6b6760" fontSize="12" fontWeight="500">
                {d.org}
              </text>
              {/* Bar - animated width */}
              <rect x={labelW} y={y} width={w} height={barH} rx="4" fill={color} opacity="0.85">
                <animate attributeName="width" from="0" to={w}
                  dur={`${0.5 + i * 0.04}s`} begin={`${i * 0.05}s`}
                  fill="freeze" calcMode="spline" keySplines="0.34 1.56 0.64 1" />
              </rect>
              {/* Score on bar */}
              <text x={labelW + w + 6} y={y + barH / 2 + 4} fill="#6b6760" fontSize="10" fontWeight="700">
                {d.score.toFixed(1)}
              </text>
              {/* Count */}
              <text x={labelW + chartW + 20} y={y + barH / 2 + 4} fill="#a09c94" fontSize="10">
                {d.n}份
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <text x={labelW + chartW / 2} y={svgH - 4} textAnchor="middle" fill="#a09c94" fontSize="10">
          5 = 最看多 · 1 = 最看空
        </text>
      </svg>
    </div>
  );
}
