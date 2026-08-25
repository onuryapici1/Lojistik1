"use client";

import type { FormVerisi, SayfaModu } from "@/lib/types";
import { MIN_OLCEK, MAX_OLCEK } from "@/lib/yerlesim";

/**
 * Sayfa yerleşimi kontrolleri.
 *
 * Kullanıcı Excel bilmediği için "kaç sayfa tutuyor" bilgisi en üstte ve
 * büyük gösteriliyor; sıkıştırma tek dokunuşla yapılabiliyor.
 */

export interface SayfaAyarlariProps {
  form: FormVerisi;
  sayfaSayisi: number;
  uygulananOlcek: number;
  onDegistir: (yama: Partial<FormVerisi>) => void;
}

const MODLAR: { deger: SayfaModu; etiket: string; aciklama: string }[] = [
  { deger: "tekSayfa", etiket: "Tek sayfaya sığdır", aciklama: "Yazıyı küçülterek her şeyi tek A4'e sığdırır" },
  { deger: "bol", etiket: "Sayfa sayısını sınırla", aciklama: "Belirlediğiniz sayfa sayısını aşmaz" },
  { deger: "auto", etiket: "Yazı boyutunu ben seçeyim", aciklama: "Ölçeği elle ayarlarsınız, sayfa sayısı ona göre çıkar" },
];

export function SayfaAyarlari({ form, sayfaSayisi, uygulananOlcek, onDegistir }: SayfaAyarlariProps) {
  const sikistirilmis = uygulananOlcek < MAX_OLCEK;
  const cokKucuk = uygulananOlcek <= MIN_OLCEK;

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">Sayfa düzeni</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {sikistirilmis
              ? `Yazı %${uygulananOlcek} boyutuna küçültüldü`
              : "Yazı tam boyutunda"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
            {sayfaSayisi}
          </div>
          <div className="text-xs text-slate-500 mt-1">A4 sayfa</div>
        </div>
      </div>

      {cokKucuk && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Yazı en küçük boyutta ve hâlâ sığmıyor. Sayfa sayısını artırmayı deneyin, yoksa çıktı
          okunmayabilir.
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="sr-only">Sayfa modu</legend>
        {MODLAR.map((mod) => (
          <label
            key={mod.deger}
            className={`flex gap-3 items-start rounded-lg border p-3 cursor-pointer transition ${
              form.sayfaModu === mod.deger
                ? "border-blue-500 bg-blue-50/60"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="sayfaModu"
              value={mod.deger}
              checked={form.sayfaModu === mod.deger}
              onChange={() => onDegistir({ sayfaModu: mod.deger })}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-800">{mod.etiket}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{mod.aciklama}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {form.sayfaModu === "bol" && (
        <div className="flex items-center gap-3 pl-1">
          <label htmlFor="hedefSayfa" className="text-sm text-slate-700">
            En fazla
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDegistir({ hedefSayfa: Math.max(1, form.hedefSayfa - 1) })}
              aria-label="Sayfa sayısını azalt"
              className="h-10 w-10 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              −
            </button>
            <input
              id="hedefSayfa"
              type="number"
              min={1}
              max={20}
              value={form.hedefSayfa}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onDegistir({ hedefSayfa: Math.min(20, Math.max(1, Math.round(v))) });
              }}
              className="w-16 h-10 rounded-lg border border-slate-300 text-center outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => onDegistir({ hedefSayfa: Math.min(20, form.hedefSayfa + 1) })}
              aria-label="Sayfa sayısını artır"
              className="h-10 w-10 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              +
            </button>
          </div>
          <span className="text-sm text-slate-700">sayfa</span>
        </div>
      )}

      {form.sayfaModu === "auto" && (
        <div className="space-y-1.5 pl-1">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="olcek" className="text-slate-700">
              Yazı boyutu
            </label>
            <span className="tabular-nums text-slate-500">%{form.olcek}</span>
          </div>
          <input
            id="olcek"
            type="range"
            min={MIN_OLCEK}
            max={MAX_OLCEK}
            step={1}
            value={form.olcek}
            onChange={(e) => onDegistir({ olcek: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>
      )}
    </section>
  );
}
