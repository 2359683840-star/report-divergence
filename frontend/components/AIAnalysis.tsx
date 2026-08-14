"use client";

import type { AIProgressiveState } from "../types";

const STEPS = [
  { k: "stance", l: "识别多空阵营与核心分歧" },
  { k: "assumptions", l: "提取关键假设冲突" },
  { k: "data_check", l: "检测数据一致性与评级变动" },
  { k: "summary", l: "生成综合投资建议" },
] as const;

export default function AIAnalysis({ aiState, onTrigger }: { aiState: AIProgressiveState; onTrigger: () => void }) {
  const { inProgress, currentStep } = aiState;

  if (!inProgress && !aiState.core_tension) return (
    <div className="text-center py-8">
      <p className="text-[#6b6760] mb-4">想看AI如何解读这些分歧？</p>
      <button onClick={onTrigger} className="btn btn-accent">AI 深度分析</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {inProgress && currentStep && <Progress steps={STEPS} current={currentStep} />}
      <Content ai={aiState} />
    </div>
  );
}

function Content({ ai }: { ai: AIProgressiveState }) {
  return (
    <div className="space-y-5">
      {ai.core_tension && (
        <div className="rounded-xl bg-[#f8f7f5] p-4 sm:p-5">
          <Sec n="1" t="核心分歧" />
          <p className="text-[#6b6760] leading-relaxed mt-1.5">{ai.core_tension}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {ai.bull_case && ai.bull_case.length > 0 && (
              <div className="rounded-xl bg-white p-4 border border-red-100">
                <div className="text-xs font-bold text-[#e03a3a] mb-1.5">看多{ai.bull_orgs ? ` · ${ai.bull_orgs.join(" ")}` : ""}</div>
                <ul className="text-sm text-[#6b6760] space-y-1">{ai.bull_case.map((p,i) => <li key={i}>{p}</li>)}</ul>
              </div>
            )}
            {ai.bear_case && ai.bear_case.length > 0 && (
              <div className="rounded-xl bg-white p-4 border border-emerald-100">
                <div className="text-xs font-bold text-[#0d9e55] mb-1.5">谨慎{ai.bear_orgs ? ` · ${ai.bear_orgs.join(" ")}` : ""}</div>
                <ul className="text-sm text-[#6b6760] space-y-1">{ai.bear_case.map((p,i) => <li key={i}>{p}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}

      {ai.assumption_conflicts && ai.assumption_conflicts.length > 0 && (
        <div>
          <Sec n="2" t="关键假设冲突" />
          <div className="overflow-x-auto mt-2 rounded-xl border border-[#eae8e3]">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f8f7f5]">{["变量","看多方判断","看空方判断","投资意义"].map(h => <th key={h} className="text-left p-2.5 font-medium text-[#6b6760]">{h}</th>)}</tr></thead>
              <tbody>{ai.assumption_conflicts.map((ac,i) => (
                <tr key={i} className="border-t border-[#f5f4f1] hover:bg-[#faf9f7] transition-colors">
                  <td className="p-2.5 font-medium">{ac.variable}</td>
                  <td className="p-2.5 text-[#6b6760]">{ac.bull_view}</td>
                  <td className="p-2.5 text-[#6b6760]">{ac.bear_view}</td>
                  <td className="p-2.5 text-[#6b6760]">{ac.impact}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {((ai.data_inconsistencies?.length || 0) + (ai.rating_changes?.length || 0)) > 0 && (
        <div>
          <Sec n="3" t="数据检查与评级变动" />
          <div className="space-y-2 mt-2">
            {ai.data_inconsistencies?.map((di,i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#fef9ee] border border-amber-100">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${di.severity==="高"?"bg-red-100 text-[#e03a3a]":di.severity==="中"?"bg-amber-100 text-[#b8880a]":"bg-blue-50 text-blue-600"}`}>{di.severity}</span>
                <span className="font-medium text-sm">{di.metric}</span>
                <span className="text-sm text-[#6b6760]">{di.range}</span>
              </div>
            ))}
            {ai.rating_changes?.map((rc,i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-1 text-sm">
                <span className="font-medium">{rc.org}</span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${rc.direction.includes("上调")?"bg-red-50 text-[#e03a3a]":"bg-emerald-50 text-[#0d9e55]"}`}>{rc.direction}</span>
                <span className="text-[#6b6760]">{rc.signal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ai.summary && (
        <div className="rounded-xl bg-[#f8f7f5] p-4 sm:p-5">
          <Sec n="4" t="AI 综合投资建议" />
          <p className="text-sm text-[#6b6760] leading-relaxed mt-1.5">{ai.summary}</p>
        </div>
      )}
    </div>
  );
}

function Progress({ steps, current }: { steps: readonly { k: string; l: string }[]; current: string }) {
  const idx = steps.findIndex(s => s.l === current);
  return (
    <div className="rounded-xl bg-[#f8f7f5] p-4 border border-[#eae8e3]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3.5 h-3.5 border-2 border-[#eae8e3] border-t-[#5b5af0] rounded-full animate-spin" />
        <span className="text-sm font-medium text-[#5b5af0]">{current}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {steps.map((s, i) => (
          <div key={s.k} className={`text-center py-2 px-1 rounded-lg text-[11px] font-medium transition-colors ${i < idx ? "bg-emerald-50 text-[#0d9e55]" : i === idx ? "bg-indigo-50 text-[#5b5af0]" : "bg-white text-[#a09c94]"}`}>
            <div className="text-xs mb-0.5">{i < idx ? "ok" : String(i + 1)}</div>
            <div className="leading-tight">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sec({ n, t }: { n: string; t: string }) {
  return <h4 className="text-sm font-bold text-[#1a1a18]"><span className="text-[#a09c94] font-normal mr-1.5">{n}</span>{t}</h4>;
}
