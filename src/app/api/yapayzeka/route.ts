import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { excelOku } from "@/lib/excel-oku";

import type { SatirTuru, StokDurumu } from "@/lib/types";

/**
 * Serbest metni ve/veya görselleri malzeme listesine çevirir.
 *
 * Kabul edilenler:
 *  - düz metin ("İçecekler: su, kola 5 koli...")
 *  - fotoğraf / ekran görüntüsü (el yazısı liste, WhatsApp, basılı form)
 *  - PDF
 *  - Excel dosyası (bu, yapay zekaya gitmeden doğrudan okunur)
 */

export const maxDuration = 60;

const MODEL = "gemini-3.7-flash";

/** Gemini'ye tek istekte gönderilebilecek toplam boyut sınırı 20MB; altında kalalım. */
const EN_FAZLA_TOPLAM_BAYT = 15 * 1024 * 1024;

const GORSEL_TURLERI = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const EXCEL_TURLERI = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const YONERGE = `Sen bir restoran/şube malzeme sipariş formunu dolduran yardımcısın.
Sana verilen metin, fotoğraf veya ekran görüntüsünden malzeme listesini çıkar.

Kurallar:
- Her satırın bir "tur" alanı var: "urun" veya "baslik".
- Kaynakta "ET GRUBU", "SOSLAR", "İçecekler", "Temizlik" gibi bir grup/kategori başlığı
  görürsen onu "tur":"baslik" olan AYRI bir satır yap; "malzemeAdi" alanına başlığın
  kendisini yaz (ör. "ET GRUBU"), "miktar" ve "stokDurumu" alanlarını boş bırak.
  Başlığı bir ürünün içine gömme, atlama da — kendi satırı olsun.
- Normal malzemeler "tur":"urun" olur. "malzemeAdi" alanına ürünün adını yaz.
- "miktar" alanına sayı veya "2 koli", "yarım kasa" gibi ifadeyi olduğu gibi yaz.
  Miktar belirtilmemişse boş bırak.
- "stokDurumu" yalnızca şunlardan biri olabilir: "Var", "Az", "Yok" veya boş.
  Metinde stok durumu geçmiyorsa boş bırak.
- Sırayı kaynaktaki sırayla koru.
- Aynı ürün birden fazla geçiyorsa tek satırda birleştir.
- El yazısını okuyamadığın yerde tahmin etme, o satırı atla.
- Türkçe karakterleri doğru yaz.`;

const SEMA = {
  type: Type.OBJECT,
  properties: {
    satirlar: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tur: { type: Type.STRING, format: "enum", enum: ["urun", "baslik"] },
          malzemeAdi: { type: Type.STRING },
          miktar: { type: Type.STRING },
          stokDurumu: { type: Type.STRING },
        },
        required: ["tur", "malzemeAdi"],
      },
    },
  },
  required: ["satirlar"],
};

interface GelenDosya {
  mimeType: string;
  /** base64, "data:...;base64," öneki olmadan */
  veri: string;
  ad?: string;
}

function stokNormalle(ham: unknown): StokDurumu {
  const s = String(ham ?? "").trim().toLocaleLowerCase("tr");
  if (s.startsWith("var")) return "Var";
  if (s.startsWith("az")) return "Az";
  if (s.startsWith("yok")) return "Yok";
  return "";
}

function turNormalle(ham: unknown): SatirTuru {
  return ham === "baslik" ? "baslik" : "urun";
}

export async function POST(request: Request) {
  let govde: { metin?: string; dosyalar?: GelenDosya[] };
  try {
    govde = await request.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  }

  const metin = typeof govde.metin === "string" ? govde.metin.trim().slice(0, 20000) : "";
  const dosyalar = Array.isArray(govde.dosyalar) ? govde.dosyalar.slice(0, 8) : [];

  if (!metin && dosyalar.length === 0) {
    return NextResponse.json({ hata: "Metin yazın veya bir görsel yükleyin" }, { status: 400 });
  }

  // Excel dosyalarını doğrudan oku; yapay zekaya gerek yok.
  const excelDosyalari = dosyalar.filter((d) => EXCEL_TURLERI.has(d.mimeType));
  const excelSatirlari: { tur: SatirTuru; malzemeAdi: string; miktar: string; stokDurumu: StokDurumu }[] = [];
  for (const d of excelDosyalari) {
    try {
      excelSatirlari.push(...(await excelOku(d.veri)));
    } catch {
      return NextResponse.json(
        { hata: `Excel dosyası okunamadı: ${d.ad ?? "dosya"}` },
        { status: 400 },
      );
    }
  }

  const yapayZekaDosyalari = dosyalar.filter((d) => GORSEL_TURLERI.has(d.mimeType));
  const bilinmeyen = dosyalar.filter(
    (d) => !GORSEL_TURLERI.has(d.mimeType) && !EXCEL_TURLERI.has(d.mimeType),
  );
  if (bilinmeyen.length > 0) {
    return NextResponse.json(
      {
        hata: `Desteklenmeyen dosya türü: ${bilinmeyen.map((d) => d.ad ?? d.mimeType).join(", ")}. PNG, JPEG, WEBP, HEIC, PDF veya Excel yükleyin.`,
      },
      { status: 400 },
    );
  }

  // Sadece Excel yüklendiyse yapay zekayı hiç çağırma.
  if (!metin && yapayZekaDosyalari.length === 0) {
    return NextResponse.json({ satirlar: excelSatirlari, kaynak: "excel" });
  }

  const toplamBayt = yapayZekaDosyalari.reduce((t, d) => t + d.veri.length * 0.75, 0);
  if (toplamBayt > EN_FAZLA_TOPLAM_BAYT) {
    return NextResponse.json(
      { hata: "Yüklenen görseller çok büyük. Daha az veya daha küçük dosya deneyin." },
      { status: 413 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { hata: "GEMINI_API_KEY tanımlı değil. Vercel > Settings > Environment Variables'a ekleyin." },
      { status: 500 },
    );
  }

  const parcalar: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
  if (metin) parcalar.push({ text: metin });
  for (const d of yapayZekaDosyalari) {
    parcalar.push({ inlineData: { mimeType: d.mimeType, data: d.veri } });
  }
  if (!metin) {
    parcalar.push({ text: "Bu görsellerdeki malzeme listesini çıkar." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const yanit = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: parcalar }],
      config: {
        systemInstruction: YONERGE,
        responseMimeType: "application/json",
        responseSchema: SEMA,
        temperature: 0,
      },
    });

    const ham = yanit.text;
    if (!ham) {
      return NextResponse.json({ hata: "Yapay zeka boş yanıt döndü, tekrar deneyin" }, { status: 502 });
    }

    let cozulmus: { satirlar?: unknown[] };
    try {
      cozulmus = JSON.parse(ham);
    } catch {
      return NextResponse.json({ hata: "Yapay zeka yanıtı okunamadı, tekrar deneyin" }, { status: 502 });
    }

    const satirlar = (Array.isArray(cozulmus.satirlar) ? cozulmus.satirlar : [])
      .map((s) => {
        const o = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
        const tur = turNormalle(o.tur);
        return {
          tur,
          malzemeAdi: String(o.malzemeAdi ?? "").trim().slice(0, 300),
          miktar: tur === "baslik" ? "" : String(o.miktar ?? "").trim().slice(0, 60),
          stokDurumu: tur === "baslik" ? "" : stokNormalle(o.stokDurumu),
        };
      })
      .filter((s) => s.malzemeAdi.length > 0);

    const hepsi = [...excelSatirlari, ...satirlar];
    if (hepsi.length === 0) {
      return NextResponse.json(
        { hata: "Malzeme bulunamadı. Daha net bir fotoğraf veya daha açık bir metin deneyin." },
        { status: 422 },
      );
    }

    return NextResponse.json({ satirlar: hepsi, kaynak: "yapayzeka" });
  } catch (e) {
    const mesaj = (e as Error).message ?? "bilinmeyen hata";
    return NextResponse.json({ hata: `Yapay zeka çağrısı başarısız: ${mesaj}` }, { status: 502 });
  }
}
