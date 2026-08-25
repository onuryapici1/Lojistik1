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
  SOL_BLOK_GENISLIK,
  SAG_BLOK_GENISLIK,
  ICERIK_GENISLIK,
  KENAR_BOSLUK,
  SUTUN_BASLIKLARI,
  BASLIK_YAZI_ORANI,
  SUTUN_GENISLIK,
  SUBE_KUTU_GENISLIK,
  SIPARIS_TARIHI_KUTU_GENISLIK,
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
  /** Grup başlığı satırları (ET GRUBU, SOSLAR vb.) — orijinal formdaki kırmızı vurguyla aynı. */
  grupBasligi: "#b91c1c",
} as const;

const INCE = 0.18;
const KALIN = 0.4;

type SutunTanimi = { anahtar: string; genislik: number; hiza: Hiza };

const SIRA_SUTUNU: SutunTanimi = {
  anahtar: "sira",
  genislik: SUTUN_GENISLIK.sira,
  hiza: "orta",
};
const VERI_SUTUNLARI: SutunTanimi[] = [
  { anahtar: "malzemeAdi", genislik: SUTUN_GENISLIK.malzemeAdi, hiza: "sol" },
  { anahtar: "miktar", genislik: SUTUN_GENISLIK.miktar, hiza: "orta" },
  { anahtar: "stokDurumu", genislik: SUTUN_GENISLIK.stokDurumu, hiza: "orta" },
];

/** Şablonda "Sıra" yalnızca sol blokta var; sağ blok üç sütundan oluşur. */
const SOL_SUTUNLAR: SutunTanimi[] = [SIRA_SUTUNU, ...VERI_SUTUNLARI];
const SAG_SUTUNLAR: SutunTanimi[] = VERI_SUTUNLARI;

function sutunKonumlari(blokX: number, sutunlar: SutunTanimi[]) {
  const sonuc: { anahtar: string; x: number; genislik: number; hiza: Hiza }[] = [];
  let x = blokX;
  for (const s of sutunlar) {
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
  ic = 1.2, // hücre iç boşluğu; sütun başlığı gibi dar/kalın metinlerde küçültülür
): YaziKomutu {
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
  const solMu = blokIndex === 0;
  const blokGenislik = solMu ? SOL_BLOK_GENISLIK : SAG_BLOK_GENISLIK;
  const sutunlar = sutunKonumlari(blokX, solMu ? SOL_SUTUNLAR : SAG_SUTUNLAR);
  const hucreler = sayfa.bloklar[blokIndex];
  const satirAdedi = sayfa.blokSatirSayisi;

  // Başlık şeridi
  komutlar.push({
    tur: "kutu",
    x: blokX,
    y: tabloY,
    genislik: blokGenislik,
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
        RENK.metin,
        0.5,
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
        genislik: blokGenislik,
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
      genislik: blokGenislik,
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
    genislik: blokGenislik,
    yukseklik: sutunBaslikYuksekligi + govdeYukseklik,
    cerceve: RENK.kalinCizgi,
    kalinlik: KALIN,
  });

  // İçerik
  hucreler.forEach((h, i) => {
    const satirY = govdeY + i * satirYuksekligi;
    const baslikMi = h.satir.tur === "baslik";
    const degerler: Record<string, string> = {
      sira: String(h.sira),
      malzemeAdi: h.satir.malzemeAdi,
      // Başlık satırında miktar/stok zaten boş geliyor (bosBaslik + formuDogrula
      // bunu garanti ediyor) ama görsel olarak da bilerek boş bırakıyoruz.
      miktar: baslikMi ? "" : h.satir.miktar,
      stokDurumu: baslikMi ? "" : h.satir.stokDurumu,
    };
    for (const s of sutunlar) {
      const deger = degerler[s.anahtar];
      if (!deger) continue;
      const malzemeSutunu = s.anahtar === "malzemeAdi";
      komutlar.push(
        hucreYazisi(
          deger,
          s,
          satirY,
          satirYuksekligi,
          yaziBoyutu,
          s.anahtar === "sira" ? false : baslikMi && malzemeSutunu,
          s.anahtar === "sira" ? RENK.soluk : baslikMi && malzemeSutunu ? RENK.grupBasligi : RENK.metin,
        ),
      );
    }
  });

  // Dolu satırların ötesindeki boş satırlara da sıra numarası yaz (elle doldurmak
  // için). Sağ blokta "Sıra" sütunu yok — şablonda da yok — o yüzden atlanıyor.
  if (solMu) {
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
}

export function cizimUret(form: FormVerisi, secenekler: YerlesimSecenekleri = {}): Cizim {
  const yerlesim = sayfala(form, secenekler);
  const toplamSayfa = yerlesim.sayfalar.length;

  const sayfalar: SayfaCizimi[] = yerlesim.sayfalar.map((sayfa, index) => {
    const komutlar: CizimKomutu[] = [];
    let y = KENAR_BOSLUK;

    if (sayfa.ilkSayfa) {
      // Başlık satırı: orijinal Excel şablonuyla birebir aynı — "MALZEME SİPARİŞ
      // FORMU" yalnızca sol blok genişliğinde, "TESLİM TARİHİ" sağ blok genişliğinde
      // ikinci bir bölüm başlığı olarak (A1:D1 / E1:G1 birleştirilmiş hücreleri).
      const solBlokX = KENAR_BOSLUK;
      const sagBlokX = KENAR_BOSLUK + SOL_BLOK_GENISLIK;

      // Başlık satırı da çerçeveli (şablonda A1:D1 ve E1:G1 kenarlıklı hücreler).
      komutlar.push({
        tur: "kutu",
        x: solBlokX,
        y,
        genislik: SOL_BLOK_GENISLIK,
        yukseklik: BASLIK_YUKSEKLIK,
        cerceve: RENK.kalinCizgi,
        kalinlik: KALIN,
      });
      komutlar.push({
        tur: "kutu",
        x: sagBlokX,
        y,
        genislik: SAG_BLOK_GENISLIK,
        yukseklik: BASLIK_YUKSEKLIK,
        cerceve: RENK.kalinCizgi,
        kalinlik: KALIN,
      });
      komutlar.push({
        tur: "yazi",
        x: solBlokX + SOL_BLOK_GENISLIK / 2,
        y: y + BASLIK_YUKSEKLIK * 0.68,
        metin: "MALZEME SİPARİŞ FORMU",
        boyut: 4.6,
        hiza: "orta",
        kalin: true,
        renk: RENK.metin,
      });
      komutlar.push({
        tur: "yazi",
        x: sagBlokX + SAG_BLOK_GENISLIK / 2,
        y: y + BASLIK_YUKSEKLIK * 0.68,
        metin: "TESLİM TARİHİ",
        boyut: 4.6,
        hiza: "orta",
        kalin: true,
        renk: RENK.metin,
      });
      y += BASLIK_YUKSEKLIK;

      // Değer satırı: ŞUBE + SİPARİŞ TARİHİ sol blok altında (A2:B2 / C2:D2),
      // TESLİM TARİHİ sağ blok altında tam genişlikte (E2:G2).
      const bilgiBoyut = 3.1;
      bilgiKutusu(komutlar, solBlokX, y, SUBE_KUTU_GENISLIK, BILGI_YUKSEKLIK, "ŞUBE:", form.sube, bilgiBoyut);
      bilgiKutusu(
        komutlar,
        solBlokX + SUBE_KUTU_GENISLIK,
        y,
        SIPARIS_TARIHI_KUTU_GENISLIK,
        BILGI_YUKSEKLIK,
        "SİPARİŞ TARİHİ:",
        tarihGoster(form.siparisTarihi),
        bilgiBoyut,
      );
      bilgiKutusu(
        komutlar,
        sagBlokX,
        y,
        SAG_BLOK_GENISLIK,
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

    // Bloklar bitişik: şablondaki gibi tek bir bütün tablo oluşturuyorlar.
    blokCiz(komutlar, sayfa, 0, KENAR_BOSLUK, y, yerlesim);
    blokCiz(komutlar, sayfa, 1, KENAR_BOSLUK + SOL_BLOK_GENISLIK, y, yerlesim);

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
