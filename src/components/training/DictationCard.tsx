"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";

export function DictationCard({
  word,
  tip,
  disabled,
  accent = "en-GB",
  playbackSpeed = 1,
  onSubmit,
}: {
  word: string;
  tip: string;
  disabled?: boolean;
  accent?: "en-GB" | "en-US";
  playbackSpeed?: number;
  onSubmit: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");

  function play() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent;
    utterance.rate = playbackSpeed;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Listening 听写拼写</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">听音频，准确写出你听到的单词。</h2>
      <button
        onClick={play}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
      >
        <Volume2 size={18} />
        播放音频
      </button>
      <label className="mt-6 block text-sm font-bold text-slate-700" htmlFor="dictation-answer">
        你的答案
      </label>
      <input
        id="dictation-answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === "Enter" && answer.trim()) onSubmit(answer);
        }}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-950 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        placeholder="请输入听到的英文"
      />
      <p className="mt-3 text-sm text-slate-500">提交后提示：{tip}</p>
      <button
        disabled={disabled || !answer.trim()}
        onClick={() => onSubmit(answer)}
        className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        提交答案
      </button>
    </section>
  );
}
