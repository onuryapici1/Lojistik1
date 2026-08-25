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
   * Bir bloğun tek satırını yazar.
   *
   * Sol blokta "Sıra" sütunu var, sağ blokta yok (şablon böyle). Grup başlığı
   * satırlarında (ör. "ET GRUBU") malzeme+miktar+stok hücreleri birleştirilip
   * kalın kırmızı tek hücre olarak basılır.
   *
   * @param ilkKolon Bloğun ilk Excel kolonu (sol=1, sağ=5).
   * @param siraNo Sol blokta yazılacak sıra numarası; sağ blokta null.
   */
  function blokSatirYaz(
    satir: ExcelJS.Row,
    ilkKolon: number,
    siraNo: number | null,
    veri: { tur: string; malzemeAdi: string; miktar: string; stokDurumu: string } | undefined,
  ) {
    // Sol blokta ilk kolon "Sıra"; veri kolonları ondan sonra başlar.
    let veriIlkKolon = ilkKolon;
    if (siraNo !== null) {
      const siraHucre = satir.getCell(ilkKolon);
      siraHucre.value = siraNo;
      siraHucre.font = { name: "Arial", size: 9, color: { argb: "FF9CA3AF" } };
      siraHucre.alignment = { horizontal: "center", vertical: "middle" };
      siraHucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
      veriIlkKolon = ilkKolon + 1;
    }

    if (veri?.tur === "baslik") {
      sayfa.mergeCells(satir.number, veriIlkKolon, satir.number, veriIlkKolon + 2);
      for (let k = 0; k < 3; k++) {
        const hucre = satir.getCell(veriIlkKolon + k);
        hucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
      }
      const metinHucre = satir.getCell(veriIlkKolon);
      metinHucre.value = veri.malzemeAdi || null;
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
      const hucre = satir.getCell(veriIlkKolon + k);
      hucre.value = deger;
      hucre.font = { name: "Arial", size: 9 };
      hucre.alignment = { horizontal: k === 0 ? "left" : "center", vertical: "middle" };
      hucre.border = { top: INCE_KENAR, bottom: INCE_KENAR, left: INCE_KENAR, right: INCE_KENAR };
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
      // Başlık: orijinal şablonla birebir aynı — "MALZEME SİPARİŞ FORMU" yalnızca
      // sol blok (A-D), "TESLİM TARİHİ" yalnızca sağ blok (E-G) genişliğinde.
      sayfa.mergeCells(satirNo, 1, satirNo, 4);
      const baslikHucre = sayfa.getCell(satirNo, 1);
      baslikHucre.value = "MALZEME SİPARİŞ FORMU";
      baslikHucre.font = { name: "Arial", size: 14, bold: true };
      baslikHucre.alignment = { horizontal: "center", vertical: "middle" };

      sayfa.mergeCells(satirNo, SAG_BLOK_ILK_KOLON, satirNo, SON_KOLON);
      const teslimBaslikHucre = sayfa.getCell(satirNo, SAG_BLOK_ILK_KOLON);
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
        ["TESLİM TARİHİ:", tarihGoster(form.teslimTarihi), SAG_BLOK_ILK_KOLON, SON_KOLON],
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
    const adet = sayfaYerlesimi.blokSatirSayisi;

    for (let i = 0; i < adet; i++) {
      const satir = sayfa.getRow(satirNo);
      blokSatirYaz(satir, 1, sayfaYerlesimi.blokBaslangic[0] + i, sol[i]?.satir);
      // Sağ blokta sıra sütunu yok (şablon böyle), o yüzden numara geçmiyoruz.
      blokSatirYaz(satir, SAG_BLOK_ILK_KOLON, null, sag[i]?.satir);
      satir.height = 15;
      satirNo += 1;
    }
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
