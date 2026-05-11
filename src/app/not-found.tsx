import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <section className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-600">404</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">页面不存在</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">请回到学习首页或功能自检页面继续。</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            学习首页
          </Link>
          <Link href="/learning-check" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">
            功能自检
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
