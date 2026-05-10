import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDot } from "lucide-react";

export function QuestNode({
  title,
  description,
  href,
  active,
}: {
  title: string;
  description: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border p-4 shadow-sm ${
        active
          ? "border-indigo-200 bg-indigo-50"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {active ? (
            <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
          ) : (
            <CircleDot className="mt-0.5 text-slate-400" size={20} />
          )}
          <div>
            <h3 className="text-sm font-black text-slate-950">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
          </div>
        </div>
        <ArrowRight className="text-slate-400 group-hover:text-indigo-600" size={17} />
      </div>
    </Link>
  );
}
