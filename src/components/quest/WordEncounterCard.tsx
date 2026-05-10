import type { VocabularyItem } from "@/lib/types";

export function WordEncounterCard({ word }: { word: VocabularyItem }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-950">{word.word}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{word.partOfSpeech.join(", ")}</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          {word.cefrLevel ?? "B2"}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-700">{word.chineseMeaning}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{word.examples[0]?.sentence}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {word.collocations.slice(0, 3).map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}
