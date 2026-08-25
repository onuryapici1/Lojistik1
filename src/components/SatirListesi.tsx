"use client";

import { memo, useRef } from "react";
import type { FormSatiri, StokDurumu } from "@/lib/types";
import { STOK_SECENEKLERI } from "@/lib/types";

/**
 * Satır listesi.
 *
 * Sürükle-bırak yerine bilinçli olarak ok tuşları kullanılıyor: dokunmatik
 * ekranda sürükleme hem kaydırmayla çakışıyor hem de tek elle zor. Ok tuşları
 * telefonda da masaüstünde de aynı şekilde çalışıyor.
 */

export interface SatirListesiProps {
  satirlar: FormSatiri[];
  onDegistir: (index: number, alan: keyof Omit<FormSatiri, "id">, deger: string) => void;
  onArayaEkle: (index: number) => void;
  onSil: (index: number) => void;
  onTasi: (index: number, yon: -1 | 1) => void;
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
  onDegistir: SatirListesiProps["onDegistir"];
  onArayaEkle: SatirListesiProps["onArayaEkle"];
  onSil: SatirListesiProps["onSil"];
  onTasi: SatirListesiProps["onTasi"];
  adRef: (el: HTMLInputElement | null) => void;
  onEnter: (index: number) => void;
}

const Satir = memo(function Satir({
  satir,
  index,
  sonIndex,
  onDegistir,
  onArayaEkle,
  onSil,
  onTasi,
  adRef,
  onEnter,
}: SatirProps) {
  return (
    <li className="group bg-white border border-slate-200 rounded-xl p-2 sm:p-1.5 sm:rounded-lg">
      {/* Mobilde iki satır, sm ve üstünde tek satır ızgara */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2 sm:contents">
          <span className="w-7 shrink-0 text-center text-xs font-medium text-slate-400 tabular-nums sm:w-8">
            {index + 1}
          </span>

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
            placeholder="Malzeme adı"
            aria-label={`${index + 1}. satır malzeme adı`}
            className="satir-alani flex-1 min-w-0 rounded-lg border border-slate-300 px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:py-1.5"
          />
        </div>

        {/* Mobilde girinti yok: miktar + stok + 4 düğme 375px'e ancak sığıyor. */}
        <div className="flex items-center gap-1.5 sm:gap-2">
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

          <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
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
}: SatirListesiProps) {
  // Araya satır eklendiğinde imleci yeni satıra taşımak için referansları tutuyoruz.
  const adReferanslari = useRef<(HTMLInputElement | null)[]>([]);

  function odaklan(index: number) {
    // Yeni satır render edildikten sonra odaklan.
    requestAnimationFrame(() => {
      adReferanslari.current[index]?.focus();
    });
  }

  function enterBasildi(index: number) {
    onArayaEkle(index);
    odaklan(index + 1);
  }

  return (
    <>
      {/* Masaüstünde sütun başlıkları */}
      <div className="hidden sm:flex items-center gap-2 px-1.5 pb-1 text-xs font-medium text-slate-500">
        <span className="w-8 text-center">#</span>
        <span className="flex-1">Malzeme Adı</span>
        <span className="w-24 text-center">Miktar</span>
        <span className="w-28 text-center">Stok</span>
        <span className="w-[136px]" />
      </div>

      <ul className="space-y-1.5">
        {satirlar.map((satir, index) => (
          <Satir
            key={satir.id}
            satir={satir}
            index={index}
            sonIndex={satirlar.length - 1}
            onDegistir={onDegistir}
            onArayaEkle={(i) => {
              onArayaEkle(i);
              odaklan(i + 1);
            }}
            onSil={onSil}
            onTasi={onTasi}
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
