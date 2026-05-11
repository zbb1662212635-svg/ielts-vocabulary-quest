"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarCheck,
  Database,
  FileCheck2,
  FolderSearch,
  Headphones,
  LayoutDashboard,
  Map,
  Network,
  Newspaper,
  PackageCheck,
  RotateCcw,
  Settings,
  Swords,
} from "lucide-react";

const navItems = [
  { href: "/", label: "学习首页", icon: LayoutDashboard },
  { href: "/mission", label: "今日任务", icon: CalendarCheck },
  { href: "/quest", label: "任务地图", icon: Map },
  { href: "/vocabulary", label: "词汇装备库", icon: PackageCheck },
  { href: "/synonym-arena", label: "同义替换", icon: Swords },
  { href: "/dictation", label: "听写训练", icon: Headphones },
  { href: "/listening/studio", label: "听力工作室", icon: Headphones },
  { href: "/reading/dossier", label: "阅读档案", icon: BookOpenCheck },
  { href: "/reading-lab", label: "情景阅读库", icon: Newspaper },
  { href: "/resource-library", label: "资源库", icon: FolderSearch },
  { href: "/resource-library/graph", label: "内容图谱", icon: Network },
  { href: "/review", label: "错因复盘", icon: RotateCcw },
  { href: "/learning-check", label: "功能自检", icon: FileCheck2 },
  { href: "/settings", label: "设置与数据", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur lg:block">
      <Link href="/" className="block rounded-3xl bg-slate-950 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Database size={22} />
          </div>
          <div>
            <div className="text-lg font-black">IELTS Mission Lab</div>
            <div className="mt-1 text-xs font-bold leading-5 text-slate-300">雅思沉浸式学习场景系统</div>
          </div>
        </div>
      </Link>

      <nav className="mt-5 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
