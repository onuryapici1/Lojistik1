"use client";

import { useRef, useState } from "react";
import type { FormSatiri } from "@/lib/types";
import { yeniId } from "@/lib/types";

/**
 * Serbest metin ve/veya görselden malzeme listesi çıkarır.
 *
 * Telefon fotoğrafları 3-5 MB geldiği için yüklemeden önce tarayıcıda
 * küçültülüyor; hem istek sınırına takılmıyor hem de çok daha hızlı.
 */

const KABUL_EDILEN =
  "image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf,.xlsx,.xls";

/** Küçültme sonrası uzun kenar. Yazı okunaklılığı için yeterli. */
const EN_UZUN_KENAR = 2000;
const KUCULTME_ESIGI_BAYT = 1_200_000;

interface YuklenenDosya {
  ad: string;
  mimeType: string;
  veri: string; // base64, önek yok
  boyut: number;
  onizleme?: string;
}

async function dosyayiOku(dosya: File): Promise<string> {
  return new Promise((cozumle, reddet) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      const sonuc = String(okuyucu.result);
      const virgul = sonuc.indexOf(",");
      cozumle(virgul >= 0 ? sonuc.slice(virgul + 1) : sonuc);
    };
    okuyucu.onerror = () => reddet(new Error("Dosya okunamadı"));
    okuyucu.readAsDataURL(dosya);
  });
}

/** Büyük fotoğrafları JPEG'e çevirip küçültür. Başarısız olursa orijinali döner. */
async function kucult(dosya: File): Promise<{ mimeType: string; veri: string }> {
  const gorselMi = dosya.type.startsWith("image/");
  if (!gorselMi || dosya.size < KUCULTME_ESIGI_BAYT) {
    return { mimeType: dosya.type, veri: await dosyayiOku(dosya) };
  }

  try {
    const bitmap = await createImageBitmap(dosya);
    const oran = Math.min(1, EN_UZUN_KENAR / Math.max(bitmap.width, bitmap.height));
    if (oran >= 1) {
      bitmap.close();
      return { mimeType: dosya.type, veri: await dosyayiOku(dosya) };
    }

    const tuval = document.createElement("canvas");
    tuval.width = Math.round(bitmap.width * oran);
    tuval.height = Math.round(bitmap.height * oran);
    const ctx = tuval.getContext("2d");
    if (!ctx) throw new Error("canvas yok");
    ctx.drawImage(bitmap, 0, 0, tuval.width, tuval.height);
    bitmap.close();

    const veriUrl = tuval.toDataURL("image/jpeg", 0.85);
    return { mimeType: "image/jpeg", veri: veriUrl.slice(veriUrl.indexOf(",") + 1) };
  } catch {
    // HEIC gibi tarayıcının çözemediği biçimlerde olduğu gibi gönder.
    return { mimeType: dosya.type, veri: await dosyayiOku(dosya) };
  }
}

export interface YapayZekaPaneliProps {
  onSatirlarHazir: (satirlar: FormSatiri[], mod: "ekle" | "degistir") => void;
}

export function YapayZekaPaneli({ onSatirlarHazir }: YapayZekaPaneliProps) {
  const [acik, setAcik] = useState(true);
  const [metin, setMetin] = useState("");
  const [dosyalar, setDosyalar] = useState<YuklenenDosya[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [durum, setDurum] = useState("");

  const dosyaGirdi = useRef<HTMLInputElement | null>(null);
  const kameraGirdi = useRef<HTMLInputElement | null>(null);

  async function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const secilenler = Array.from(e.target.files ?? []);
    e.target.value = ""; // aynı dosya tekrar seçilebilsin
    if (secilenler.length === 0) return;

    setHata("");
    setDurum("Görseller hazırlanıyor...");
    try {
      const yeniler: YuklenenDosya[] = [];
      for (const dosya of secilenler.slice(0, 8)) {
        const { mimeType, veri } = await kucult(dosya);
        yeniler.push({
          ad: dosya.name,
          mimeType: mimeType || "application/octet-stream",
          veri,
          boyut: Math.round(veri.length * 0.75),
          onizleme: mimeType.startsWith("image/") ? `data:${mimeType};base64,${veri}` : undefined,
        });
      }
      setDosyalar((oncekiler) => [...oncekiler, ...yeniler].slice(0, 8));
    } catch {
      setHata("Dosya okunamadı. Başka bir dosya deneyin.");
    } finally {
      setDurum("");
    }
  }

  function dosyaSil(index: number) {
    setDosyalar((d) => d.filter((_, i) => i !== index));
  }

  async function gonder(mod: "ekle" | "degistir") {
    if (yukleniyor) return;
    if (!metin.trim() && dosyalar.length === 0) {
      setHata("Bir şeyler yazın veya görsel yükleyin");
      return;
    }

    setYukleniyor(true);
    setHata("");
    setDurum(dosyalar.length > 0 ? "Görsel okunuyor..." : "Liste çıkarılıyor...");

    try {
      const yanit = await fetch("/api/yapayzeka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metin: metin.trim(),
          dosyalar: dosyalar.map((d) => ({ mimeType: d.mimeType, veri: d.veri, ad: d.ad })),
        }),
      });

      const veri = await yanit.json().catch(() => ({}));
      if (!yanit.ok) {
        setHata(veri.hata || "Liste çıkarılamadı");
        return;
      }

      const gelen: FormSatiri[] = (veri.satirlar ?? []).map(
        (s: { tur?: string; malzemeAdi?: string; miktar?: string; stokDurumu?: string }) => ({
          id: yeniId(),
          tur: s.tur === "baslik" ? "baslik" : "urun",
          malzemeAdi: s.malzemeAdi ?? "",
          miktar: s.miktar ?? "",
          stokDurumu: (s.stokDurumu ?? "") as FormSatiri["stokDurumu"],
        }),
      );

      if (gelen.length === 0) {
        setHata("Malzeme bulunamadı");
        return;
      }

      onSatirlarHazir(gelen, mod);
      setMetin("");
      setDosyalar([]);
      setDurum(`${gelen.length} satır ${mod === "ekle" ? "eklendi" : "yazıldı"}`);
      setTimeout(() => setDurum(""), 3000);
    } catch {
      setHata("Bağlantı hatası. İnternetinizi kontrol edin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={acik}
      >
        <span className="font-semibold text-slate-800">Yapay zeka ile doldur</span>
        <span className="text-slate-400 text-sm">{acik ? "gizle" : "göster"}</span>
      </button>

      {acik && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Ürünleri serbestçe yazın, ya da elle yazılmış listenin fotoğrafını, WhatsApp ekran
            görüntüsünü, PDF veya Excel dosyasını yükleyin. Yapay zeka listeyi satır satır çıkarır.
          </p>

          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            rows={3}
            placeholder="Örnek: İçecekler: su 10 koli, kola 5 kasa. Temizlik: deterjan 2, sünger 20 adet"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => kameraGirdi.current?.click()}
              className="flex-1 sm:flex-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Fotoğraf çek
            </button>
            <button
              type="button"
              onClick={() => dosyaGirdi.current?.click()}
              className="flex-1 sm:flex-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dosya seç
            </button>
          </div>

          <input
            ref={kameraGirdi}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={dosyaSecildi}
            className="hidden"
          />
          <input
            ref={dosyaGirdi}
            type="file"
            accept={KABUL_EDILEN}
            multiple
            onChange={dosyaSecildi}
            className="hidden"
          />

          {dosyalar.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {dosyalar.map((d, i) => (
                <li
                  key={`${d.ad}-${i}`}
                  className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                >
                  {d.onizleme ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.onizleme} alt={d.ad} className="h-20 w-20 object-cover" />
                  ) : (
                    <div className="h-20 w-20 flex items-center justify-center text-[10px] text-slate-500 px-1 text-center break-all">
                      {d.ad.slice(0, 24)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => dosyaSil(i)}
                    aria-label={`${d.ad} dosyasını kaldır`}
                    className="absolute top-0.5 right-0.5 h-6 w-6 rounded-full bg-white/90 text-slate-600 text-sm shadow hover:bg-white"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hata && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {hata}
            </p>
          )}
          {durum && !hata && <p className="text-sm text-slate-500">{durum}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => gonder("ekle")}
              disabled={yukleniyor}
              className="flex-1 rounded-lg bg-blue-600 text-white font-medium py-2.5 disabled:opacity-50 hover:bg-blue-700"
            >
              {yukleniyor ? "İşleniyor..." : "Listeye ekle"}
            </button>
            <button
              type="button"
              onClick={() => gonder("degistir")}
              disabled={yukleniyor}
              className="flex-1 rounded-lg border border-slate-300 text-slate-700 font-medium py-2.5 disabled:opacity-50 hover:bg-slate-50"
            >
              Listeyi değiştir
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
