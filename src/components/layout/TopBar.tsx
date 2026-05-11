"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Headphones, Menu } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 lg:hidden" aria-label="打开导航">
            <Menu size={18} />
          </button>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">目标</div>
            <div className="text-sm font-black text-slate-950">IELTS Listening 7.0 / Reading 7.0</div>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/dictation"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
          >
            <Headphones size={16} /> 听写
          </Link>
          <Link
            href="/reading/dossier"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
          >
            <BookOpenCheck size={16} /> 阅读
          </Link>
          <Link href="/mission" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
            继续今日任务 <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
