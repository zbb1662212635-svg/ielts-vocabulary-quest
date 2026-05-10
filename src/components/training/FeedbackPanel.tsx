import { CheckCircle2, XCircle } from "lucide-react";
import type { ErrorType } from "@/lib/types";
import { TutorBubble } from "./TutorBubble";

export function FeedbackPanel({
  isCorrect,
  correctAnswer,
  errorType,
  feedback,
  onNext,
}: {
  isCorrect: boolean;
  correctAnswer: string;
  errorType?: ErrorType;
  feedback: string;
  onNext: () => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {isCorrect ? (
          <CheckCircle2 className="text-emerald-600" size={20} />
        ) : (
          <XCircle className="text-rose-600" size={20} />
        )}
        <div className={`text-sm font-black ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
          {isCorrect ? "答对了" : "需要复盘"}
        </div>
      </div>
      {!isCorrect && (
        <div className="mt-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-950">
          正确答案：<span className="font-black">{correctAnswer}</span>
          {errorType && <span className="ml-3 rounded-full bg-white px-2 py-1 text-xs font-bold">{errorType}</span>}
        </div>
      )}
      <div className="mt-4">
        <TutorBubble message={feedback} />
      </div>
      <button
        onClick={onNext}
        className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
      >
        下一题
      </button>
    </div>
  );
}
