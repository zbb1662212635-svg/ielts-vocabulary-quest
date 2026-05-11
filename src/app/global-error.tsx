"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="min-h-screen bg-slate-950 p-8 text-white">
          <section className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-8">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-rose-200">Runtime Error</p>
            <h1 className="mt-3 text-3xl font-black">学习流程出现异常</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200">{error.message}</p>
            <button onClick={reset} className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">
              重新加载
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
