// 研报分歧探测器 — 类型定义

export interface StockInfo {
  code: string;
  name: string;
}

export interface RatingRecord {
  org: string;
  analyst: string;
  rating: string;
  rating_score: number;
  title: string;
  date: string;
  target_price: number | null;
  industry: string;
}

export interface RatingDistribution {
  distribution: Record<string, number>;
  total: number;
  bullish_count: number;
  neutral_count: number;
  bearish_count: number;
  bullish_ratio: number;
  unique_orgs: number;
}

export interface TargetPriceAnalysis {
  available: boolean;
  count: number;
  min: number;
  max: number;
  median: number;
  mean: number;
  std: number;
  spread_pct: number;
  spread_level: string;
}

export interface DivergenceResult {
  score: number;
  level: string;
  level_desc: string;
  stock: StockInfo;
  ratings: RatingRecord[];
  distribution: RatingDistribution;
  target_price: TargetPriceAnalysis;
  recent_titles: string[];
  source: "live" | "cache" | "none";
  cache_updated_at: string | null;
}

export interface AssumptionConflict {
  variable: string;
  bull_view: string;
  bear_view: string;
  impact: string;
}

export interface DataInconsistency {
  metric: string;
  range: string;
  severity: string;
}

export interface RatingChange {
  org: string;
  direction: string;
  signal: string;
}

// 分步AI分析状态
export interface AIProgressiveState {
  inProgress: boolean;
  currentStep?: string;      // 当前正在执行的步骤label
  // 步骤1: 多空阵营
  core_tension?: string;
  bull_orgs?: string[];
  bull_case?: string[];
  bear_orgs?: string[];
  bear_case?: string[];
  // 步骤2: 假设冲突
  assumption_conflicts?: AssumptionConflict[];
  // 步骤3: 数据一致性
  data_inconsistencies?: DataInconsistency[];
  rating_changes?: RatingChange[];
  // 步骤4: 总结
  summary?: string;
}

// UI 状态
export type PageState =
  | { type: "initial" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "result"; data: DivergenceResult };
