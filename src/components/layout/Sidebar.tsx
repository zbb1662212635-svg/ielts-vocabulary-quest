"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Database, FolderSearch, LayoutDashboard, Map, Newspaper, RotateCcw, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "学习首页", icon: LayoutDashboard },
  { href: "/mission", label: "今日任务", icon: CalendarCheck },
  { href: "/quest", label: "任务地图", icon: Map },
  { href: "/reading-lab", label: "外刊素材库", icon: Newspaper },
  { href: "/resource-library", label: "资源库", icon: FolderSearch },
  { href: "/review", label: "错因复盘", icon: RotateCcw },
  { href: "/settings", label: "设置与数据", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/80 px-5 py-6 shadow-sm backdrop-blur lg:block">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Database size={22} />
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-slate-950">IELTS Mission Lab</div>
          <div className="text-xs font-medium text-slate-500">雅思沉浸式学习场景系统</div>
        </div>
      </Link>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                active
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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
