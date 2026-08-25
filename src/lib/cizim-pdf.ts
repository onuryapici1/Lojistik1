/**
 * Çizim komutlarını PDF'e uygular (pdf-lib).
 *
 * İlk sürümde bu iş headless Chromium ile yapılıyordu; serverless ortamda ağır
 * ve kırılgandı. pdf-lib ile çıktı vektörel, dosya küçük ve soğuk başlangıç hızlı.
 *
 * Not: pdf-lib'in hazır fontları WinAnsi kodlamasında ve ğ/ş/ı/İ harflerini
 * içermiyor. Bu yüzden Noto Sans repoya gömülü olarak geliyor.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import type { Cizim, YaziKomutu } from "./cizim";
import { SAYFA_GENISLIK, SAYFA_YUKSEKLIK } from "./yerlesim";

const MM_TO_PT = 72 / 25.4;

/** Canvas tarafındaki yazı ölçeğiyle aynı; iki çıktı birbirine benzesin diye. */
const YAZI_CARPANI = 1.42;

function mm(deger: number): number {
  return deger * MM_TO_PT;
}

/** #rrggbb -> pdf-lib rgb */
function renkCoz(hex: string | undefined, varsayilan = "#111827") {
  const h = (hex ?? varsayilan).replace("#", "");
  const tam = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const sayi = parseInt(tam, 16);
  if (!Number.isFinite(sayi)) return rgb(0, 0, 0);
  return rgb(((sayi >> 16) & 255) / 255, ((sayi >> 8) & 255) / 255, (sayi & 255) / 255);
}

let fontOnbellek: { normal: Uint8Array; kalin: Uint8Array } | null = null;

async function fontlariOku() {
  if (fontOnbellek) return fontOnbellek;
  const klasor = path.join(process.cwd(), "src", "assets", "fonts");
  const [normal, kalin] = await Promise.all([
    readFile(path.join(klasor, "NotoSans-Regular.ttf")),
    readFile(path.join(klasor, "NotoSans-SemiBold.ttf")),
  ]);
  fontOnbellek = { normal: new Uint8Array(normal), kalin: new Uint8Array(kalin) };
  return fontOnbellek;
}

function metniKisalt(metin: string, font: PDFFont, boyut: number, enFazlaPt: number): string {
  if (!Number.isFinite(enFazlaPt) || enFazlaPt <= 0) return metin;
  if (font.widthOfTextAtSize(metin, boyut) <= enFazlaPt) return metin;

  let dusuk = 0;
  let yuksek = metin.length;
  while (dusuk < yuksek) {
    const orta = Math.floor((dusuk + yuksek + 1) / 2);
    if (font.widthOfTextAtSize(metin.slice(0, orta) + "…", boyut) <= enFazlaPt) dusuk = orta;
    else yuksek = orta - 1;
  }
  return dusuk > 0 ? metin.slice(0, dusuk) + "…" : "";
}

function yaziCiz(
  sayfa: PDFPage,
  komut: YaziKomutu,
  fontlar: { normal: PDFFont; kalin: PDFFont },
) {
  if (!komut.metin) return;

  const font = komut.kalin ? fontlar.kalin : fontlar.normal;
  const boyut = mm(komut.boyut * YAZI_CARPANI);

  const metin =
    komut.enFazlaGenislik !== undefined
      ? metniKisalt(komut.metin, font, boyut, mm(komut.enFazlaGenislik))
      : komut.metin;
  if (!metin) return;

  const genislik = font.widthOfTextAtSize(metin, boyut);
  let x = mm(komut.x);
  if (komut.hiza === "orta") x -= genislik / 2;
  else if (komut.hiza === "sag") x -= genislik;

  sayfa.drawText(metin, {
    x,
    // Çizim komutları yukarıdan aşağı, PDF aşağıdan yukarı sayıyor.
    y: mm(SAYFA_YUKSEKLIK - komut.y),
    size: boyut,
    font,
    color: renkCoz(komut.renk),
  });
}

/** Tüm sayfaları tek bir PDF'e basar ve bayt dizisi döner. */
export async function pdfUret(cizim: Cizim): Promise<Uint8Array> {
  const belge = await PDFDocument.create();
  belge.registerFontkit(fontkit);

  const ham = await fontlariOku();
  // NOT: subset:true bu Noto Sans dosyasında pdf-lib/fontkit ile bir kısım
  // harfleri (Türkçe olmayanlar dahil, ör. L, Z, F, O, U) sessizce düşürüyor —
  // dosya "başarılı" üretiliyor ama gerçek bir PDF görüntüleyicide harfler
  // kayboluyor. subset kapalı: dosya ~600 KB büyüyor ama tüm glifler eksiksiz.
  const fontlar = {
    normal: await belge.embedFont(ham.normal, { subset: false }),
    kalin: await belge.embedFont(ham.kalin, { subset: false }),
  };

  belge.setTitle("Malzeme Sipariş Formu");
  belge.setCreator("Özlem Malzeme Formu");
  belge.setProducer("Özlem Malzeme Formu");

  for (const sayfaCizimi of cizim.sayfalar) {
    const sayfa = belge.addPage([mm(SAYFA_GENISLIK), mm(SAYFA_YUKSEKLIK)]);

    for (const komut of sayfaCizimi.komutlar) {
      if (komut.tur === "kutu") {
        const x = mm(komut.x);
        const genislik = mm(komut.genislik);
        const yukseklik = mm(komut.yukseklik);
        // Kutunun üst kenarı komut.y; pdf-lib dikdörtgeni alt kenardan çiziyor.
        const y = mm(SAYFA_YUKSEKLIK - komut.y - komut.yukseklik);

        if (komut.dolgu) {
          sayfa.drawRectangle({ x, y, width: genislik, height: yukseklik, color: renkCoz(komut.dolgu) });
        }
        if (komut.cerceve) {
          const kalinlik = Math.max(0.25, mm(komut.kalinlik ?? 0.2));
          if (komut.yukseklik === 0) {
            sayfa.drawLine({
              start: { x, y: mm(SAYFA_YUKSEKLIK - komut.y) },
              end: { x: x + genislik, y: mm(SAYFA_YUKSEKLIK - komut.y) },
              thickness: kalinlik,
              color: renkCoz(komut.cerceve),
            });
          } else if (komut.genislik === 0) {
            sayfa.drawLine({
              start: { x, y: mm(SAYFA_YUKSEKLIK - komut.y) },
              end: { x, y: mm(SAYFA_YUKSEKLIK - komut.y - komut.yukseklik) },
              thickness: kalinlik,
              color: renkCoz(komut.cerceve),
            });
          } else {
            sayfa.drawRectangle({
              x,
              y,
              width: genislik,
              height: yukseklik,
              borderWidth: kalinlik,
              borderColor: renkCoz(komut.cerceve),
            });
          }
        }
      } else {
        yaziCiz(sayfa, komut, fontlar);
      }
    }
  }

  return belge.save();
}
