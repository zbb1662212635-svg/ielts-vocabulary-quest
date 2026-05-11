export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-600">Loading</p>
        <h1 className="mt-3 text-2xl font-black">正在加载学习任务...</h1>
      </div>
    </div>
  );
}
