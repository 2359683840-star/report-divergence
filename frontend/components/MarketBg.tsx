"use client";

import { useEffect, useRef } from "react";

interface Candle { o: number; c: number; h: number; l: number; vol: number; }

export default function MarketBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0, animId = 0;
    let candles: Candle[] = [];
    let offset = 0;
    let price = 0;

    function resize() {
      const p = canvas!.parentElement!;
      w = p.clientWidth; h = p.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = w * dpr; canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`; canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // 真实价格模拟：动量随机游走 + 波动率聚类
    function generateData() {
      const count = 140;
      const arr: Candle[] = [];
      const mid = h * 0.55;
      const scale = h * 0.15;
      let price = mid;
      let momentum = 0;
      let volatility = 0.6; // 波动率状态

      for (let i = 0; i < count; i++) {
        // 波动率缓慢变化 (聚类)
        volatility += (Math.random() - 0.5) * 0.15;
        volatility = Math.max(0.2, Math.min(1.5, volatility));
        // 动量缓慢衰减 + 随机冲击
        momentum = momentum * 0.85 + (Math.random() - 0.48) * volatility * 0.8;
        // 均值回归力
        const reversion = (mid - price) * 0.003;
        // 涨跌幅
        const change = (momentum + reversion) * scale * 0.04;

        const open = price;
        const close = open + change;
        // 日内波动与波动率成正比
        const wickH = Math.random() * volatility * scale * 0.03;
        const wickL = Math.random() * volatility * scale * 0.03;
        const high = Math.max(open, close) + wickH;
        const low  = Math.min(open, close) - wickL;

        arr.push({ o: open, c: close, h: high, l: low, vol: 0.2 + Math.random() * volatility * 0.7 });
        price = close;
      }
      return arr;
    }

    function init() {
      resize();
      candles = generateData();
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // chart dimensions (must be before candle generation)
      const chartLeft = 50, chartRight = w - 20, chartTop = 30, chartBottom = h - 60;
      const chartW = chartRight - chartLeft;
      const chartH = chartBottom - chartTop;

      offset += 0.25;
      const candleW_px = chartW / candles.length;
      if (offset >= candleW_px + candleW_px * 0.3) {
        offset = 0;
        candles.shift();
        const last = candles[candles.length - 1];
        // 延续最后一个K线的动量生成新K线
        const prevC = candles.length >= 2 ? candles[candles.length - 2].c : last.o;
        const trend = (last.c - prevC) * 0.4 + (Math.random() - 0.48) * (last.h - last.l) * 0.5;
        const open = last.c;
        const close = open + trend;
        const vol = Math.max(0.1, Math.abs(trend) / (last.h - last.l + 1) * 0.8 + Math.random() * 0.3);
        candles.push({
          o: open, c: close,
          h: Math.max(open, close) + Math.abs(trend) * (0.3 + Math.random() * 0.4),
          l: Math.min(open, close) - Math.abs(trend) * (0.3 + Math.random() * 0.4),
          vol,
        });
      }

      // price range
      let minP = Infinity, maxP = -Infinity;
      for (const c of candles) { if (c.l < minP) minP = c.l; if (c.h > maxP) maxP = c.h; }
      const range = maxP - minP || 1;
      const pad = range * 0.15;
      minP -= pad; maxP += pad;

      function toY(v: number) { return chartBottom - ((v - minP) / (maxP - minP)) * chartH; }
      const candleW = chartW / candles.length * 0.7;
      const gap = chartW / candles.length * 0.3;

      // ─── Grid ───
      const gridLines = 6;
      ctx.strokeStyle = "rgba(0,0,0,0.035)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= gridLines; i++) {
        const y = chartTop + (chartH / gridLines) * i;
        ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke();
        // price label
        const pv = maxP - ((maxP - minP) / gridLines) * i;
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.font = "9px Inter, sans-serif";
        ctx.fillText(pv.toFixed(0), chartLeft - 44, y + 3);
      }
      // vertical grid
      for (let x = chartLeft; x < chartRight; x += 80) {
        ctx.strokeStyle = "rgba(0,0,0,0.02)";
        ctx.beginPath(); ctx.moveTo(x, chartTop); ctx.lineTo(x, chartBottom); ctx.stroke();
      }

      // ─── Candles ───
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const x = chartLeft + i * (chartW / candles.length) - offset * (chartW / candles.length / 12);
        if (x + candleW / 2 < chartLeft || x - candleW / 2 > chartRight) continue;

        const yO = toY(c.o), yC = toY(c.c);
        const isUp = c.c >= c.o;
        const color = isUp ? "#e03a3a" : "#0d9e55";
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.max(Math.abs(yO - yC), 0.5);

        // wick
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, toY(c.h));
        ctx.lineTo(x, toY(c.l));
        ctx.stroke();

        // body
        ctx.fillStyle = isUp ? "rgba(224,58,58,0.3)" : "rgba(13,158,85,0.3)";
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH);
        ctx.globalAlpha = 1;
      }

      // ─── MA5 (快线) ───
      ctx.strokeStyle = "rgba(91,90,240,0.3)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      let first = true;
      for (let i = 4; i < candles.length; i++) {
        const ma = candles.slice(i - 4, i + 1).reduce((s, c) => s + c.c, 0) / 5;
        const x = chartLeft + i * (chartW / candles.length) - offset * (chartW / candles.length / 12);
        if (first) { ctx.moveTo(x, toY(ma)); first = false; }
        else ctx.lineTo(x, toY(ma));
      }
      ctx.stroke();

      // ─── MA20 (慢线) ───
      ctx.strokeStyle = "rgba(245,158,11,0.3)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      first = true;
      for (let i = 19; i < candles.length; i++) {
        const ma = candles.slice(i - 19, i + 1).reduce((s, c) => s + c.c, 0) / 20;
        const x = chartLeft + i * (chartW / candles.length) - offset * (chartW / candles.length / 12);
        if (first) { ctx.moveTo(x, toY(ma)); first = false; }
        else ctx.lineTo(x, toY(ma));
      }
      ctx.stroke();

      // ─── Volume bars ───
      const volTop = chartBottom + 8;
      const volH = h - volTop - 10;
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const x = chartLeft + i * (chartW / candles.length) - offset * (chartW / candles.length / 12);
        if (x + candleW / 2 < chartLeft || x - candleW / 2 > chartRight) continue;
        const isUp = c.c >= c.o;
        ctx.fillStyle = isUp ? "rgba(224,58,58,0.15)" : "rgba(13,158,85,0.15)";
        ctx.fillRect(x - candleW / 2, volTop + volH * (1 - c.vol), candleW, volH * c.vol);
      }
      // vol separator line
      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(chartLeft, volTop); ctx.lineTo(chartRight, volTop); ctx.stroke();

      // ─── Latest price line ───
      const lastC = candles[candles.length - 1];
      const lastX = chartRight - 10;
      const lastY = toY(lastC.c);
      ctx.strokeStyle = "rgba(91,90,240,0.25)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(chartLeft, lastY); ctx.lineTo(lastX, lastY); ctx.stroke();
      ctx.setLineDash([]);

      // price tag
      ctx.fillStyle = "rgba(91,90,240,0.4)";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText(lastC.c.toFixed(0), lastX + 4, lastY + 4);

      animId = requestAnimationFrame(draw);
    }

    init();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", () => init());
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", () => init()); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}
