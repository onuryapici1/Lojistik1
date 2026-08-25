/**
 * Formu "çizim komutlarına" çevirir.
 *
 * Amaç: PDF, PNG ve ekrandaki önizleme aynı kaynaktan beslensin. Bu modül
 * yalnızca "şu koordinatta şu kutu, şu yazı" der; nasıl çizileceğini
 * cizim-canvas.ts (PNG + önizleme) ve cizim-pdf.ts (PDF) bilir.
 *
 * Koordinat sistemi: sayfanın sol üst köşesi (0,0), birim milimetre.
 */

import type { FormVerisi } from "./types";
import { tarihGoster } from "./types";
import {
  BLOK_ARASI,
  BLOK_GENISLIK,
  ICERIK_GENISLIK,
  KENAR_BOSLUK,
  SUTUN_BASLIKLARI,
  BASLIK_YAZI_ORANI,
  SUTUN_GENISLIK,
  BASLIK_YUKSEKLIK,
  BILGI_YUKSEKLIK,
  BASLIK_ALT_BOSLUK,
  DEVAM_BASLIK_YUKSEKLIK,
  NOT_YUKSEKLIK,
  VARSAYILAN_NOTLAR,
  sayfala,
  type Yerlesim,
  type YerlesimSayfasi,
  type YerlesimSecenekleri,
} from "./yerlesim";

export type Hiza = "sol" | "orta" | "sag";

export interface KutuKomutu {
  tur: "kutu";
  x: number;
  y: number;
  genislik: number;
  yukseklik: number;
  /** Dolgu rengi (#rrggbb). Yoksa şeffaf. */
  dolgu?: string;
  /** Çerçeve rengi. Yoksa çerçeve çizilmez. */
  cerceve?: string;
  kalinlik?: number;
}

export interface YaziKomutu {
  tur: "yazi";
  x: number;
  y: number;
  metin: string;
  /** Punto değil, milimetre cinsinden yazı yüksekliği. */
  boyut: number;
  hiza: Hiza;
  kalin?: boolean;
  renk?: string;
  /** Bu genişliği aşarsa kısaltılır. */
  enFazlaGenislik?: number;
}

export type CizimKomutu = KutuKomutu | YaziKomutu;

export interface SayfaCizimi {
  komutlar: CizimKomutu[];
  sayfaNo: number;
  toplamSayfa: number;
}

export interface Cizim {
  sayfalar: SayfaCizimi[];
  yerlesim: Yerlesim;
}

const RENK = {
  metin: "#111827",
  soluk: "#6b7280",
  cizgi: "#94a3b8",
  kalinCizgi: "#334155",
  baslikZemin: "#e2e8f0",
  seritZemin: "#f8fafc",
} as const;

const INCE = 0.18;
const KALIN = 0.4;

/** Blok içindeki sütunların bloğun soluna göre x konumu ve genişliği. */
const SUTUNLAR = [
  { anahtar: "sira" as const, genislik: SUTUN_GENISLIK.sira, hiza: "orta" as Hiza },
  { anahtar: "malzemeAdi" as const, genislik: SUTUN_GENISLIK.malzemeAdi, hiza: "sol" as Hiza },
  { anahtar: "miktar" as const, genislik: SUTUN_GENISLIK.miktar, hiza: "orta" as Hiza },
  { anahtar: "stokDurumu" as const, genislik: SUTUN_GENISLIK.stokDurumu, hiza: "orta" as Hiza },
];

function sutunKonumlari(blokX: number) {
  const sonuc: { anahtar: string; x: number; genislik: number; hiza: Hiza }[] = [];
  let x = blokX;
  for (const s of SUTUNLAR) {
    sonuc.push({ anahtar: s.anahtar, x, genislik: s.genislik, hiza: s.hiza });
    x += s.genislik;
  }
  return sonuc;
}

/** Bir metin hücresini sütun içinde nereye yazacağımızı hesaplar. */
function hucreYazisi(
  metin: string,
  sutun: { x: number; genislik: number; hiza: Hiza },
  satirY: number,
  satirYuksekligi: number,
  boyut: number,
  kalin = false,
  renk: string = RENK.metin,
): YaziKomutu {
  const ic = 1.2; // hücre iç boşluğu
  const x =
    sutun.hiza === "sol"
      ? sutun.x + ic
      : sutun.hiza === "sag"
        ? sutun.x + sutun.genislik - ic
        : sutun.x + sutun.genislik / 2;
  return {
    tur: "yazi",
    x,
    // Dikeyde ortala: satırın ortası + yazı yüksekliğinin yarısı kadar aşağı.
    y: satirY + satirYuksekligi / 2 + boyut * 0.36,
    metin,
    boyut,
    hiza: sutun.hiza,
    kalin,
    renk,
    enFazlaGenislik: sutun.genislik - ic * 2,
  };
}

function bilgiKutusu(
  komutlar: CizimKomutu[],
  x: number,
  y: number,
  genislik: number,
  yukseklik: number,
  etiket: string,
  deger: string,
  boyut: number,
) {
  komutlar.push({ tur: "kutu", x, y, genislik, yukseklik, cerceve: RENK.cizgi, kalinlik: INCE });
  komutlar.push({
    tur: "yazi",
    x: x + 1.5,
    y: y + yukseklik / 2 + boyut * 0.36,
    metin: etiket,
    boyut,
    hiza: "sol",
    kalin: true,
    renk: RENK.soluk,
  });
  // Değer sağa yaslanıyor. Etiketin genişliğini tahmin edip soluna yazsaydık,
  // canvas ile PDF'in yazı ölçümleri birebir aynı olmadığı için biri taşardı.
  const etiketGenislik = etiket.length * boyut * 0.62 + 3;
  komutlar.push({
    tur: "yazi",
    x: x + genislik - 1.5,
    y: y + yukseklik / 2 + boyut * 0.36,
    metin: deger,
    boyut,
    hiza: "sag",
    renk: RENK.metin,
    enFazlaGenislik: genislik - etiketGenislik - 3,
  });
}

function blokCiz(
  komutlar: CizimKomutu[],
  sayfa: YerlesimSayfasi,
  blokIndex: 0 | 1,
  blokX: number,
  tabloY: number,
  yerlesim: Yerlesim,
) {
  const { satirYuksekligi, yaziBoyutu, sutunBaslikYuksekligi } = yerlesim;
  const sutunlar = sutunKonumlari(blokX);
  const hucreler = sayfa.bloklar[blokIndex];
  const satirAdedi = sayfa.blokSatirSayisi;

  // Başlık şeridi
  komutlar.push({
    tur: "kutu",
    x: blokX,
    y: tabloY,
    genislik: BLOK_GENISLIK,
    yukseklik: sutunBaslikYuksekligi,
    dolgu: RENK.baslikZemin,
    cerceve: RENK.kalinCizgi,
    kalinlik: KALIN,
  });
  for (const s of sutunlar) {
    komutlar.push(
      hucreYazisi(
        SUTUN_BASLIKLARI[s.anahtar as keyof typeof SUTUN_BASLIKLARI],
        { x: s.x, genislik: s.genislik, hiza: "orta" },
        tabloY,
        sutunBaslikYuksekligi,
        yaziBoyutu * BASLIK_YAZI_ORANI,
        true,
      ),
    );
  }

  const govdeY = tabloY + sutunBaslikYuksekligi;
  const govdeYukseklik = satirAdedi * satirYuksekligi;

  // Satır zeminleri (bir dolu bir boş; okumayı kolaylaştırıyor)
  for (let i = 0; i < satirAdedi; i++) {
    if (i % 2 === 1) {
      komutlar.push({
        tur: "kutu",
        x: blokX,
        y: govdeY + i * satirYuksekligi,
        genislik: BLOK_GENISLIK,
        yukseklik: satirYuksekligi,
        dolgu: RENK.seritZemin,
      });
    }
  }

  // Yatay çizgiler
  for (let i = 1; i < satirAdedi; i++) {
    const y = govdeY + i * satirYuksekligi;
    komutlar.push({
      tur: "kutu",
      x: blokX,
      y,
      genislik: BLOK_GENISLIK,
      yukseklik: 0,
      cerceve: RENK.cizgi,
      kalinlik: INCE,
    });
  }

  // Dikey sütun çizgileri
  for (let i = 1; i < sutunlar.length; i++) {
    komutlar.push({
      tur: "kutu",
      x: sutunlar[i].x,
      y: tabloY,
      genislik: 0,
      yukseklik: sutunBaslikYuksekligi + govdeYukseklik,
      cerceve: RENK.cizgi,
      kalinlik: INCE,
    });
  }

  // Dış çerçeve
  komutlar.push({
    tur: "kutu",
    x: blokX,
    y: tabloY,
    genislik: BLOK_GENISLIK,
    yukseklik: sutunBaslikYuksekligi + govdeYukseklik,
    cerceve: RENK.kalinCizgi,
    kalinlik: KALIN,
  });

  // İçerik
  hucreler.forEach((h, i) => {
    const satirY = govdeY + i * satirYuksekligi;
    const degerler: Record<string, string> = {
      sira: String(h.sira),
      malzemeAdi: h.satir.malzemeAdi,
      miktar: h.satir.miktar,
      stokDurumu: h.satir.stokDurumu,
    };
    for (const s of sutunlar) {
      const deger = degerler[s.anahtar];
      if (!deger) continue;
      komutlar.push(
        hucreYazisi(
          deger,
          s,
          satirY,
          satirYuksekligi,
          yaziBoyutu,
          false,
          s.anahtar === "sira" ? RENK.soluk : RENK.metin,
        ),
      );
    }
  });

  // Dolu satırların ötesindeki boş satırlara da sıra numarası yaz (elle doldurmak için).
  const baslangic = sayfa.blokBaslangic[blokIndex];
  for (let i = hucreler.length; i < satirAdedi; i++) {
    const satirY = govdeY + i * satirYuksekligi;
    komutlar.push(
      hucreYazisi(
        String(baslangic + i),
        sutunlar[0],
        satirY,
        satirYuksekligi,
        yaziBoyutu,
        false,
        RENK.cizgi,
      ),
    );
  }
}

export function cizimUret(form: FormVerisi, secenekler: YerlesimSecenekleri = {}): Cizim {
  const yerlesim = sayfala(form, secenekler);
  const toplamSayfa = yerlesim.sayfalar.length;

  const sayfalar: SayfaCizimi[] = yerlesim.sayfalar.map((sayfa, index) => {
    const komutlar: CizimKomutu[] = [];
    let y = KENAR_BOSLUK;

    if (sayfa.ilkSayfa) {
      // Ana başlık
      komutlar.push({
        tur: "yazi",
        x: KENAR_BOSLUK + ICERIK_GENISLIK / 2,
        y: y + BASLIK_YUKSEKLIK * 0.68,
        metin: "MALZEME SİPARİŞ FORMU",
        boyut: 5.2,
        hiza: "orta",
        kalin: true,
        renk: RENK.metin,
      });
      y += BASLIK_YUKSEKLIK;

      // Şube / tarihler
      const kutuGenislik = (ICERIK_GENISLIK - 2 * 2) / 3;
      const bilgiBoyut = 3.1;
      bilgiKutusu(komutlar, KENAR_BOSLUK, y, kutuGenislik, BILGI_YUKSEKLIK, "ŞUBE:", form.sube, bilgiBoyut);
      bilgiKutusu(
        komutlar,
        KENAR_BOSLUK + kutuGenislik + 2,
        y,
        kutuGenislik,
        BILGI_YUKSEKLIK,
        "SİPARİŞ TARİHİ:",
        tarihGoster(form.siparisTarihi),
        bilgiBoyut,
      );
      bilgiKutusu(
        komutlar,
        KENAR_BOSLUK + (kutuGenislik + 2) * 2,
        y,
        kutuGenislik,
        BILGI_YUKSEKLIK,
        "TESLİM TARİHİ:",
        tarihGoster(form.teslimTarihi),
        bilgiBoyut,
      );
      y += BILGI_YUKSEKLIK + BASLIK_ALT_BOSLUK;
    } else {
      komutlar.push({
        tur: "yazi",
        x: KENAR_BOSLUK,
        y: y + DEVAM_BASLIK_YUKSEKLIK * 0.6,
        metin: `MALZEME SİPARİŞ FORMU${form.sube ? ` — ${form.sube}` : ""} (devam)`,
        boyut: 3.4,
        hiza: "sol",
        kalin: true,
        renk: RENK.soluk,
      });
      y += DEVAM_BASLIK_YUKSEKLIK;
    }

    blokCiz(komutlar, sayfa, 0, KENAR_BOSLUK, y, yerlesim);
    blokCiz(komutlar, sayfa, 1, KENAR_BOSLUK + BLOK_GENISLIK + BLOK_ARASI, y, yerlesim);

    // Alt bilgi ve notlar
    if (yerlesim.notVar) {
      const notY = 297 - KENAR_BOSLUK - NOT_YUKSEKLIK;
      komutlar.push({
        tur: "yazi",
        x: KENAR_BOSLUK,
        y: notY + 3,
        metin: "KULLANIM NOTU",
        boyut: 2.7,
        hiza: "sol",
        kalin: true,
        renk: RENK.soluk,
      });
      VARSAYILAN_NOTLAR.forEach((not, i) => {
        komutlar.push({
          tur: "yazi",
          x: KENAR_BOSLUK,
          y: notY + 6.4 + i * 2.9,
          metin: `• ${not}`,
          boyut: 2.5,
          hiza: "sol",
          renk: RENK.soluk,
        });
      });
    }

    komutlar.push({
      tur: "yazi",
      x: KENAR_BOSLUK + ICERIK_GENISLIK,
      y: 297 - KENAR_BOSLUK + 1.5,
      metin: `Sayfa ${index + 1} / ${toplamSayfa}`,
      boyut: 2.6,
      hiza: "sag",
      renk: RENK.soluk,
    });

    return { komutlar, sayfaNo: index + 1, toplamSayfa };
  });

  return { sayfalar, yerlesim };
}
