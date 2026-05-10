export function MasteryBadge({ value }: { value: number }) {
  const label =
    value >= 81 ? "稳定掌握" : value >= 61 ? "题中可用" : value >= 41 ? "能认出" : value >= 21 ? "初见" : "陌生";
  const color =
    value >= 81
      ? "bg-emerald-50 text-emerald-700"
      : value >= 61
        ? "bg-indigo-50 text-indigo-700"
        : value >= 41
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{label} · {value}</span>;
}
