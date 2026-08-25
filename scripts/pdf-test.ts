import { writeFileSync } from "node:fs";
import { cizimUret } from "../src/lib/cizim";
import { pdfUret } from "../src/lib/cizim-pdf";
import { bosForm, bosSatir, type FormVerisi } from "../src/lib/types";

const TR = "ğĞüÜşŞıİöÖçÇ";
const malzemeler = [
  "Ayçiçek Yağı 5 lt", "Toz Şeker 50 kg", "Çiğ Köfte Harcı", "Süzme Yoğurt",
  "İçme Suyu 19 lt", "Beyaz Peynir", "Kaşar Peyniri", "Zeytinyağı 1 lt",
  "Bulaşık Deterjanı", "Çöp Poşeti Büyük", "Kağıt Havlu", "Islak Mendil",
];

function formYap(n: number, mod: FormVerisi["sayfaModu"] = "tekSayfa"): FormVerisi {
  const f = bosForm();
  f.sube = "Kadıköy Şubesi";
  f.siparisTarihi = "2026-08-25";
  f.teslimTarihi = "2026-08-27";
  f.sayfaModu = mod;
  f.satirlar = Array.from({ length: n }, (_, i) => ({
    ...bosSatir(),
    malzemeAdi: i === 0 ? `Türkçe kontrol: ${TR}` : malzemeler[i % malzemeler.length],
    miktar: String((i % 20) + 1),
    stokDurumu: (["Var", "Az", "Yok", ""] as const)[i % 4],
  }));
  return f;
}

let hata = 0;
function kontrol(ad: string, kosul: boolean, detay = "") {
  if (!kosul) { console.log(`  BASARISIZ: ${ad} ${detay}`); hata++; }
  else console.log(`  ok: ${ad} ${detay}`);
}

async function calistir() {
  for (const [n, mod] of [[12, "tekSayfa"], [90, "tekSayfa"], [200, "bol"], [400, "auto"]] as const) {
    const form = formYap(n, mod);
    const cizim = cizimUret(form);
    const bayt = await pdfUret(cizim);
    const dosya = `scripts/cikti/test-${n}-${mod}.pdf`;
    writeFileSync(dosya, bayt);
    const basSihirli = Buffer.from(bayt.slice(0, 5)).toString();
    kontrol(`n=${n} ${mod} PDF uretildi`, basSihirli === "%PDF-", `${(bayt.length/1024).toFixed(0)} KB, ${cizim.sayfalar.length} sayfa, olcek=${cizim.yerlesim.olcek}`);
    kontrol(`n=${n} ${mod} makul boyut`, bayt.length > 2000 && bayt.length < 5_000_000, `${bayt.length} bayt`);
  }
  console.log(hata === 0 ? "\nPDF TESTLERI GECTI" : `\n${hata} BASARISIZ`);
  process.exit(hata === 0 ? 0 : 1);
}
calistir().catch((e) => { console.error("PATLADI:", e); process.exit(1); });
