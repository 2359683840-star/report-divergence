"use client";

import { useMemo } from "react";

const COLORS: Record<string, string> = {
  "买入": "#e03a3a", "强烈推荐": "#e03a3a", "推荐": "#f25454",
  "增持": "#f59e0b", "优于大市": "#f59e0b",
  "谨慎推荐": "#d4942b", "谨慎增持": "#d4942b",
  "中性": "#8b8680", "同步大市": "#8b8680",
  "减持": "#0d9e55", "弱于大市": "#0d9e55", "卖出": "#0d9e55",
};
const FALLBACK = ["#e03a3a", "#f59e0b", "#d4942b", "#8b8680", "#0d9e55"];

interface Props { distribution: Record<string, number>; }

export default function SVGPie({ distribution }: Props) {
  const segments = useMemo(() => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    let cumulative = 0;
    return Object.entries(distribution).map(([name, value], i) => {
      const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
      cumulative += value;
      const endAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
      return {
        name, value, startAngle, endAngle,
        color: COLORS[name] || FALLBACK[i % FALLBACK.length],
        pct: Math.round((value / total) * 100),
      };
    });
  }, [distribution]);

  const cx = 90, cy = 90, outerR = 72, innerR = 44;

  function arcPath(startAngle: number, endAngle: number, r: number) {
    const x1 = cx + Math.cos(startAngle) * r;
    const y1 = cy + Math.sin(startAngle) * r;
    const x2 = cx + Math.cos(endAngle) * r;
    const y2 = cy + Math.sin(endAngle) * r;
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-56">
        <p className="text-sm text-[#a09c94]">暂无评级数据</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <h3 className="text-sm font-semibold text-[#6b6760] mb-1">评级分布</h3>
      {segments.length === 1 && (
        <p className="text-[11px] text-[#a09c94] mb-1">所有机构评级一致</p>
      )}
      <svg viewBox="0 0 180 180" className="w-48 h-48">
        {segments.map((seg, i) => {
          const midAngle = (seg.startAngle + seg.endAngle) / 2;
          const labelR = outerR + 16;
          const lx = cx + Math.cos(midAngle) * labelR;
          const ly = cy + Math.sin(midAngle) * labelR;

          return (
            <g key={i} opacity="0">
              <animate attributeName="opacity" from="0" to="1"
                dur="0.5s" begin={`${i * 0.1}s`} fill="freeze" />
              <path
                d={`${arcPath(seg.startAngle, seg.endAngle, outerR)}
                    L ${cx + Math.cos(seg.endAngle) * innerR} ${cy + Math.sin(seg.endAngle) * innerR}
                    ${arcPath(seg.endAngle, seg.startAngle, innerR)} Z`}
                fill={seg.color}
                stroke="#fff" strokeWidth="1.5"
              />
              {seg.pct >= 8 && (
                <text x={lx} y={ly} textAnchor="middle" fill="#6b6760" fontSize="10" fontWeight="600">
                  {seg.pct}%
                </text>
              )}
            </g>
          );
        })}
        {/* Center */}
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#1a1a18" fontSize="22" fontWeight="800">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#a09c94" fontSize="10">
          份研报
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1 text-[11px] text-[#6b6760]">
            <div className="w-2 h-2 rounded-sm" style={{ background: seg.color }} />
            {seg.name} {seg.value}
          </div>
        ))}
      </div>
    </div>
  );
}
