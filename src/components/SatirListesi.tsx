"use client";

import { memo, useRef, useState } from "react";
import type { FormSatiri, StokDurumu } from "@/lib/types";
import { STOK_SECENEKLERI } from "@/lib/types";

/**
 * Satır listesi.
 *
 * Sıralama iki yolla yapılabiliyor:
 *  - Sürükle-bırak (tutamaktan): masaüstünde hızlı, uzağa taşımak için pratik.
 *  - Yukarı/aşağı okları: dokunmatikte sürükleme sayfa kaydırmayla çakıştığı
 *    için güvenilir yedek. İkisi de her ekranda çalışıyor.
 *
 * Sürükleme HTML5 drag&drop yerine pointer olaylarıyla yapılıyor; böylece
 * dokunmatik ekranda da aynı kod çalışıyor (HTML5 DnD mobilde desteklenmiyor).
 */

export interface SatirListesiProps {
  satirlar: FormSatiri[];
  onDegistir: (index: number, alan: keyof Omit<FormSatiri, "id">, deger: string) => void;
  onArayaEkle: (index: number) => void;
  onSil: (index: number) => void;
  onTasi: (index: number, yon: -1 | 1) => void;
  onTurDegistir: (index: number) => void;
  /** Sürükleme bitince: kaynaktan hedefe taşı. */
  onSiraDegistir: (kaynak: number, hedef: number) => void;
}

const STOK_RENK: Record<string, string> = {
  Var: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Az: "bg-amber-50 text-amber-700 border-amber-200",
  Yok: "bg-red-50 text-red-700 border-red-200",
  "": "bg-white text-slate-500 border-slate-300",
};

interface SatirProps {
  satir: FormSatiri;
  index: number;
  sonIndex: number;
  suruklenenMi: boolean;
  hedefMi: boolean;
  onDegistir: SatirListesiProps["onDegistir"];
  onArayaEkle: SatirListesiProps["onArayaEkle"];
  onSil: SatirListesiProps["onSil"];
  onTasi: SatirListesiProps["onTasi"];
  onTurDegistir: SatirListesiProps["onTurDegistir"];
  onTutamakBasildi: (index: number, e: React.PointerEvent) => void;
  adRef: (el: HTMLInputElement | null) => void;
  onEnter: (index: number) => void;
}

const Satir = memo(function Satir({
  satir,
  index,
  sonIndex,
  suruklenenMi,
  hedefMi,
  onDegistir,
  onArayaEkle,
  onSil,
  onTasi,
  onTurDegistir,
  onTutamakBasildi,
  adRef,
  onEnter,
}: SatirProps) {
  const baslikMi = satir.tur === "baslik";

  return (
    <li
      data-satir-index={index}
      className={`group border rounded-xl p-2 sm:p-1.5 sm:rounded-lg transition-colors ${
        baslikMi ? "bg-red-50/60 border-red-200" : "bg-white border-slate-200"
      } ${suruklenenMi ? "opacity-40" : ""} ${hedefMi ? "border-blue-400 border-dashed bg-blue-50/50" : ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-1 sm:contents">
          {/* Sürükleme tutamağı. touch-none olmadan dokunmatikte tarayıcı
              kaydırmayı üstlenip pointermove olaylarını kesiyor. */}
          <button
            type="button"
            onPointerDown={(e) => onTutamakBasildi(index, e)}
            aria-label={`${index + 1}. satırı sürükleyerek taşı`}
            title="Sürükleyerek taşı"
            className="h-8 w-5 shrink-0 cursor-grab touch-none rounded text-slate-300 hover:text-slate-600 active:cursor-grabbing sm:w-4"
          >
            ⠿
          </button>

          <button
            type="button"
            onClick={() => onTurDegistir(index)}
            title={baslikMi ? "Ürün satırına çevir" : "Grup başlığı yap"}
            aria-label={`${index + 1}. satır ${baslikMi ? "grup başlığı — ürün satırına çevir" : "sıra numarası — grup başlığı yap"}`}
            className={`w-7 h-7 shrink-0 rounded-md text-center text-xs font-bold tabular-nums sm:w-8 ${
              baslikMi
                ? "bg-red-600 text-white hover:bg-red-700"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {index + 1}
          </button>

          <input
            ref={adRef}
            value={satir.malzemeAdi}
            onChange={(e) => onDegistir(index, "malzemeAdi", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter(index);
              }
            }}
            placeholder={baslikMi ? "Grup başlığı, ör. ET GRUBU" : "Malzeme adı"}
            aria-label={`${index + 1}. satır ${baslikMi ? "grup başlığı" : "malzeme adı"}`}
            className={`satir-alani flex-1 min-w-0 rounded-lg border px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:py-1.5 ${
              baslikMi
                ? "border-red-200 font-bold text-red-700 uppercase placeholder:normal-case placeholder:font-normal placeholder:text-red-300"
                : "border-slate-300"
            }`}
          />
        </div>

        {/* Mobilde girinti yok: alanlar + düğmeler 320px'e ancak sığıyor. */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!baslikMi && (
            <>
              <input
                value={satir.miktar}
                onChange={(e) => onDegistir(index, "miktar", e.target.value)}
                placeholder="Miktar"
                inputMode="text"
                aria-label={`${index + 1}. satır miktar`}
                className="satir-alani flex-1 min-w-0 rounded-lg border border-slate-300 px-2 py-2 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:flex-none sm:w-24 sm:py-1.5"
              />

              <select
                value={satir.stokDurumu}
                onChange={(e) => onDegistir(index, "stokDurumu", e.target.value as StokDurumu)}
                aria-label={`${index + 1}. satır stok durumu`}
                className={`satir-alani flex-1 min-w-0 rounded-lg border px-1.5 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:flex-none sm:w-28 sm:py-1.5 ${STOK_RENK[satir.stokDurumu] ?? STOK_RENK[""]}`}
              >
                {STOK_SECENEKLERI.map((s) => (
                  <option key={s || "bos"} value={s}>
                    {s || "Stok —"}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
            <button
              type="button"
              onClick={() => onTurDegistir(index)}
              aria-label={`${index + 1}. satırı ${baslikMi ? "ürün satırına çevir" : "grup başlığı yap"}`}
              title={baslikMi ? "Ürün satırına çevir" : "Grup başlığı yap"}
              className={`h-9 w-7 sm:w-8 shrink-0 rounded-md text-sm font-bold ${
                baslikMi
                  ? "text-red-600 bg-red-100 hover:bg-red-200"
                  : "text-slate-400 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              ¶
            </button>
            <button
              type="button"
              onClick={() => onTasi(index, -1)}
              disabled={index === 0}
              aria-label={`${index + 1}. satırı yukarı taşı`}
              title="Yukarı taşı"
              className="h-9 w-7 sm:w-8 shrink-0 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onTasi(index, 1)}
              disabled={index === sonIndex}
              aria-label={`${index + 1}. satırı aşağı taşı`}
              title="Aşağı taşı"
              className="h-9 w-7 sm:w-8 shrink-0 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onArayaEkle(index)}
              aria-label={`${index + 1}. satırın altına yeni satır ekle`}
              title="Altına satır ekle"
              className="h-9 w-7 sm:w-8 shrink-0 rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => onSil(index)}
              aria-label={`${index + 1}. satırı sil`}
              title="Satırı sil"
              className="h-9 w-7 sm:w-8 shrink-0 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </li>
  );
});

export function SatirListesi({
  satirlar,
  onDegistir,
  onArayaEkle,
  onSil,
  onTasi,
  onTurDegistir,
  onSiraDegistir,
}: SatirListesiProps) {
  // Araya satır eklendiğinde imleci yeni satıra taşımak için referansları tutuyoruz.
  const adReferanslari = useRef<(HTMLInputElement | null)[]>([]);
  const liste = useRef<HTMLUListElement | null>(null);

  const [suruklenen, setSuruklenen] = useState<number | null>(null);
  const [hedef, setHedef] = useState<number | null>(null);

  function odaklan(index: number) {
    requestAnimationFrame(() => {
      adReferanslari.current[index]?.focus();
    });
  }

  function enterBasildi(index: number) {
    onArayaEkle(index);
    odaklan(index + 1);
  }

  /** İmlecin altındaki satırın indeksini bulur. */
  function indexBul(clientY: number): number | null {
    const kok = liste.current;
    if (!kok) return null;
    const ogeler = Array.from(kok.querySelectorAll<HTMLElement>("[data-satir-index]"));
    for (const oge of ogeler) {
      const r = oge.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) {
        return Number(oge.dataset.satirIndex);
      }
    }
    // Listenin dışına taşındıysa en yakın uca yapıştır.
    if (ogeler.length === 0) return null;
    const ilk = ogeler[0].getBoundingClientRect();
    return clientY < ilk.top ? 0 : ogeler.length - 1;
  }

  function tutamakBasildi(index: number, e: React.PointerEvent) {
    e.preventDefault();
    setSuruklenen(index);
    setHedef(index);

    const hedefEl = e.currentTarget as HTMLElement;
    hedefEl.setPointerCapture(e.pointerId);

    function hareket(ev: PointerEvent) {
      const yeni = indexBul(ev.clientY);
      if (yeni !== null) setHedef(yeni);
    }

    function bitir(ev: PointerEvent) {
      hedefEl.releasePointerCapture?.(ev.pointerId);
      hedefEl.removeEventListener("pointermove", hareket);
      hedefEl.removeEventListener("pointerup", bitir);
      hedefEl.removeEventListener("pointercancel", bitir);

      const son = indexBul(ev.clientY);
      if (son !== null && son !== index) onSiraDegistir(index, son);
      setSuruklenen(null);
      setHedef(null);
    }

    hedefEl.addEventListener("pointermove", hareket);
    hedefEl.addEventListener("pointerup", bitir);
    hedefEl.addEventListener("pointercancel", bitir);
  }

  return (
    <>
      {/* Masaüstünde sütun başlıkları */}
      <div className="hidden sm:flex items-center gap-2 px-1.5 pb-1 text-xs font-medium text-slate-500">
        <span className="w-4" />
        <span className="w-8 text-center">#</span>
        <span className="flex-1">Malzeme Adı</span>
        <span className="w-24 text-center">Miktar</span>
        <span className="w-28 text-center">Stok</span>
        <span className="w-[168px]" />
      </div>

      <ul ref={liste} className="space-y-1.5">
        {satirlar.map((satir, index) => (
          <Satir
            key={satir.id}
            satir={satir}
            index={index}
            sonIndex={satirlar.length - 1}
            suruklenenMi={suruklenen === index}
            hedefMi={suruklenen !== null && hedef === index && suruklenen !== index}
            onDegistir={onDegistir}
            onArayaEkle={(i) => {
              onArayaEkle(i);
              odaklan(i + 1);
            }}
            onSil={onSil}
            onTasi={onTasi}
            onTurDegistir={onTurDegistir}
            onTutamakBasildi={tutamakBasildi}
            adRef={(el) => {
              adReferanslari.current[index] = el;
            }}
            onEnter={enterBasildi}
          />
        ))}
      </ul>

      {satirlar.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-8">
          Henüz satır yok. Aşağıdaki “Satır ekle” düğmesine basın veya yapay zeka ile hızlıca doldurun.
        </p>
      )}
    </>
  );
}
