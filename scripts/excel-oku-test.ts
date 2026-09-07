import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { excelOku } from "../src/lib/excel-oku";
import { xlsxUret } from "../src/lib/xlsx";
import { bosForm } from "../src/lib/types";

async function calistir() {
  const kitap = new ExcelJS.Workbook();
  const sayfa = kitap.addWorksheet("Form");
  sayfa.mergeCells("A1:G1");
  sayfa.getCell("A1").value = "MALZEME SİPARİŞ FORMU";
  sayfa.addRow(["ŞUBE:", "", "SİPARİŞ TARİHİ:", "", "TESLİM TARİHİ:"]);
  sayfa.addRow(["Sıra", "Malzeme Adı", "Miktar", "Stok Durumu", "Malzeme Adı", "Miktar", "Stok Durumu"]);
  sayfa.addRow([1, "ET GRUBU", "", "", "SOSLAR"]);
  sayfa.addRow([2, "Burger köftesi", "", "", "Ketçap", 0, "YOK"]);
  sayfa.addRow([3, "Tiftik et", 2, "Var", "Mayonez", "3 koli", "Az"]);
  sayfa.mergeCells("B6:B7");
  sayfa.mergeCells("C6:C7");
  sayfa.mergeCells("D6:D7");
  sayfa.getCell("B8").value = { richText: [{ text: "Özel " }, { text: "ürün" }] };
  sayfa.getCell("C8").value = { formula: "1+2", result: 3 };
  sayfa.getCell("B9").value = "ŞEFLERİN SEÇİMİ";
  sayfa.getCell("B9").font = { bold: true, color: { argb: "00C00000" } };
  sayfa.mergeCells("A10:G10");
  sayfa.getCell("A10").value = "KULLANIM NOTU";
  sayfa.getCell("B11").value = "Bu metni ürün olarak ekleme";
  const satirlar = await excelOku(Buffer.from(await kitap.xlsx.writeBuffer()).toString("base64"));
  assert.deepEqual(satirlar.map((s) => [s.malzemeAdi, s.tur, s.miktar, s.stokDurumu]), [
    ["ET GRUBU", "baslik", "", ""],
    ["Burger köftesi", "urun", "", ""],
    ["Tiftik et", "urun", "2", "Var"],
    ["Özel ürün", "urun", "3", ""],
    ["ŞEFLERİN SEÇİMİ", "baslik", "", ""],
    ["SOSLAR", "baslik", "", ""],
    ["Ketçap", "urun", "0", "Yok"],
    ["Mayonez", "urun", "3 koli", "Az"],
  ]);

  // Uygulamanın çok sayfalı çıktısı tekrar yüklenince sıra ve türler korunmalı.
  const form = bosForm();
  form.sayfaModu = "auto";
  form.satirlar = Array.from({ length: 180 }, (_, i) => ({
    id: String(i), tur: i % 20 === 0 ? "baslik" as const : "urun" as const,
    malzemeAdi: i % 20 === 0 ? `Kategori ${i}` : `Uzun malzeme adı mozzarella peyniri dilimli ${i}`,
    miktar: i % 20 === 0 ? "" : String(i), stokDurumu: "" as const,
  }));
  assert.deepEqual(await excelOku((await xlsxUret(form)).toString("base64")),
    form.satirlar.map(({ tur, malzemeAdi, miktar, stokDurumu }) => ({ tur, malzemeAdi, miktar, stokDurumu })));

  const dosya = process.argv[2];
  if (dosya) {
    const veri = readFileSync(dosya).toString("base64");
    const sonuc = await excelOku(veri);
    const kaynak = new ExcelJS.Workbook();
    await kaynak.xlsx.load(Buffer.from(veri, "base64") as unknown as Parameters<typeof kaynak.xlsx.load>[0]);
    const beklenen: { malzemeAdi: string; tur: string }[] = [];
    for (const kolon of [2, 5]) {
      for (let no = 4; no <= 70; no++) {
        const hucre = kaynak.worksheets[0].getCell(no, kolon);
        if (hucre.text.trim()) beklenen.push({ malzemeAdi: hucre.text.trim(), tur: hucre.font.bold ? "baslik" : "urun" });
      }
    }
    assert.deepEqual(sonuc.map(({ malzemeAdi, tur }) => ({ malzemeAdi, tur })), beklenen);
    assert.ok(sonuc.every((s) => s.miktar === "" && s.stokDurumu === ""));
    console.log(`Kaynak dosya: ${sonuc.filter((s) => s.tur === "urun").length} ürün, ${sonuc.filter((s) => s.tur === "baslik").length} grup başlığı doğrulandı.`);
  }
  console.log("Excel okuma: sütunlar, boş miktarlar, birleşimler, metin/formül hücreleri, notlar ve çok sayfalı gidiş-dönüş geçti.");
}

calistir().catch((hata) => { console.error(hata); process.exitCode = 1; });
