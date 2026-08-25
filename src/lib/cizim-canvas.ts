/**
 * Çizim komutlarını bir canvas üzerine uygular.
 *
 * Hem ekrandaki önizleme hem de PNG indirme bunu kullanır; ikisinin arasındaki
 * tek fark çözünürlük (dpi).
 */

import { SAYFA_GENISLIK, SAYFA_YUKSEKLIK } from "./yerlesim";
import type { SayfaCizimi, YaziKomutu } from "./cizim";

/** Ekranda önizleme için yeterli; PNG indirmede daha yükseğini kullanıyoruz. */
export const ONIZLEME_DPI = 96;
export const PNG_DPI = 200;

export function mmToPx(mm: number, dpi: number): number {
  return (mm * dpi) / 25.4;
}

/**
 * Yazı tipi yığını.
 *
 * Noto Sans başta: PDF de onunla basılıyor ve satır kaydırma kararı onun
 * ölçüleriyle veriliyor. Sistemde varsa (Android'de varsayılan) önizleme
 * PDF'in birebir aynısı olur. Yoksa Segoe UI/Arial'a düşüyor — bunlar Noto
 * Sans'tan biraz dar, yani metin kesinlikle sığar, sadece bir tık ferah durur.
 */
const YAZI_TIPI = '"Noto Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

function yaziTipiKur(ctx: CanvasRenderingContext2D, komut: YaziKomutu, dpi: number) {
  // Milimetre cinsinden verdiğimiz "boyut" yazının büyük harf yüksekliği gibi
  // davranıyor; canvas font boyutu ise em yüksekliği. 1.42 çarpanı ikisini
  // görsel olarak birbirine yaklaştırıyor.
  const px = mmToPx(komut.boyut * 1.42, dpi);
  ctx.font = `${komut.kalin ? "600" : "400"} ${px}px ${YAZI_TIPI}`;
  ctx.fillStyle = komut.renk ?? "#111827";
  ctx.textAlign = komut.hiza === "orta" ? "center" : komut.hiza === "sag" ? "right" : "left";
  ctx.textBaseline = "alphabetic";
}

/** Metni verilen genişliğe sığdırır, taşarsa sonuna … koyar. */
function kisalt(ctx: CanvasRenderingContext2D, metin: string, enFazlaPx: number): string {
  if (!Number.isFinite(enFazlaPx) || enFazlaPx <= 0) return metin;
  if (ctx.measureText(metin).width <= enFazlaPx) return metin;

  let dusuk = 0;
  let yuksek = metin.length;
  while (dusuk < yuksek) {
    const orta = Math.floor((dusuk + yuksek + 1) / 2);
    if (ctx.measureText(metin.slice(0, orta) + "…").width <= enFazlaPx) dusuk = orta;
    else yuksek = orta - 1;
  }
  return dusuk > 0 ? metin.slice(0, dusuk) + "…" : "";
}

export interface CizimSecenekleri {
  dpi?: number;
  /** Sayfa zemini. Şeffaf PNG istenirse null verilir. */
  zemin?: string | null;
}

/** Canvas'ı sayfa boyutuna ayarlar ve tek bir sayfayı çizer. */
export function sayfayiCiz(
  canvas: HTMLCanvasElement,
  sayfa: SayfaCizimi,
  secenekler: CizimSecenekleri = {},
): void {
  const dpi = secenekler.dpi ?? ONIZLEME_DPI;
  const zemin = secenekler.zemin === undefined ? "#ffffff" : secenekler.zemin;

  const genislikPx = Math.round(mmToPx(SAYFA_GENISLIK, dpi));
  const yukseklikPx = Math.round(mmToPx(SAYFA_YUKSEKLIK, dpi));

  canvas.width = genislikPx;
  canvas.height = yukseklikPx;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D bağlamı alınamadı");

  ctx.clearRect(0, 0, genislikPx, yukseklikPx);
  if (zemin) {
    ctx.fillStyle = zemin;
    ctx.fillRect(0, 0, genislikPx, yukseklikPx);
  }

  for (const komut of sayfa.komutlar) {
    if (komut.tur === "kutu") {
      const x = mmToPx(komut.x, dpi);
      const y = mmToPx(komut.y, dpi);
      const g = mmToPx(komut.genislik, dpi);
      const yk = mmToPx(komut.yukseklik, dpi);

      if (komut.dolgu) {
        ctx.fillStyle = komut.dolgu;
        ctx.fillRect(x, y, g, yk);
      }
      if (komut.cerceve) {
        ctx.strokeStyle = komut.cerceve;
        ctx.lineWidth = Math.max(1, mmToPx(komut.kalinlik ?? 0.2, dpi));
        if (yk === 0) {
          // Yatay çizgi
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + g, y);
          ctx.stroke();
        } else if (g === 0) {
          // Dikey çizgi
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + yk);
          ctx.stroke();
        } else {
          ctx.strokeRect(x, y, g, yk);
        }
      }
    } else {
      if (!komut.metin) continue;
      yaziTipiKur(ctx, komut, dpi);
      const metin =
        komut.enFazlaGenislik !== undefined
          ? kisalt(ctx, komut.metin, mmToPx(komut.enFazlaGenislik, dpi))
          : komut.metin;
      ctx.fillText(metin, mmToPx(komut.x, dpi), mmToPx(komut.y, dpi));
    }
  }
}

/** Bir sayfayı PNG blob'una çevirir. */
export async function sayfayiPngYap(sayfa: SayfaCizimi, dpi = PNG_DPI): Promise<Blob> {
  const canvas = document.createElement("canvas");
  sayfayiCiz(canvas, sayfa, { dpi });
  return new Promise<Blob>((cozumle, reddet) => {
    canvas.toBlob((blob) => {
      if (blob) cozumle(blob);
      else reddet(new Error("PNG üretilemedi"));
    }, "image/png");
  });
}
