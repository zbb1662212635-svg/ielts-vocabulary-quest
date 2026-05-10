"use client";

import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 lg:hidden"
            aria-label="打开导航"
          >
            <Menu size={18} />
          </button>
          <div>
            <div className="text-sm font-semibold text-slate-500">目标</div>
            <div className="text-base font-bold text-slate-950">IELTS Listening 7.0 / Reading 7.0</div>
          </div>
        </div>

        <Link
          href="/mission"
          className="hidden items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 md:inline-flex"
        >
          继续今日任务
          <ArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}
