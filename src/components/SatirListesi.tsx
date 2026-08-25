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
  /** Bu satır şu an parmağın/farenin altında taşınıyor mu. */
  suruklenenMi: boolean;
  /** Satırın dikeyde kaç piksel ötelenmesi gerektiği (sürükleme animasyonu). */
  kaydirma: number;
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
  kaydirma,
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
      style={{
        transform: kaydirma ? `translateY(${kaydirma}px)` : undefined,
        // Taşınan satır parmağı gecikmesiz izlemeli; diğerleri yumuşak kaysın.
        transition: suruklenenMi ? "none" : "transform 150ms ease",
      }}
      className={`group border rounded-xl p-2 sm:p-1.5 sm:rounded-lg ${
        baslikMi ? "bg-red-50/60 border-red-200" : "bg-white border-slate-200"
      } ${
        suruklenenMi
          ? "relative z-20 shadow-xl ring-2 ring-blue-400 cursor-grabbing select-none"
          : "transition-colors"
      }`}
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

  /**
   * Sürükleme durumu.
   * `dy`: taşınan satırın başlangıç konumuna göre dikey ötelemesi (px).
   * `adim`: bir satırın kapladığı dikey mesafe (yükseklik + aradaki boşluk).
   */
  const [surukleme, setSurukleme] = useState<{
    kaynak: number;
    hedef: number;
    dy: number;
    adim: number;
  } | null>(null);

  function odaklan(index: number) {
    requestAnimationFrame(() => {
      adReferanslari.current[index]?.focus();
    });
  }

  function enterBasildi(index: number) {
    onArayaEkle(index);
    odaklan(index + 1);
  }

  /**
   * Sürükleme başlarkenki satır konumları.
   *
   * Sürükleme sırasında satırlara translateY uygulandığı için
   * getBoundingClientRect() kaymış konumu döndürür — özellikle taşınan satır
   * imlecin altına geldiği için hedef hep "kendisi" çıkar ve sıralama hiç
   * uygulanmazdı. Bu yüzden konumları bir kez, hareket başlamadan ölçüyoruz.
   */
  const baslangicKutulari = useRef<{ ust: number; alt: number; index: number }[]>([]);
  const baslangicScrollY = useRef(0);

  function kutulariOl() {
    const kok = liste.current;
    baslangicScrollY.current = window.scrollY;
    baslangicKutulari.current = kok
      ? Array.from(kok.querySelectorAll<HTMLElement>("[data-satir-index]")).map((oge) => {
          const r = oge.getBoundingClientRect();
          return { ust: r.top, alt: r.bottom, index: Number(oge.dataset.satirIndex) };
        })
      : [];
  }

  /** İmlecin altındaki satırın indeksini, sürükleme öncesi düzene göre bulur. */
  function indexBul(clientY: number): number | null {
    const kutular = baslangicKutulari.current;
    if (kutular.length === 0) return null;
    // Sürükleme sırasında sayfa kaydıysa telafi et.
    const y = clientY + (window.scrollY - baslangicScrollY.current);
    for (const kutu of kutular) {
      if (y >= kutu.ust && y <= kutu.alt) return kutu.index;
    }
    // Listenin dışına taşındıysa en yakın uca yapıştır.
    return y < kutular[0].ust ? kutular[0].index : kutular[kutular.length - 1].index;
  }

  /** Bir satırın kapladığı dikey mesafe: yükseklik + satırlar arası boşluk. */
  function adimOlc(): number {
    const kok = liste.current;
    if (!kok) return 0;
    const ogeler = kok.querySelectorAll<HTMLElement>("[data-satir-index]");
    if (ogeler.length === 0) return 0;
    if (ogeler.length === 1) return ogeler[0].getBoundingClientRect().height + 6;
    // İki komşunun üst kenarları arası = yükseklik + boşluk
    return (
      ogeler[1].getBoundingClientRect().top - ogeler[0].getBoundingClientRect().top
    );
  }

  function tutamakBasildi(index: number, e: React.PointerEvent) {
    e.preventDefault();

    const adim = adimOlc();
    kutulariOl(); // dönüşümler uygulanmadan önce ölçülmeli
    const baslangicY = e.clientY;
    setSurukleme({ kaynak: index, hedef: index, dy: 0, adim });

    const tutamakEl = e.currentTarget as HTMLElement;
    tutamakEl.setPointerCapture(e.pointerId);

    function hareket(ev: PointerEvent) {
      const yeni = indexBul(ev.clientY);
      setSurukleme((s) =>
        s ? { ...s, dy: ev.clientY - baslangicY, hedef: yeni ?? s.hedef } : s,
      );
    }

    function bitir(ev: PointerEvent) {
      tutamakEl.releasePointerCapture?.(ev.pointerId);
      tutamakEl.removeEventListener("pointermove", hareket);
      tutamakEl.removeEventListener("pointerup", bitir);
      tutamakEl.removeEventListener("pointercancel", bitir);

      const son = indexBul(ev.clientY);
      if (son !== null && son !== index) onSiraDegistir(index, son);
      setSurukleme(null);
    }

    tutamakEl.addEventListener("pointermove", hareket);
    tutamakEl.addEventListener("pointerup", bitir);
    tutamakEl.addEventListener("pointercancel", bitir);
  }

  /**
   * Bir satırın sürükleme sırasında ne kadar öteleneceği.
   * Taşınan satır parmağı izler; aradaki satırlar bir adım kayarak yer açar.
   */
  function kaydirmaHesapla(index: number): number {
    if (!surukleme) return 0;
    const { kaynak, hedef, dy, adim } = surukleme;
    if (index === kaynak) return dy;
    if (hedef > kaynak && index > kaynak && index <= hedef) return -adim;
    if (hedef < kaynak && index >= hedef && index < kaynak) return adim;
    return 0;
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
            suruklenenMi={surukleme?.kaynak === index}
            kaydirma={kaydirmaHesapla(index)}
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
