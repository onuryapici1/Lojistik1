"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Cizim } from "@/lib/cizim";
import { sayfayiCiz, ONIZLEME_DPI } from "@/lib/cizim-canvas";

/**
 * A4 önizlemesi.
 *
 * Çıktının birebir aynısı; PDF ve PNG ile aynı çizim komutlarını kullanıyor,
 * o yüzden "önizlemede böyle görünüyordu ama çıktı farklı" durumu olmuyor.
 *
 * Küçük kart yalnızca genel görünümü verir; okunaklı incelemek için "Büyüt"
 * tam ekran bir görünüm açar (yakınlaştırma düğmeleri + fare tekerleği).
 */

export interface OnizlemeProps {
  cizim: Cizim;
}

const MIN_YAKINLASTIRMA = 0.5;
const MAX_YAKINLASTIRMA = 3;
const BUYUK_DPI = ONIZLEME_DPI * 2.5;

export function Onizleme({ cizim }: OnizlemeProps) {
  const tuval = useRef<HTMLCanvasElement | null>(null);
  const buyukTuval = useRef<HTMLCanvasElement | null>(null);
  const [sayfaIndex, setSayfaIndex] = useState(0);
  const [buyutulduMu, setBuyutulduMu] = useState(false);
  const [yakinlastirma, setYakinlastirma] = useState(1);

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

  useEffect(() => {
    if (!buyutulduMu) return;
    const canvas = buyukTuval.current;
    const sayfa = cizim.sayfalar[gecerliIndex];
    if (!canvas || !sayfa) return;
    sayfayiCiz(canvas, sayfa, { dpi: BUYUK_DPI });
  }, [cizim, gecerliIndex, buyutulduMu]);

  // Modal açıkken sayfa arkada kaymasın.
  useEffect(() => {
    if (!buyutulduMu) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = onceki;
    };
  }, [buyutulduMu]);

  useEffect(() => {
    if (!buyutulduMu) return;
    function tusaBasildi(e: KeyboardEvent) {
      if (e.key === "Escape") setBuyutulduMu(false);
      else if (e.key === "ArrowLeft") setSayfaIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setSayfaIndex((i) => Math.min(toplam - 1, i + 1));
    }
    window.addEventListener("keydown", tusaBasildi);
    return () => window.removeEventListener("keydown", tusaBasildi);
  }, [buyutulduMu, toplam]);

  function ac() {
    setYakinlastirma(1);
    setBuyutulduMu(true);
  }

  function tekerlekleYakinlastir(e: React.WheelEvent) {
    e.preventDefault();
    setYakinlastirma((y) => Math.min(MAX_YAKINLASTIRMA, Math.max(MIN_YAKINLASTIRMA, y - e.deltaY * 0.001)));
  }

  return (
    <>
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-800">Önizleme</h2>
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={ac}
              className="rounded-lg border border-slate-300 px-3 h-9 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Büyüt
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={ac}
          aria-label="Önizlemeyi büyüt"
          className="w-full bg-slate-100 rounded-lg p-2 sm:p-3 overflow-x-auto cursor-zoom-in"
        >
          {/* Mobilde yükseklik sınırlı: A4 oranında tam genişlik verilirse
              önizleme neredeyse bütün ekranı kaplıyor ve forma ulaşmak için
              kaydırmak gerekiyor. Masaüstünde genişliğe göre ölçekleniyor. */}
          <canvas
            ref={tuval}
            className="block mx-auto h-[46vh] w-auto max-w-full bg-white shadow-sm rounded pointer-events-none sm:h-auto sm:w-full sm:max-w-[520px]"
            style={{ aspectRatio: "210 / 297" }}
            aria-label={`Form önizlemesi, sayfa ${gecerliIndex + 1} / ${toplam}`}
          />
        </button>
      </section>

      {/* buyutulduMu yalnızca kullanıcı tıklamasıyla true olur, yani portal hiçbir
          zaman sunucu render'ında kurulmaz — ayrıca bir "tarayıcıda mıyız" bayrağı
          tutmaya gerek yok. */}
      {buyutulduMu &&
        createPortal(
          // document.body'ye taşınıyor: önizleme paneli `sticky` bir kapsayıcının
          // içinde ve sticky kendi yığın bağlamını oluşturuyor. Modal orada
          // kalsaydı z-50 olmasına rağmen sayfa başlığının (z-10) altında çizilir,
          // kapatma düğmesi başlığın arkasında kalırdı.
          <div
            className="fixed inset-0 z-50 bg-slate-900/80 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Büyütülmüş form önizlemesi"
          >
            <div className="flex items-center justify-between gap-2 p-3 text-white shrink-0">
            <div className="flex items-center gap-2">
              {toplam > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSayfaIndex(Math.max(0, gecerliIndex - 1))}
                    disabled={gecerliIndex === 0}
                    aria-label="Önceki sayfa"
                    className="h-10 w-10 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20"
                  >
                    ‹
                  </button>
                  <span className="text-sm tabular-nums px-1 min-w-[64px] text-center">
                    {gecerliIndex + 1} / {toplam}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSayfaIndex(Math.min(toplam - 1, gecerliIndex + 1))}
                    disabled={gecerliIndex === toplam - 1}
                    aria-label="Sonraki sayfa"
                    className="h-10 w-10 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setYakinlastirma((y) => Math.max(MIN_YAKINLASTIRMA, y - 0.25))}
                aria-label="Uzaklaştır"
                className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20"
              >
                −
              </button>
              <span className="text-sm tabular-nums w-14 text-center">
                %{Math.round(yakinlastirma * 100)}
              </span>
              <button
                type="button"
                onClick={() => setYakinlastirma((y) => Math.min(MAX_YAKINLASTIRMA, y + 0.25))}
                aria-label="Yakınlaştır"
                className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setYakinlastirma(1)}
                className="h-10 rounded-lg bg-white/10 hover:bg-white/20 px-3 text-sm"
              >
                Sığdır
              </button>
            </div>

              <button
                type="button"
                onClick={() => setBuyutulduMu(false)}
                aria-label="Kapat"
                title="Kapat (Esc)"
                className="h-10 w-10 rounded-lg bg-white/15 hover:bg-white/30 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Boş alana tıklayınca kapansın: tıklama tuvalin kendisine değil,
                çevresindeki boşluğa geldiyse modal kapanır. */}
            <div
              className="flex-1 overflow-auto"
              onWheel={tekerlekleYakinlastir}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("canvas")) setBuyutulduMu(false);
              }}
            >
              <div
                className="min-h-full flex items-center justify-center p-4"
                style={{ minWidth: `${100 * yakinlastirma}%` }}
              >
                <canvas
                  ref={buyukTuval}
                  className="bg-white shadow-2xl rounded"
                  style={{
                    width: `min(80vw, ${560 * yakinlastirma}px)`,
                    height: "auto",
                    aspectRatio: "210 / 297",
                  }}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
