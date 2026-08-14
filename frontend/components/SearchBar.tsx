"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props { onSearch: (keyword: string) => void; isLoading: boolean; }

export default function SearchBar({ onSearch, isLoading }: Props) {
  const [v, setV] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const submit = useCallback(() => {
    const t = v.trim();
    if (t && !isLoading) { onSearch(t); }
  }, [v, isLoading, onSearch]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement === ref.current) submit();
      if (e.key === "Escape") { setV(""); ref.current?.blur(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [submit]);

  return (
    <div>
      <div className={`relative transition-all duration-200 ${focused ? "scale-[1.01]" : ""}`}>
        <input ref={ref} type="text" value={v}
          onChange={e => setV(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="输入股票代码或名称，如 600519 贵州茅台"
          disabled={isLoading}
          className="input w-full disabled:opacity-50" />
        {v && !isLoading && (
          <button onClick={() => { setV(""); ref.current?.focus(); }}
            className="absolute right-[4.5rem] top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#a09c94] hover:text-[#6b6760] rounded-lg hover:bg-[#f5f4f1] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <button onClick={submit} disabled={isLoading || !v.trim()}
          className="btn btn-accent absolute right-2 top-2 h-10 px-4 text-sm">
          {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          <span className="hidden sm:inline">查询</span>
        </button>
      </div>
    </div>
  );
}
