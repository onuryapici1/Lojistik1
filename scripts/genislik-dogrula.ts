import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { emGenisligi } from "../src/lib/yaziGenislik";

const ORNEKLER = [
  "PAKETLİ KONSERVE ÜRÜNLER", "Balzamik salata sosu", "Mozzarella peyniri (dilimli)",
  "Lemon pepper yağı/baharatı", "Kırmızı soğan turşusu", "İstiridye mantarı",
  "Damla sakızlı saganaki", "SEBZE & MEYVE", "Panko", "Www lll", "MMMMMMMMMM",
];

async function calistir() {
  const belge = await PDFDocument.create();
  belge.registerFontkit(fontkit);
  const klasor = path.join(process.cwd(), "src", "assets", "fonts");
  const normal = await belge.embedFont(new Uint8Array(readFileSync(path.join(klasor, "NotoSans-Regular.ttf"))), { subset: false });

  let enBuyukHata = 0;
  for (const m of ORNEKLER) {
    const gercek = normal.widthOfTextAtSize(m, 1000) / 1000;
    const tahmin = emGenisligi(m, false);
    const hata = Math.abs(gercek - tahmin) / gercek * 100;
    enBuyukHata = Math.max(enBuyukHata, hata);
    console.log(`${hata < 0.01 ? "ok " : "FARK"} ${JSON.stringify(m)}  gercek=${gercek.toFixed(4)} tahmin=${tahmin.toFixed(4)} hata=%${hata.toFixed(3)}`);
  }
  console.log(`\nEn buyuk hata: %${enBuyukHata.toFixed(4)}`);
  process.exit(enBuyukHata < 0.1 ? 0 : 1);
}
calistir();
