import { QuestNode } from "./QuestNode";

const themes = [
  "Environment & Nature 环境与自然",
  "Education & Learning 教育与学习",
  "Science & Technology 科学与技术",
  "Health & Lifestyle 健康与生活方式",
  "Work & Business 工作与商业",
  "Cities & Transport 城市与交通",
  "Art & Culture 艺术与文化",
  "Travel & Daily Services 旅行与日常服务",
];

const nodes = [
  { title: "任务简报", description: "进入一个具体 IELTS 使用场景。", href: "/mission", active: true },
  { title: "词汇装备", description: "学习本场景需要的核心词和同义替换。", href: "/mission", active: true },
  { title: "听力场景", description: "用场景关键词训练拼写和听写。", href: "/mission", active: true },
  { title: "阅读任务", description: "围绕同一场景完成证据定位和题目。", href: "/mission", active: true },
  { title: "任务复盘", description: "错因进入 Review Room，安排下次复习。", href: "/mission", active: true },
];

export function QuestMap() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {themes.map((theme, themeIndex) => (
        <section key={theme} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">路线 {themeIndex + 1}</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{theme}</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {themeIndex < 2 ? "今日可练" : "预览"}
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
