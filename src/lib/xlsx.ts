/**
 * Excel çıktısı.
 *
 * Sayfalama PDF ile aynı motordan (yerlesim.ts) geliyor, böylece "önizlemede
 * 2 sayfa, Excel'de 3 sayfa" durumu oluşmuyor. Her A4 sayfası arasına gerçek
 * bir sayfa sonu konuyor.
 */

import ExcelJS from "exceljs";

import type { FormVerisi } from "./types";
import { tarihGoster, TARIH_KALIBI } from "./types";
import { sayfala, SUTUN_GENISLIK, VARSAYILAN_NOTLAR } from "./yerlesim";

const KIRMIZI = "FFB91C1C";

/** mm cinsinden sütun genişliğini Excel'in karakter birimine çevirir (kabaca). */
function mmToKarakter(mm: number): number {
  return Math.round((mm / 1.9) * 10) / 10;
}

const INCE_KENAR = { style: "thin" as const, color: { argb: "FF94A3B8" } };
const KALIN_KENAR = { style: "medium" as const, color: { argb: "FF334155" } };

const SOL_BASLIKLAR = ["Sıra", "Malzeme Adı", "Miktar", "Stok Durumu"];
const SAG_BASLIKLAR = ["Malzeme Adı", "Miktar", "Stok Durumu"];
/** Sağ blok E sütunundan başlar (A-D sol blok). */
const SAG_BLOK_ILK_KOLON = 5;
const SON_KOLON = 7;

export async function xlsxUret(form: FormVerisi): Promise<Buffer> {
  const yerlesim = sayfala(form);

  const kitap = new ExcelJS.Workbook();
  kitap.creator = "Özlem Malzeme Formu";
  kitap.created = new Date();

  const sayfa = kitap.addWorksheet("Malzeme Sipariş Formu", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0, // yüksekliği sayfa sonlarına bırak
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  // Yedi sütun, şablonla birebir: A=Sıra, B-D sol blok, E-G sağ blok.
  // "Sıra" yalnızca sol blokta var, bu yüzden sağ blok üç sütun.
  sayfa.columns = [
    { width: mmToKarakter(SUTUN_GENISLIK.sira) },
    { width: mmToKarakter(SUTUN_GENISLIK.malzemeAdi) },
    { width: mmToKarakter(SUTUN_GENISLIK.miktar) },
    { width: mmToKarakter(SUTUN_GENISLIK.stokDurumu) },
    { width: mmToKarakter(SUTUN_GENISLIK.malzemeAdi) },
    { width: mmToKarakter(SUTUN_GENISLIK.miktar) },
    { width: mmToKarakter(SUTUN_GENISLIK.stokDurumu) },
  ];

  let satirNo = 1;

  /**
   * Bir bloğun tek mantıksal satırını yazar.
   *
   * Sol blokta "Sıra" sütunu var, sağ blokta yok (şablon böyle). Grup başlığı
   * satırlarında (ör. "ET GRUBU") malzeme+miktar+stok hücreleri yatay
   * birleştirilip kalın kırmızı tek hücre olarak basılır.
   *
   * Uzun malzeme adları PDF'te iki satıra kaydığı için burada da iki Excel
   * satırı kaplıyor: hücreler dikey birleştirilip metin kaydırma açılıyor.
   * Böylece iki çıktı aynı hizada kalıyor.
   *
   * @param ilkKolon Bloğun ilk Excel kolonu (sol=1, sağ=5).
   * @param siraNo Sol blokta yazılacak sıra numarası; sağ blokta null.
   * @param birim Kaç Excel satırı kaplayacağı (1 veya 2).
   */
  function blokSatirYaz(
    ustSatirNo: number,
    ilkKolon: number,
    siraNo: number | null,
    veri: { tur: string; malzemeAdi: string; miktar: string; stokDurumu: string } | undefined,
    birim = 1,
  ) {
    const altSatirNo = ustSatirNo + birim - 1;
    const satir = sayfa.getRow(ustSatirNo);

    /** Hücreyi (gerekiyorsa dikey birleştirerek) hazırlar. */
    const hucreAl = (kolon: number) => {
      if (birim > 1) sayfa.mergeCells(ustSatirNo, kolon, altSatirNo, kolon);
      const h = satir.getCell(kolon);
      h.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
      return h;
    };

    // Sol blokta ilk kolon "Sıra"; veri kolonları ondan sonra başlar.
    let veriIlkKolon = ilkKolon;
    if (siraNo !== null) {
      const siraHucre = hucreAl(ilkKolon);
      siraHucre.value = siraNo;
      siraHucre.font = { name: "Arial", size: 9, color: { argb: "FF9CA3AF" } };
      siraHucre.alignment = { horizontal: "center", vertical: "middle" };
      veriIlkKolon = ilkKolon + 1;
    }

    if (veri?.tur === "baslik") {
      // Başlık: üç veri sütunu yatay birleşir (birim>1 ise dikeyde de).
      sayfa.mergeCells(ustSatirNo, veriIlkKolon, altSatirNo, veriIlkKolon + 2);
      const metinHucre = satir.getCell(veriIlkKolon);
      metinHucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
      metinHucre.value = veri.malzemeAdi || null;
      metinHucre.font = { name: "Arial", size: 9, bold: true, color: { argb: KIRMIZI } };
      metinHucre.alignment = { horizontal: "left", vertical: "middle", wrapText: birim > 1 };
      return;
    }

    const degerler: (string | null)[] = [
      veri?.malzemeAdi || null,
      veri?.miktar || null,
      veri?.stokDurumu || null,
    ];
    degerler.forEach((deger, k) => {
      const hucre = hucreAl(veriIlkKolon + k);
      hucre.value = deger;
      hucre.font = { name: "Arial", size: 9 };
      hucre.alignment = {
        horizontal: k === 0 ? "left" : "center",
        vertical: "middle",
        // Yalnızca malzeme adı kayabiliyor.
        wrapText: k === 0 && birim > 1,
      };
    });
  }

  function baslikSatiriYaz() {
    const satir = sayfa.getRow(satirNo);
    [...SOL_BASLIKLAR, ...SAG_BASLIKLAR].forEach((baslik, i) => {
      const hucre = satir.getCell(i + 1);
      hucre.value = baslik;
      hucre.font = { name: "Arial", size: 9, bold: true };
      hucre.alignment = { horizontal: baslik === "Malzeme Adı" ? "left" : "center", vertical: "middle" };
      hucre.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      hucre.border = { top: KALIN_KENAR, bottom: KALIN_KENAR, left: INCE_KENAR, right: INCE_KENAR };
    });
    satir.height = 18;
    satirNo += 1;
  }

  yerlesim.sayfalar.forEach((sayfaYerlesimi, sayfaIndex) => {
    if (sayfaIndex > 0) {
      // Önceki satıra sayfa sonu koy
      sayfa.getRow(satirNo - 1).addPageBreak();
    }

    if (sayfaYerlesimi.ilkSayfa) {
      // Başlık tek parça, tam genişlikte. Şablondaki ikinci "TESLİM TARİHİ"
      // başlığı kaldırıldı; tarih zaten hemen alttaki kutuda yazıyor.
      sayfa.mergeCells(satirNo, 1, satirNo, SON_KOLON);
      const baslikHucre = sayfa.getCell(satirNo, 1);
      baslikHucre.value = "MALZEME SİPARİŞ FORMU";
      baslikHucre.font = { name: "Arial", size: 14, bold: true };
      baslikHucre.alignment = { horizontal: "center", vertical: "middle" };

      sayfa.getRow(satirNo).height = 24;
      satirNo += 1;

      // Şube / sipariş tarihi (sol blok altında) + teslim tarihi (sağ blok altında)
      const bilgiSatir = sayfa.getRow(satirNo);
      // Tarih seçilmemişse elle doldurulacak kalıp basılır ("../../....").
      const alanlar: [string, string, number, number][] = [
        ["ŞUBE:", form.sube, 1, 2],
        ["SİPARİŞ TARİHİ:", tarihGoster(form.siparisTarihi) || TARIH_KALIBI, 3, 4],
        [
          "TESLİM TARİHİ:",
          tarihGoster(form.teslimTarihi) || TARIH_KALIBI,
          SAG_BLOK_ILK_KOLON,
          SON_KOLON,
        ],
      ];
      for (const [etiket, deger, bas, son] of alanlar) {
        sayfa.mergeCells(satirNo, bas, satirNo, son);
        const hucre = sayfa.getCell(satirNo, bas);
        // Etiket ve değer alt alta. Aynı satırda olsaydı "SİPARİŞ TARİHİ: 25.08.2026"
        // birleştirilmiş hücreye sığmayıp yandaki hücre tarafından kırpılıyordu.
        hucre.value = deger ? `${etiket}\n${deger}` : etiket;
        hucre.font = { name: "Arial", size: 10, bold: true };
        hucre.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        hucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
      }
      bilgiSatir.height = 30;
      satirNo += 1;
    } else {
      sayfa.mergeCells(satirNo, 1, satirNo, SON_KOLON);
      const hucre = sayfa.getCell(satirNo, 1);
      hucre.value = `MALZEME SİPARİŞ FORMU${form.sube ? ` — ${form.sube}` : ""} (devam)`;
      hucre.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF6B7280" } };
      hucre.alignment = { horizontal: "left", vertical: "middle" };
      satirNo += 1;
    }

    baslikSatiriYaz();

    const [sol, sag] = sayfaYerlesimi.bloklar;
    const adet = sol.kapasite;

    // Her Excel satırı bir "birim"e karşılık geliyor; iki birimlik hücreler
    // blokSatirYaz içinde dikey birleştiriliyor. Bu yüzden hangi hücrenin
    // hangi birimde başladığını haritalıyoruz.
    const harita = (blok: typeof sol) =>
      new Map(blok.hucreler.map((h) => [h.ofset, h]));
    const solHarita = harita(sol);
    const sagHarita = harita(sag);

    const ilkSatirNo = satirNo;
    for (let o = 0; o < adet; o++) {
      const mevcutSatirNo = ilkSatirNo + o;

      const solHucre = solHarita.get(o);
      if (solHucre) {
        blokSatirYaz(mevcutSatirNo, 1, solHucre.sira, solHucre.satir, solHucre.birim);
      } else if (o >= sol.kullanilan) {
        // Boş satır: yalnızca sıra numarası.
        blokSatirYaz(mevcutSatirNo, 1, sol.bosBaslangic + (o - sol.kullanilan), undefined, 1);
      }
      // o < kullanilan ve harita boş ise: üstteki iki birimlik hücrenin
      // devamıyız, hücre zaten birleştirildi.

      const sagHucre = sagHarita.get(o);
      if (sagHucre) {
        // Sağ blokta sıra sütunu yok (şablon böyle), numara geçmiyoruz.
        blokSatirYaz(mevcutSatirNo, SAG_BLOK_ILK_KOLON, null, sagHucre.satir, sagHucre.birim);
      } else if (o >= sag.kullanilan) {
        blokSatirYaz(mevcutSatirNo, SAG_BLOK_ILK_KOLON, null, undefined, 1);
      }

      sayfa.getRow(mevcutSatirNo).height = 15;
    }
    satirNo = ilkSatirNo + adet;
  });

  // Kullanım notu
  satirNo += 1;
  sayfa.mergeCells(satirNo, 1, satirNo, SON_KOLON);
  const notBaslik = sayfa.getCell(satirNo, 1);
  notBaslik.value = "KULLANIM NOTU";
  notBaslik.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF6B7280" } };
  satirNo += 1;

  for (const not of VARSAYILAN_NOTLAR) {
    sayfa.mergeCells(satirNo, 1, satirNo, SON_KOLON);
    const hucre = sayfa.getCell(satirNo, 1);
    hucre.value = `• ${not}`;
    hucre.font = { name: "Arial", size: 9, color: { argb: "FF6B7280" } };
    satirNo += 1;
  }

  const bayt = await kitap.xlsx.writeBuffer();
  return Buffer.from(bayt);
}
