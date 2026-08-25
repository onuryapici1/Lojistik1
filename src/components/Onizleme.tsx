"use client";

import { useEffect, useRef, useState } from "react";
import type { Cizim } from "@/lib/cizim";
import { sayfayiCiz, ONIZLEME_DPI } from "@/lib/cizim-canvas";

/**
 * A4 önizlemesi.
 *
 * Çıktının birebir aynısı; PDF ve PNG ile aynı çizim komutlarını kullanıyor,
 * o yüzden "önizlemede böyle görünüyordu ama çıktı farklı" durumu olmuyor.
 */

export interface OnizlemeProps {
  cizim: Cizim;
}

export function Onizleme({ cizim }: OnizlemeProps) {
  const tuval = useRef<HTMLCanvasElement | null>(null);
  const [sayfaIndex, setSayfaIndex] = useState(0);

  const toplam = cizim.sayfalar.length;
  // Sayfa sayısı azalırsa seçili sayfa aralık dışında kalabilir; state'i efektle
  // düzeltmek yerine burada sınırlıyoruz ve gezinme düğmeleri de bunu temel alıyor.
  const gecerliIndex = Math.max(0, Math.min(sayfaIndex, toplam - 1));

  useEffect(() => {
    const canvas = tuval.current;
    const sayfa = cizim.sayfalar[gecerliIndex];
    if (!canvas || !sayfa) return;
    // Retina ekranlarda bulanık olmasın diye iki kat çözünürlükte çiziyoruz.
    const dpi = ONIZLEME_DPI * (typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1);
    sayfayiCiz(canvas, sayfa, { dpi });
  }, [cizim, gecerliIndex]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800">Önizleme</h2>
        {toplam > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSayfaIndex(Math.max(0, gecerliIndex - 1))}
              disabled={gecerliIndex === 0}
              aria-label="Önceki sayfa"
              className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
            >
              ‹
            </button>
            <span className="text-sm text-slate-600 tabular-nums px-1 min-w-[64px] text-center">
              {gecerliIndex + 1} / {toplam}
            </span>
            <button
              type="button"
              onClick={() => setSayfaIndex(Math.min(toplam - 1, gecerliIndex + 1))}
              disabled={gecerliIndex === toplam - 1}
              aria-label="Sonraki sayfa"
              className="h-9 w-9 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-100 rounded-lg p-2 sm:p-3 overflow-x-auto">
        <canvas
          ref={tuval}
          className="block mx-auto w-full h-auto max-w-[520px] bg-white shadow-sm rounded"
          style={{ aspectRatio: "210 / 297" }}
          aria-label={`Form önizlemesi, sayfa ${gecerliIndex + 1} / ${toplam}`}
        />
      </div>
    </section>
  );
}
