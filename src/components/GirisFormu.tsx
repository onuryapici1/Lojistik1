"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function GirisFormu() {
  const router = useRouter();
  const arama = useSearchParams();
  const devam = arama.get("devam") || "/";

  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (!sifre || yukleniyor) return;

    setYukleniyor(true);
    setHata("");
    try {
      const yanit = await fetch("/api/giris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sifre }),
      });
      const veri = await yanit.json().catch(() => ({}));
      if (!yanit.ok) {
        setHata(veri.hata || "Giriş yapılamadı");
        return;
      }
      router.replace(devam);
      router.refresh();
    } catch {
      setHata("Bağlantı hatası. İnternetinizi kontrol edin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <form
      onSubmit={gonder}
      className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
    >
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Özlem Malzeme Formu</h1>
        <p className="text-sm text-slate-500">Devam etmek için şifreyi girin</p>
      </div>

      <input
        type="password"
        value={sifre}
        onChange={(e) => setSifre(e.target.value)}
        placeholder="Şifre"
        autoFocus
        autoComplete="current-password"
        className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {hata && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {hata}
        </p>
      )}

      <button
        type="submit"
        disabled={yukleniyor || !sifre}
        className="w-full rounded-xl bg-blue-600 text-white font-medium py-3 disabled:opacity-50 hover:bg-blue-700 transition"
      >
        {yukleniyor ? "Kontrol ediliyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}
