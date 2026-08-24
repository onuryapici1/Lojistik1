"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function TopBar({ title }: { title: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto w-full px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="font-bold text-slate-800 shrink-0">
            Özlem Malzeme Formu
          </Link>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="text-slate-500 truncate hidden sm:inline">{title}</span>
        </div>
        <nav className="flex items-center gap-2 shrink-0">
          <Link href="/siparis/yeni" className="text-sm font-medium text-blue-700 hover:underline">
            Yeni Sipariş
          </Link>
          <Link href="/gecmis" className="text-sm font-medium text-slate-600 hover:underline">
            Geçmiş
          </Link>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-400 hover:text-slate-600">
            Çıkış
          </button>
        </nav>
      </div>
    </header>
  );
}
