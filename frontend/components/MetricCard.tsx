export default function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold tracking-tight text-[#1a1a18]">{value}</div>
      <div className="text-xs text-[#a09c94] mt-1 font-medium">{label}</div>
      {sub && <div className="text-[10px] text-[#d4d1ca] mt-0.5">{sub}</div>}
    </div>
  );
}
