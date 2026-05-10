import { MessageCircle } from "lucide-react";

export function TutorBubble({ message }: { message: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
      <MessageCircle className="mt-0.5 shrink-0 text-indigo-600" size={18} />
      <p>{message}</p>
    </div>
  );
}
