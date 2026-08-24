"use client";

import { useState } from "react";
import type { OrderItemData } from "@/lib/types";

interface Props {
  onItemsReady: (items: Omit<OrderItemData, "id">[]) => void;
}

export function GeminiPanel({ onItemsReady }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bir hata oluştu");
        return;
      }
      if (!data.items || data.items.length === 0) {
        setError("Metinden malzeme bulunamadı");
        return;
      }
      onItemsReady(data.items);
      setText("");
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-semibold text-slate-800">✨ Gemini ile hızlı ekle</span>
        <span className="text-slate-400 text-sm">{open ? "gizle" : "göster"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-500">
            Ürün gruplarını ve ürünleri serbest metin olarak yaz, yapay zeka bunları listeye satır satır
            ekleyecek. Örnek: <span className="italic">&quot;İçecekler: Su, Kola, Fanta. Temizlik: Deterjan 5 adet, Bulaşık süngeri&quot;</span>
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Örn: İçecekler: Su, Kola, Fanta&#10;Temizlik: Deterjan (5), Çamaşır suyu"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "İşleniyor..." : "Listeye Ekle"}
          </button>
        </div>
      )}
    </div>
  );
}
