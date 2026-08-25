/**
 * Noto Sans karakter genişlik tablosunu üretir (em cinsinden).
 * Çıktı: src/lib/yaziGenislik.ts
 *
 * Neden gerekli: satır kaydırma kararını (metin kaç satır tutuyor) hem sunucu
 * hem tarayıcı tarafında BİREBİR aynı vermek zorundayız. Tarayıcıda canvas
 * ölçümü, sunucuda pdf-lib ölçümü kullanılsaydı ikisi farklı yerde kırar ve
 * önizleme ile PDF ayrışırdı.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const KARAKTERLER =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
  "çÇğĞıİöÖşŞüÜâÂîÎûÛ" +
  "–—‘’“”•…₺°";

async function calistir() {
  const belge = await PDFDocument.create();
  belge.registerFontkit(fontkit);
  const klasor = path.join(process.cwd(), "src", "assets", "fonts");
  const oku = (ad: string) =>
    belge.embedFont(new Uint8Array(readFileSync(path.join(klasor, ad))), { subset: false });

  const normal = await oku("NotoSans-Regular.ttf");
  const kalin = await oku("NotoSans-SemiBold.ttf");

  // 1000 puntoda ölç, 1000'e böl -> em başına genişlik
  const olc = (font: typeof normal, ch: string) =>
    Math.round((font.widthOfTextAtSize(ch, 1000) / 1000) * 1000) / 1000;

  const normalTablo: Record<string, number> = {};
  const kalinTablo: Record<string, number> = {};
  for (const ch of KARAKTERLER) {
    normalTablo[ch] = olc(normal, ch);
    kalinTablo[ch] = olc(kalin, ch);
  }

  const satirla = (t: Record<string, number>) =>
    Object.entries(t)
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${v},`)
      .join("\n");

  const icerik = `/**
 * Noto Sans karakter genişlikleri (em cinsinden).
 *
 * scripts/genislik-tablosu-uret.ts tarafından üretildi — ELLE DÜZENLEMEYİN.
 *
 * Satır kaydırma kararı bu tabloyla veriliyor. Sebebi: metnin kaç satır
 * tuttuğu hem sayfa hesabını (yerlesim.ts) hem de çizimi etkiliyor; tarayıcıda
 * canvas ölçümü, sunucuda pdf-lib ölçümü kullansaydık ikisi farklı yerde kırar,
 * önizlemede 2 sayfa görünüp PDF'te 3 sayfa çıkardı.
 */

const NORMAL: Record<string, number> = {
${satirla(normalTablo)}
};

const KALIN: Record<string, number> = {
${satirla(kalinTablo)}
};

/** Tabloda olmayan karakterler için makul bir varsayılan. */
const VARSAYILAN = 0.55;

/** Metnin em cinsinden genişliği. */
export function emGenisligi(metin: string, kalinMi = false): number {
  const tablo = kalinMi ? KALIN : NORMAL;
  let toplam = 0;
  for (const ch of metin) toplam += tablo[ch] ?? VARSAYILAN;
  return toplam;
}
`;

  writeFileSync("src/lib/yaziGenislik.ts", icerik);
  console.log(`tablo yazildi: ${KARAKTERLER.length} karakter`);
}
calistir();
