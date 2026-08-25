"use client";

import { useState } from "react";
import type { FormVerisi } from "@/lib/types";
import type { Cizim } from "@/lib/cizim";
import { sayfayiPngYap } from "@/lib/cizim-canvas";
import { dosyaAdi } from "@/lib/indirme";

/**
 * Excel / PDF / PNG indirme.
 *
 * Excel ve PDF sunucuda üretiliyor (yazı vektörel, dosya küçük).
 * PNG tarayıcıda üretiliyor; önizlemenin aynısı olduğu için sunucuya gitmeye gerek yok.
 */

export interface CiktiDugmeleriProps {
  form: FormVerisi;
  cizim: Cizim;
}

function indir(blob: Blob, ad: string) {
  const url = URL.createObjectURL(blob);
  const bag = document.createElement("a");
  bag.href = url;
  bag.download = ad;
  document.body.appendChild(bag);
  bag.click();
  bag.remove();
  // Safari indirme başlamadan URL'i iptal edersek dosya boş iniyor.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function CiktiDugmeleri({ form, cizim }: CiktiDugmeleriProps) {
  const [calisan, setCalisan] = useState<string>("");
  const [hata, setHata] = useState("");

  async function sunucudanIndir(tur: "pdf" | "xlsx") {
    if (calisan) return;
    setCalisan(tur);
    setHata("");
    try {
      const yanit = await fetch(`/api/cikti/${tur}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!yanit.ok) {
        const veri = await yanit.json().catch(() => ({}));
        setHata(veri.hata || `${tur.toUpperCase()} indirilemedi`);
        return;
      }

      indir(await yanit.blob(), dosyaAdi(form, tur));
    } catch {
      setHata("Bağlantı hatası. İnternetinizi kontrol edin.");
    } finally {
      setCalisan("");
    }
  }

  async function pngIndir() {
    if (calisan) return;
    setCalisan("png");
    setHata("");
    try {
      const toplam = cizim.sayfalar.length;
      for (let i = 0; i < toplam; i++) {
        const blob = await sayfayiPngYap(cizim.sayfalar[i]);
        const ad = dosyaAdi(form, "png").replace(
          /\.png$/,
          toplam > 1 ? `_sayfa-${i + 1}.png` : ".png",
        );
        indir(blob, ad);
        // Tarayıcılar arka arkaya inen dosyaları engelleyebiliyor; araya nefes payı koyuyoruz.
        if (i < toplam - 1) await new Promise((r) => setTimeout(r, 400));
      }
    } catch {
      setHata("PNG oluşturulamadı");
    } finally {
      setCalisan("");
    }
  }

  const dugmeler = [
    { anahtar: "xlsx", etiket: "Excel", calistir: () => sunucudanIndir("xlsx") },
    { anahtar: "pdf", etiket: "PDF", calistir: () => sunucudanIndir("pdf") },
    { anahtar: "png", etiket: "PNG", calistir: pngIndir },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-slate-800">Çıktı al</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {cizim.sayfalar.length} sayfa
          {cizim.sayfalar.length > 1 ? " — PNG her sayfa için ayrı dosya iner" : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {dugmeler.map((d) => (
          <button
            key={d.anahtar}
            type="button"
            onClick={d.calistir}
            disabled={calisan !== ""}
            className="rounded-lg border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {calisan === d.anahtar ? "..." : d.etiket}
          </button>
        ))}
      </div>

      {hata && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {hata}
        </p>
      )}
    </section>
  );
}
