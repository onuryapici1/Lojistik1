/**
 * Excel çıktısı.
 *
 * Sayfalama PDF ile aynı motordan (yerlesim.ts) geliyor, böylece "önizlemede
 * 2 sayfa, Excel'de 3 sayfa" durumu oluşmuyor. Her A4 sayfası arasına gerçek
 * bir sayfa sonu konuyor.
 */

import ExcelJS from "exceljs";

import type { FormVerisi } from "./types";
import { tarihGoster } from "./types";
import { sayfala, SUTUN_GENISLIK, VARSAYILAN_NOTLAR } from "./yerlesim";

const KIRMIZI = "FFB91C1C";

/** mm cinsinden sütun genişliğini Excel'in karakter birimine çevirir (kabaca). */
function mmToKarakter(mm: number): number {
  return Math.round((mm / 1.9) * 10) / 10;
}

const INCE_KENAR = { style: "thin" as const, color: { argb: "FF94A3B8" } };
const KALIN_KENAR = { style: "medium" as const, color: { argb: "FF334155" } };

const BASLIKLAR = ["Sıra", "Malzeme Adı", "Miktar", "Stok Durumu"];

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

  // Sekiz sütun: iki blok, her birinde Sıra / Malzeme Adı / Miktar / Stok Durumu
  sayfa.columns = [
    { width: mmToKarakter(SUTUN_GENISLIK.sira) },
    { width: mmToKarakter(SUTUN_GENISLIK.malzemeAdi) },
    { width: mmToKarakter(SUTUN_GENISLIK.miktar) },
    { width: mmToKarakter(SUTUN_GENISLIK.stokDurumu) },
    { width: mmToKarakter(SUTUN_GENISLIK.sira) },
    { width: mmToKarakter(SUTUN_GENISLIK.malzemeAdi) },
    { width: mmToKarakter(SUTUN_GENISLIK.miktar) },
    { width: mmToKarakter(SUTUN_GENISLIK.stokDurumu) },
  ];

  let satirNo = 1;

  /**
   * Bir bloğun tek satırını yazar: sıra numarası + malzeme/miktar/stok.
   * Grup başlığı ise (ör. "ET GRUBU") malzeme+miktar+stok sütunları birleştirilip
   * kalın kırmızı tek hücre olarak basılır — orijinal formdaki görünümle aynı.
   *
   * @param baslangicKolon Bloğun sıra sütununun Excel kolon indeksi (sol=1, sağ=5).
   */
  function blokSatirYaz(
    satir: ExcelJS.Row,
    baslangicKolon: number,
    siraNo: number,
    veri: { tur: string; malzemeAdi: string; miktar: string; stokDurumu: string } | undefined,
  ) {
    const siraHucre = satir.getCell(baslangicKolon);
    siraHucre.value = siraNo;
    siraHucre.font = { name: "Arial", size: 9, color: { argb: "FF9CA3AF" } };
    siraHucre.alignment = { horizontal: "center", vertical: "middle" };
    siraHucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };

    const baslikMi = veri?.tur === "baslik";

    if (baslikMi) {
      sayfa.mergeCells(satir.number, baslangicKolon + 1, satir.number, baslangicKolon + 3);
      for (let k = 1; k <= 3; k++) {
        const hucre = satir.getCell(baslangicKolon + k);
        hucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
      }
      const metinHucre = satir.getCell(baslangicKolon + 1);
      metinHucre.value = veri?.malzemeAdi || null;
      metinHucre.font = { name: "Arial", size: 9, bold: true, color: { argb: KIRMIZI } };
      metinHucre.alignment = { horizontal: "left", vertical: "middle" };
      return;
    }

    const degerler: (string | null)[] = [
      veri?.malzemeAdi || null,
      veri?.miktar || null,
      veri?.stokDurumu || null,
    ];
    degerler.forEach((deger, k) => {
      const hucre = satir.getCell(baslangicKolon + 1 + k);
      hucre.value = deger;
      hucre.font = { name: "Arial", size: 9 };
      hucre.alignment = { horizontal: k === 0 ? "left" : "center", vertical: "middle" };
      hucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
    });
  }

  function baslikSatiriYaz() {
    const satir = sayfa.getRow(satirNo);
    [...BASLIKLAR, ...BASLIKLAR].forEach((baslik, i) => {
      const hucre = satir.getCell(i + 1);
      hucre.value = baslik;
      hucre.font = { name: "Arial", size: 9, bold: true };
      hucre.alignment = { horizontal: i % 4 === 1 ? "left" : "center", vertical: "middle" };
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
      // Başlık: orijinal şablonla birebir aynı — "MALZEME SİPARİŞ FORMU" yalnızca
      // sol blok (A-D), "TESLİM TARİHİ" yalnızca sağ blok (E-G) genişliğinde.
      sayfa.mergeCells(satirNo, 1, satirNo, 4);
      const baslikHucre = sayfa.getCell(satirNo, 1);
      baslikHucre.value = "MALZEME SİPARİŞ FORMU";
      baslikHucre.font = { name: "Arial", size: 14, bold: true };
      baslikHucre.alignment = { horizontal: "center", vertical: "middle" };

      sayfa.mergeCells(satirNo, 5, satirNo, 8);
      const teslimBaslikHucre = sayfa.getCell(satirNo, 5);
      teslimBaslikHucre.value = "TESLİM TARİHİ";
      teslimBaslikHucre.font = { name: "Arial", size: 14, bold: true };
      teslimBaslikHucre.alignment = { horizontal: "center", vertical: "middle" };

      sayfa.getRow(satirNo).height = 24;
      satirNo += 1;

      // Şube / sipariş tarihi (sol blok altında) + teslim tarihi (sağ blok altında)
      const bilgiSatir = sayfa.getRow(satirNo);
      const alanlar: [string, string, number, number][] = [
        ["ŞUBE:", form.sube, 1, 2],
        ["SİPARİŞ TARİHİ:", tarihGoster(form.siparisTarihi), 3, 4],
        ["TESLİM TARİHİ:", tarihGoster(form.teslimTarihi), 5, 8],
      ];
      for (const [etiket, deger, bas, son] of alanlar) {
        sayfa.mergeCells(satirNo, bas, satirNo, son);
        const hucre = sayfa.getCell(satirNo, bas);
        hucre.value = deger ? `${etiket} ${deger}` : etiket;
        hucre.font = { name: "Arial", size: 10, bold: true };
        hucre.alignment = { horizontal: "left", vertical: "middle" };
        hucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
      }
      bilgiSatir.height = 20;
      satirNo += 1;
    } else {
      sayfa.mergeCells(satirNo, 1, satirNo, 8);
      const hucre = sayfa.getCell(satirNo, 1);
      hucre.value = `MALZEME SİPARİŞ FORMU${form.sube ? ` — ${form.sube}` : ""} (devam)`;
      hucre.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF6B7280" } };
      hucre.alignment = { horizontal: "left", vertical: "middle" };
      satirNo += 1;
    }

    baslikSatiriYaz();

    const [sol, sag] = sayfaYerlesimi.bloklar;
    const adet = sayfaYerlesimi.blokSatirSayisi;

    for (let i = 0; i < adet; i++) {
      const satir = sayfa.getRow(satirNo);
      blokSatirYaz(satir, 1, sayfaYerlesimi.blokBaslangic[0] + i, sol[i]?.satir);
      blokSatirYaz(satir, 5, sayfaYerlesimi.blokBaslangic[1] + i, sag[i]?.satir);
      satir.height = 15;
      satirNo += 1;
    }
  });

  // Kullanım notu
  satirNo += 1;
  sayfa.mergeCells(satirNo, 1, satirNo, 8);
  const notBaslik = sayfa.getCell(satirNo, 1);
  notBaslik.value = "KULLANIM NOTU";
  notBaslik.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF6B7280" } };
  satirNo += 1;

  for (const not of VARSAYILAN_NOTLAR) {
    sayfa.mergeCells(satirNo, 1, satirNo, 8);
    const hucre = sayfa.getCell(satirNo, 1);
    hucre.value = `• ${not}`;
    hucre.font = { name: "Arial", size: 9, color: { argb: "FF6B7280" } };
    satirNo += 1;
  }

  const bayt = await kitap.xlsx.writeBuffer();
  return Buffer.from(bayt);
}
