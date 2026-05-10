import { QuestNode } from "./QuestNode";

const themes = [
  "环境岛 Environment",
  "教育学院 Education",
  "科技城 Technology",
  "健康实验室 Health",
  "商业港 Business",
  "政府塔 Government",
  "学术图书馆 Academic",
  "听力基地 Listening",
];

const nodes = [
  { title: "新词初遇", description: "用雅思例句认识主题词和核心释义。", href: "/mission" },
  { title: "语境判断", description: "根据句子判断词义和作者态度。", href: "/mission" },
  { title: "同义替换", description: "训练 Reading paraphrase 识别。", href: "/synonym-arena", active: true },
  { title: "听写挑战", description: "训练 Listening 拼写准确率。", href: "/dictation", active: true },
  { title: "Boss 复盘", description: "按错因复习高危词。", href: "/review", active: true },
];

export function QuestMap() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {themes.map((theme, themeIndex) => (
        <section key={theme} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                阶段 {themeIndex + 1}
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{theme}</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {themeIndex < 2 ? "已解锁" : "预览"}
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {nodes.map((node) => (
              <QuestNode key={`${theme}_${node.title}`} {...node} active={node.active && themeIndex < 2} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
