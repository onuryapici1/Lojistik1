"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormOzeti } from "@/lib/depo";
import { tarihGoster } from "@/lib/types";

export function GecmisListesi({ formlar }: { formlar: FormOzeti[] }) {
  const router = useRouter();
  const [silinen, setSilinen] = useState<string>("");
  const [hata, setHata] = useState("");

  async function sil(id: string, etiket: string) {
    if (silinen) return;
    if (!confirm(`"${etiket}" formu kalıcı olarak silinsin mi?`)) return;

    setSilinen(id);
    setHata("");
    try {
      const yanit = await fetch(`/api/form/${id}`, { method: "DELETE" });
      if (!yanit.ok) {
        const veri = await yanit.json().catch(() => ({}));
        setHata(veri.hata || "Silinemedi");
        return;
      }
      router.refresh();
    } catch {
      setHata("Bağlantı hatası");
    } finally {
      setSilinen("");
    }
  }

  if (formlar.length === 0) {
    return (
      <p className="text-center text-slate-500 py-12">
        Henüz kaydedilmiş form yok.
      </p>
    );
  }

  return (
    <>
      {hata && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
          {hata}
        </p>
      )}
      <ul className="space-y-2">
        {formlar.map((f) => {
          const etiket = f.sube || "Şubesiz form";
          return (
            <li
              key={f.id}
              className="bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-2 p-3"
            >
              <Link href={`/form/${f.id}`} className="flex-1 min-w-0">
                <span className="block font-medium text-slate-800 truncate">{etiket}</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {f.siparisTarihi ? `Sipariş ${tarihGoster(f.siparisTarihi)}` : "Tarihsiz"}
                  {f.teslimTarihi ? ` — Teslim ${tarihGoster(f.teslimTarihi)}` : ""}
                  {` · ${f.satirSayisi} satır`}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => sil(f.id, etiket)}
                disabled={silinen === f.id}
                aria-label={`${etiket} formunu sil`}
                className="shrink-0 h-10 w-10 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
