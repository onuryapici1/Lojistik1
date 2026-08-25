import { writeFileSync } from "node:fs";
import { cizimUret } from "../src/lib/cizim";
import { pdfUret } from "../src/lib/cizim-pdf";
import { xlsxUret } from "../src/lib/xlsx";
import { bosForm, yeniId, type FormSatiri, type FormVerisi, type StokDurumu } from "../src/lib/types";

function urun(ad: string, miktar: string, stok: StokDurumu = ""): FormSatiri {
  return { id: yeniId(), tur: "urun", malzemeAdi: ad, miktar, stokDurumu: stok };
}
function baslik(ad: string): FormSatiri {
  return { id: yeniId(), tur: "baslik", malzemeAdi: ad, miktar: "", stokDurumu: "" };
}

// Kullanıcının gönderdiği gerçek form fotoğrafındaki içerikle birebir aynı.
const satirlar: FormSatiri[] = [
  baslik("ET GRUBU"),
  urun("Burger köftesi", "20", "Var"),
  urun("Tiftik et", "5 kg", "Az"),
  urun("Füme et", "3 kg", "Var"),
  urun("Sosis", "40 adet", "Var"),
  baslik("TAVUK GRUBU"),
  urun("Fingers", "3 kg", "Var"),
  urun("Kanat", "5 kg", "Az"),
  urun("Kalça", "8 kg", "Var"),
  baslik("PEYNİR GRUBU"),
  urun("Cheddar peyniri", "2 kg", "Var"),
  urun("Mozzarella peyniri (dilimli)", "3 kg", "Var"),
  urun("Mozzarella peyniri (rende)", "4 kg", "Az"),
  urun("Emmental peyniri", "1 kg", "Var"),
  urun("Keçi peyniri", "1 kg", "Yok"),
  urun("Hellim peyniri", "2 kg", "Var"),
  urun("Cheddar sıvı", "5 lt", "Var"),
  urun("Parmesan peyniri (kalıp)", "1", "Az"),
  urun("Parmesan peyniri (rende)", "2 kg", "Var"),
  urun("Damla sakızlı saganaki", "10 adet", "Var"),
  baslik("PAKETLİ KONSERVE ÜRÜNLER"),
  urun("Balzamik salata sosu", "3", "Var"),
  urun("Lemon pepper yağı/baharatı", "2", "Az"),
  baslik("DİĞER"),
  urun("Kırmızı soğan turşusu", "2 kg", "Var"),
  urun("Salatalık turşusu", "2 kg", "Var"),
  urun("Domates reçeli", "1 kg", "Az"),
  urun("İstiridye mantarı", "2 kg", "Var"),
  urun("Karamelize soğan", "2 kg", "Var"),
  urun("Taco biberi", "1 kg", "Yok"),
];

const form: FormVerisi = {
  ...bosForm(),
  sube: "Kadıköy Şubesi",
  siparisTarihi: "2026-08-25",
  teslimTarihi: "2026-08-28",
  sayfaModu: "tekSayfa",
  satirlar,
};

async function calistir() {
  const cizim = cizimUret(form);
  writeFileSync("scripts/cikti/ornek-form.pdf", await pdfUret(cizim));
  writeFileSync("scripts/cikti/ornek-form.xlsx", await xlsxUret(form));
  console.log(
    `ornek uretildi: ${form.satirlar.length} satir, ${cizim.sayfalar.length} sayfa, olcek %${cizim.yerlesim.olcek}`,
  );
}
calistir();
