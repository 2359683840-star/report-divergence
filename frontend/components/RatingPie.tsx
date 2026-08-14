"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS: Record<string, string> = {
  "买入": "#e03a3a", "强烈推荐": "#e03a3a", "推荐": "#f25454",
  "增持": "#f59e0b", "优于大市": "#f59e0b",
  "谨慎推荐": "#d4942b", "谨慎增持": "#d4942b",
  "中性": "#8b8680", "同步大市": "#8b8680",
  "减持": "#0d9e55", "弱于大市": "#0d9e55", "卖出": "#0d9e55",
};
const FALLBACK = ["#e03a3a", "#f59e0b", "#d4942b", "#8b8680", "#0d9e55"];

const darkTooltip = { background: "#fff", border: "1px solid #eae8e3", borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,.06)", color: "#1a1a18", fontSize: 13 };

export default function RatingPie({ distribution }: { distribution: Record<string, number> }) {
  const data = Object.entries(distribution).map(([name, value], i) => ({
    name, value, fill: COLORS[name] || FALLBACK[i % FALLBACK.length],
  }));

  if (data.length === 0) return <Empty title="评级分布" text="暂无评级数据" />;

  return (
    <div className="w-full h-64">
      <h3 className="text-sm font-semibold text-[#6b6760] mb-1 text-center">评级分布</h3>
      {data.length === 1 && <p className="text-[11px] text-center text-[#a09c94]">所有机构评级一致</p>}
      <ResponsiveContainer width="100%" height="88%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={2} dataKey="value">
            {data.map((d, i) => <Cell key={i} fill={d.fill} stroke="#fff" strokeWidth={1} />)}
          </Pie>
          <Tooltip contentStyle={darkTooltip} formatter={(v, name) => [`${v} 份`, name]} />
          <Legend formatter={(v: string) => <span className="text-[11px] text-[#6b6760]">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="w-full h-64 flex flex-col items-center justify-center">
      <h3 className="text-sm font-semibold text-[#6b6760] mb-1">{title}</h3>
      <p className="text-sm text-[#a09c94]">{text}</p>
    </div>
  );
}
