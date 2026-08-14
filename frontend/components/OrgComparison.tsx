"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { RatingRecord } from "../types";

const darkTooltip = { background: "#fff", border: "1px solid #eae8e3", borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,.06)", color: "#1a1a18" };

export default function OrgComparison({ ratings }: { ratings: RatingRecord[] }) {
  const data = useMemo(() => {
    const m: Record<string, { t: number; n: number }> = {};
    ratings.forEach(r => { if (!m[r.org]) m[r.org] = { t: 0, n: 0 }; m[r.org].t += r.rating_score; m[r.org].n++; });
    return Object.entries(m).map(([org, { t, n }]) => ({ org: org.length > 14 ? org.slice(0, 14) + "…" : org, score: +(t / n).toFixed(1), n })).sort((a, b) => b.score - a.score).slice(0, 10);
  }, [ratings]);

  if (data.length === 0) return <div className="w-full h-64 flex flex-col items-center justify-center"><h3 className="text-sm font-semibold text-[#6b6760] mb-1">机构观点对比</h3><p className="text-sm text-[#a09c94]">暂无数据</p></div>;

  return (
    <div className="w-full h-72">
      <h3 className="text-sm font-semibold text-[#6b6760] mb-2 text-center">机构观点对比</h3>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0eeeb" horizontal={false} />
          <XAxis type="number" domain={[0,5]} tick={{ fontSize:11, fill:"#a09c94" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="org" width={100} tick={{ fontSize:11, fill:"#6b6760" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={darkTooltip} formatter={(v) => [`${v} 分`, "平均评级"]} labelFormatter={(l) => `机构: ${l}`} />
          <Bar dataKey="score" radius={[0,4,4,0]} barSize={16}>
            {data.map((d, i) => <Cell key={i} fill={d.score >= 4 ? "#e03a3a" : d.score >= 3 ? "#8b8680" : "#0d9e55"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-[#a09c94] text-center">5=最看多 · 1=最看空</p>
    </div>
  );
}
