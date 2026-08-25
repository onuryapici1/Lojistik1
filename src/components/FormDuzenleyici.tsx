"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { SatirListesi } from "./SatirListesi";
import { YapayZekaPaneli } from "./YapayZekaPaneli";
import { SayfaAyarlari } from "./SayfaAyarlari";
import { Onizleme } from "./Onizleme";
import { CiktiDugmeleri } from "./CiktiDugmeleri";

import type { FormSatiri, FormVerisi } from "@/lib/types";
import { bosBaslik, bosForm, bosSatir } from "@/lib/types";
import { cizimUret } from "@/lib/cizim";
import { ozet } from "@/lib/yerlesim";

/** Değeri gecikmeli döndürür; her tuş vuruşunda ağır hesap yapmamak için. */
function useGecikmeli<T>(deger: T, ms: number): T {
  const [gecikmis, setGecikmis] = useState(deger);
  useEffect(() => {
    const zamanlayici = setTimeout(() => setGecikmis(deger), ms);
    return () => clearTimeout(zamanlayici);
  }, [deger, ms]);
  return gecikmis;
}

export interface FormDuzenleyiciProps {
  baslangic?: FormVerisi;
}

export function FormDuzenleyici({ baslangic }: FormDuzenleyiciProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormVerisi>(() => baslangic ?? bosForm());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [durum, setDurum] = useState("");
  const [hata, setHata] = useState("");
  const listeSonu = useRef<HTMLDivElement | null>(null);

  // Önizleme ağır olduğu için gecikmeli hesaplanıyor; sayfa sayısı anlık.
  const gecikmisForm = useGecikmeli(form, 220);
  const cizim = useMemo(() => cizimUret(gecikmisForm), [gecikmisForm]);
  const anlikOzet = useMemo(() => ozet(form), [form]);

  const yamala = useCallback((yama: Partial<FormVerisi>) => {
    setForm((f) => ({ ...f, ...yama }));
  }, []);

  const satirDegistir = useCallback(
    (index: number, alan: keyof Omit<FormSatiri, "id">, deger: string) => {
      setForm((f) => {
        const satirlar = f.satirlar.slice();
        satirlar[index] = { ...satirlar[index], [alan]: deger } as FormSatiri;
        return { ...f, satirlar };
      });
    },
    [],
  );

  const arayaEkle = useCallback((index: number) => {
    setForm((f) => {
      const satirlar = f.satirlar.slice();
      satirlar.splice(index + 1, 0, bosSatir());
      return { ...f, satirlar };
    });
  }, []);

  const sonaEkle = useCallback((adet = 1) => {
    setForm((f) => ({
      ...f,
      satirlar: [...f.satirlar, ...Array.from({ length: adet }, bosSatir)],
    }));
  }, []);

  const baslikEkle = useCallback(() => {
    setForm((f) => ({ ...f, satirlar: [...f.satirlar, bosBaslik()] }));
    setTimeout(() => listeSonu.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  }, []);

  const satirTuruDegistir = useCallback((index: number) => {
    setForm((f) => {
      const satirlar = f.satirlar.slice();
      const mevcut = satirlar[index];
      satirlar[index] =
        mevcut.tur === "baslik"
          ? { ...mevcut, tur: "urun" }
          : { ...mevcut, tur: "baslik", miktar: "", stokDurumu: "" };
      return { ...f, satirlar };
    });
  }, []);

  const satirSil = useCallback((index: number) => {
    setForm((f) => {
      const satirlar = f.satirlar.filter((_, i) => i !== index);
      return { ...f, satirlar: satirlar.length > 0 ? satirlar : [bosSatir()] };
    });
  }, []);

  const satirTasi = useCallback((index: number, yon: -1 | 1) => {
    setForm((f) => {
      const hedef = index + yon;
      if (hedef < 0 || hedef >= f.satirlar.length) return f;
      const satirlar = f.satirlar.slice();
      [satirlar[index], satirlar[hedef]] = [satirlar[hedef], satirlar[index]];
      return { ...f, satirlar };
    });
  }, []);

  /** Sürükle-bırak: satırı kaynaktan çıkarıp hedefe yerleştirir (yer değiştirme değil). */
  const siraDegistir = useCallback((kaynak: number, hedef: number) => {
    setForm((f) => {
      if (kaynak === hedef) return f;
      const satirlar = f.satirlar.slice();
      if (kaynak < 0 || kaynak >= satirlar.length || hedef < 0 || hedef >= satirlar.length) return f;
      const [tasinan] = satirlar.splice(kaynak, 1);
      satirlar.splice(hedef, 0, tasinan);
      return { ...f, satirlar };
    });
  }, []);

  const yapayZekaSonucu = useCallback(
    (gelen: FormSatiri[], mod: "ekle" | "degistir") => {
      setForm((f) => {
        if (mod === "degistir") return { ...f, satirlar: gelen };
        // Sondaki boş satırların üzerine yaz, kalanı ekle.
        const mevcut = f.satirlar.slice();
        let son = mevcut.length;
        while (son > 0) {
          const s = mevcut[son - 1];
          if (s.malzemeAdi.trim() || s.miktar.trim() || s.stokDurumu.trim()) break;
          son -= 1;
        }
        return { ...f, satirlar: [...mevcut.slice(0, son), ...gelen] };
      });
      setTimeout(() => listeSonu.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
    },
    [],
  );

  async function kaydet() {
    if (kaydediliyor) return;
    setKaydediliyor(true);
    setHata("");
    setDurum("");
    try {
      const yeniMi = !form.id;
      const yanit = await fetch(yeniMi ? "/api/form" : `/api/form/${form.id}`, {
        method: yeniMi ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const veri = await yanit.json().catch(() => ({}));
      if (!yanit.ok) {
        setHata(veri.hata || "Kaydedilemedi");
        return;
      }
      if (yeniMi && veri.form?.id) {
        router.replace(`/form/${veri.form.id}`);
      }
      setForm((f) => ({ ...f, id: veri.form?.id ?? f.id }));
      setDurum("Kaydedildi");
      setTimeout(() => setDurum(""), 3000);
    } catch {
      setHata("Bağlantı hatası. İnternetinizi kontrol edin.");
    } finally {
      setKaydediliyor(false);
    }
  }

  async function cikis() {
    await fetch("/api/cikis", { method: "POST" });
    router.replace("/giris");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2">
          <h1 className="font-bold text-slate-900 truncate">Özlem Malzeme Formu</h1>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/gecmis"
              className="rounded-lg px-2.5 sm:px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Geçmiş
            </Link>
            <button
              type="button"
              onClick={kaydet}
              disabled={kaydediliyor}
              className="rounded-lg bg-blue-600 text-white px-3 sm:px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {kaydediliyor ? "..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={cikis}
              aria-label="Çıkış yap"
              title="Çıkış yap"
              className="rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ⏻
            </button>
          </nav>
        </div>
        {(durum || hata) && (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-2">
            <p
              role="status"
              className={`text-sm rounded-lg px-3 py-1.5 ${
                hata ? "text-red-600 bg-red-50" : "text-emerald-700 bg-emerald-50"
              }`}
            >
              {hata || durum}
            </p>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="space-y-4 min-w-0">
          {/* Şube ve tarihler */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Şube</span>
              <input
                value={form.sube}
                onChange={(e) => yamala({ sube: e.target.value })}
                placeholder="Örn. Kadıköy"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Sipariş tarihi</span>
              <input
                type="date"
                value={form.siparisTarihi}
                onChange={(e) => yamala({ siparisTarihi: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">Teslim tarihi</span>
              <input
                type="date"
                value={form.teslimTarihi}
                onChange={(e) => yamala({ teslimTarihi: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </section>

          <YapayZekaPaneli onSatirlarHazir={yapayZekaSonucu} />

          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-800">Malzemeler</h2>
              <span className="text-xs text-slate-500 tabular-nums">
                {anlikOzet.doluSatir} dolu / {anlikOzet.toplamSatir} satır
              </span>
            </div>

            <SatirListesi
              satirlar={form.satirlar}
              onDegistir={satirDegistir}
              onArayaEkle={arayaEkle}
              onSil={satirSil}
              onTasi={satirTasi}
              onTurDegistir={satirTuruDegistir}
              onSiraDegistir={siraDegistir}
            />

            <div ref={listeSonu} className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => sonaEkle(1)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Satır ekle
              </button>
              <button
                type="button"
                onClick={() => sonaEkle(10)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                10 satır ekle
              </button>
              <button
                type="button"
                onClick={baslikEkle}
                className="flex-1 rounded-lg border border-red-200 text-red-700 py-2.5 text-sm font-medium hover:bg-red-50"
              >
                Grup başlığı ekle
              </button>
            </div>
          </section>
        </div>

        {/*
          Mobilde bu sütun en başa alınıyor (order-first): tek sütuna indiğinde
          aksi halde uzun malzeme listesinin altında kalıyor ve önizlemeye
          ulaşmak için sayfanın sonuna kadar kaydırmak gerekiyordu.
          Masaüstünde kaynak sırasına dönüyor, yani sağ sütun olarak kalıyor.

          Sütun içi sıra: önce önizleme, hemen altında çıktı düğmeleri. Sayfa
          düzeni ayarları daha seyrek kullanıldığı için en altta.
        */}
        <div className="order-first lg:order-none space-y-4 lg:sticky lg:top-[72px] min-w-0">
          <Onizleme cizim={cizim} />
          <CiktiDugmeleri form={form} cizim={cizim} />
          <SayfaAyarlari
            form={form}
            sayfaSayisi={anlikOzet.sayfaSayisi}
            uygulananOlcek={anlikOzet.olcek}
            onDegistir={yamala}
          />
        </div>
      </main>
    </div>
  );
}
