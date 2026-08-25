/**
 * A4 yerleşim motoru.
 *
 * Ekrandaki önizleme, PDF, PNG ve Excel çıktısının hepsi bu modülü kullanır.
 * Tek kaynak olmasının sebebi: önizlemede 2 sayfa görünüp PDF'te 3 sayfa çıkmasın.
 *
 * Bütün ölçüler milimetre cinsindendir.
 */

import type { FormVerisi, FormSatiri, SayfaModu } from "./types";
import { emGenisligi } from "./yaziGenislik";

export const SAYFA_GENISLIK = 210;
export const SAYFA_YUKSEKLIK = 297;
export const KENAR_BOSLUK = 10;

export const ICERIK_GENISLIK = SAYFA_GENISLIK - KENAR_BOSLUK * 2; // 190

/**
 * Sütun genişlikleri, orijinal Excel şablonundan birebir alınmıştır.
 *
 * Şablonda 7 sütun var ve iki blok EŞİT DEĞİL — "Sıra" yalnızca sol blokta:
 *
 *   A(6) Sıra │ B(32) Malzeme Adı │ C(11) Miktar │ D(15) Stok │ E(32) Malzeme Adı │ F(11) Miktar │ G(15) Stok
 *   └────────────── sol blok ──────────────────┘ └──────────── sağ blok ────────────┘
 *
 * Excel'in karakter birimlerini sayfaya orantılı olarak yayıyoruz; bloklar
 * arasında boşluk yok, tek bir bütün tablo (şablondaki gibi).
 */
const EXCEL_BIRIMLERI = { sira: 6, malzemeAdi: 32, miktar: 11, stokDurumu: 15 } as const;
const BIRIM_TOPLAM =
  EXCEL_BIRIMLERI.sira + (EXCEL_BIRIMLERI.malzemeAdi + EXCEL_BIRIMLERI.miktar + EXCEL_BIRIMLERI.stokDurumu) * 2; // 122
const MM_BASINA_BIRIM = ICERIK_GENISLIK / BIRIM_TOPLAM;

export const SUTUN_GENISLIK = {
  sira: EXCEL_BIRIMLERI.sira * MM_BASINA_BIRIM,
  malzemeAdi: EXCEL_BIRIMLERI.malzemeAdi * MM_BASINA_BIRIM,
  miktar: EXCEL_BIRIMLERI.miktar * MM_BASINA_BIRIM,
  stokDurumu: EXCEL_BIRIMLERI.stokDurumu * MM_BASINA_BIRIM,
} as const;

/** Sol blok "Sıra" sütununu da içerir, bu yüzden sağ bloktan geniştir. */
export const SOL_BLOK_GENISLIK =
  SUTUN_GENISLIK.sira + SUTUN_GENISLIK.malzemeAdi + SUTUN_GENISLIK.miktar + SUTUN_GENISLIK.stokDurumu;
export const SAG_BLOK_GENISLIK =
  SUTUN_GENISLIK.malzemeAdi + SUTUN_GENISLIK.miktar + SUTUN_GENISLIK.stokDurumu;

/** Sütun başlığı yazısı, hücre yazısından biraz küçük (uzun başlıklar sığsın diye). */
export const BASLIK_YAZI_ORANI = 0.78;

export const SUTUN_BASLIKLARI = {
  sira: "Sıra",
  malzemeAdi: "Malzeme Adı",
  miktar: "Miktar",
  stokDurumu: "Stok Durumu",
} as const;

/**
 * Sayfa başlığı alanı, orijinal Excel şablonuyla birebir aynı yerleşimde:
 *
 *   [ MALZEME SİPARİŞ FORMU (A1:D1) ][ TESLİM TARİHİ (E1:G1) ]
 *   [ ŞUBE: (A2:B2) ][ SİPARİŞ TARİHİ: (C2:D2) ][ TESLİM TARİHİ: (E2:G2) ]
 *
 * Üstteki "TESLİM TARİHİ" bir bölüm başlığıdır; asıl değer alttaki kutuda yazar.
 */
export const SUBE_KUTU_GENISLIK = SUTUN_GENISLIK.sira + SUTUN_GENISLIK.malzemeAdi;
export const SIPARIS_TARIHI_KUTU_GENISLIK = SUTUN_GENISLIK.miktar + SUTUN_GENISLIK.stokDurumu;

/** Sayfa başındaki sabit alanlar (ölçekten etkilenmez, form hep okunaklı kalsın diye). */
export const BASLIK_YUKSEKLIK = 9; // "MALZEME SİPARİŞ FORMU" / "TESLİM TARİHİ" satırı
/**
 * ŞUBE / SİPARİŞ TARİHİ / TESLİM TARİHİ satırı.
 * İki satırlık: üstte etiket, altta değer (veya elle yazmak için çizgi).
 */
export const BILGI_YUKSEKLIK = 11;
/**
 * Bilgi satırı ile tablo arasındaki boşluk.
 * Şablonda başlık, bilgi satırı ve tablo kesintisiz bitişik; 0 bırakıyoruz.
 */
export const BASLIK_ALT_BOSLUK = 0;
/** 2. ve sonraki sayfalarda sadece küçük bir "devam" başlığı olur. */
export const DEVAM_BASLIK_YUKSEKLIK = 7;

/** Alt kullanım notu açıksa ayrılan yer. */
export const NOT_YUKSEKLIK = 13;

export const VARSAYILAN_NOTLAR = [
  "Malzeme adları Malzeme Adı sütunundaki boş satırlara yazılır.",
  "Miktar sayı olarak girilir (ör. 10). Stok Durumu: Var / Az / Yok.",
  "Grup başlıkları (ör. ET GRUBU) kendi satırında, renkli olarak gösterilir.",
];

/** Ölçek %100 iken bir tablo satırının yüksekliği. */
export const TABAN_SATIR_YUKSEKLIK = 6.0;
/** Ölçek %100 iken tablo yazı boyutu. */
export const TABAN_YAZI_BOYUTU = 3.0;
/** Ölçek %100 iken sütun başlığı satırının yüksekliği. */
export const TABAN_SUTUN_BASLIK_YUKSEKLIK = 6.5;

export const MIN_OLCEK = 50;
export const MAX_OLCEK = 100;

/**
 * "boyut" (mm) değerini gerçek em yüksekliğine çeviren çarpan.
 * Canvas ve pdf-lib ikisi de bunu kullanıyor; tek yerden gelmesi şart, yoksa
 * yazılar iki çıktıda farklı boyutta çıkar.
 */
export const YAZI_EM_CARPANI = 1.42;

/** Hücre içi yatay boşluk (metnin kenarlara yapışmaması için). */
export const HUCRE_IC_BOSLUK = 1.2;

/** Uzun malzeme adları en fazla bu kadar satıra bölünür. */
export const EN_FAZLA_METIN_SATIRI = 2;

/** Malzeme adı sütununda metne kalan gerçek genişlik. */
export const MALZEME_METIN_GENISLIK = SUTUN_GENISLIK.malzemeAdi - HUCRE_IC_BOSLUK * 2;

/**
 * Metni sütuna sığacak şekilde en fazla EN_FAZLA_METIN_SATIRI satıra böler.
 *
 * Ölçüm yaziGenislik.ts'teki font tablosundan geliyor — canvas veya pdf-lib
 * ölçümü kullansaydık kaydırma noktası iki çıktıda farklı olur, önizleme ile
 * PDF ayrışırdı. Bölme burada bir kez yapılıp iki arka uca da aynı satırlar
 * veriliyor.
 */
export function metniKaydir(
  metin: string,
  kullanilabilirMm: number,
  boyutMm: number,
  kalinMi = false,
): string[] {
  const emMm = boyutMm * YAZI_EM_CARPANI;
  const olc = (s: string) => emGenisligi(s, kalinMi) * emMm;

  const temiz = metin.trim();
  if (!temiz) return [""];
  if (olc(temiz) <= kullanilabilirMm) return [temiz];

  const kelimeler = temiz.split(/\s+/);
  const satirlar: string[] = [];
  let mevcut = "";

  for (const kelime of kelimeler) {
    const aday = mevcut ? `${mevcut} ${kelime}` : kelime;
    if (!mevcut || olc(aday) <= kullanilabilirMm) {
      mevcut = aday;
    } else if (satirlar.length < EN_FAZLA_METIN_SATIRI - 1) {
      satirlar.push(mevcut);
      mevcut = kelime;
    } else {
      // Son satırdayız; kalanı ekle, çizim katmanı gerekirse kısaltır.
      mevcut = aday;
    }
  }
  satirlar.push(mevcut);
  return satirlar;
}

/** Bir satırın kaç birim (temel satır yüksekliği) yer kapladığı. */
export function satirBirimi(satir: FormSatiri, olcek: number): number {
  const satirlar = metniKaydir(
    satir.malzemeAdi,
    MALZEME_METIN_GENISLIK,
    yaziBoyutu(olcek),
    satir.tur === "baslik",
  );
  return Math.min(EN_FAZLA_METIN_SATIRI, satirlar.length);
}

/** Bütün satırların toplam birim maliyeti. */
export function toplamBirim(satirlar: FormSatiri[], olcek: number): number {
  let t = 0;
  for (const s of satirlar) t += satirBirimi(s, olcek);
  return t;
}

export function olcekSinirla(olcek: number): number {
  if (!Number.isFinite(olcek)) return MAX_OLCEK;
  return Math.min(MAX_OLCEK, Math.max(MIN_OLCEK, Math.round(olcek)));
}

export function satirYuksekligi(olcek: number): number {
  return (TABAN_SATIR_YUKSEKLIK * olcekSinirla(olcek)) / 100;
}

export function yaziBoyutu(olcek: number): number {
  return (TABAN_YAZI_BOYUTU * olcekSinirla(olcek)) / 100;
}

export function sutunBaslikYuksekligi(olcek: number): number {
  return (TABAN_SUTUN_BASLIK_YUKSEKLIK * olcekSinirla(olcek)) / 100;
}

/** Tablonun o sayfada kullanabileceği dikey alan. */
export function kullanilabilirYukseklik(ilkSayfa: boolean, notVar: boolean): number {
  const ustBaslik = ilkSayfa
    ? BASLIK_YUKSEKLIK + BILGI_YUKSEKLIK + BASLIK_ALT_BOSLUK
    : DEVAM_BASLIK_YUKSEKLIK;
  const alt = notVar ? NOT_YUKSEKLIK : 0;
  return SAYFA_YUKSEKLIK - KENAR_BOSLUK * 2 - ustBaslik - alt;
}

/** Bir bloğa (yani bir sütuna) sığan satır sayısı. */
export function blokSatirSayisi(olcek: number, ilkSayfa: boolean, notVar: boolean): number {
  const alan = kullanilabilirYukseklik(ilkSayfa, notVar) - sutunBaslikYuksekligi(olcek);
  return Math.max(1, Math.floor(alan / satirYuksekligi(olcek)));
}

/** Bir sayfaya sığan toplam satır sayısı (iki blok). */
export function sayfaKapasitesi(olcek: number, ilkSayfa: boolean, notVar: boolean): number {
  return blokSatirSayisi(olcek, ilkSayfa, notVar) * 2;
}

/**
 * Verilen ölçekte kaç A4 sayfa tuttuğunu hesaplar.
 *
 * Satırlar artık farklı yükseklikte olabildiği için (uzun malzeme adları iki
 * satıra kayıyor) blokları gerçekten doldurarak sayıyoruz; basit bir bölme
 * işlemi yanlış sonuç verirdi.
 */
export function sayfaSayisi(satirlar: FormSatiri[], olcek: number, notVar: boolean): number {
  if (satirlar.length === 0) return 1;
  const birimler = satirlar.map((s) => satirBirimi(s, olcek));

  let i = 0;
  let sayfa = 0;
  while (i < birimler.length && sayfa <= 200) {
    const kapasite = blokSatirSayisi(olcek, sayfa === 0, notVar);
    // Sayfada iki blok var; her birini sırayla doldur.
    for (let blok = 0; blok < 2 && i < birimler.length; blok++) {
      let kullanilan = 0;
      while (i < birimler.length) {
        const birim = birimler[i];
        // Blok tamamen boşsa sığmasa bile yerleştir; yoksa sonsuz döngü olur.
        if (kullanilan > 0 && kullanilan + birim > kapasite) break;
        kullanilan += birim;
        i += 1;
        if (kullanilan >= kapasite) break;
      }
    }
    sayfa += 1;
  }
  return Math.max(1, sayfa);
}

/**
 * Hedef sayfa sayısına sığan **en büyük** (yani en okunaklı) ölçeği bulur.
 * Hiçbir ölçekte sığmıyorsa MIN_OLCEK döner.
 */
export function hedefeSigdir(
  satirlar: FormSatiri[],
  hedefSayfa: number,
  notVar: boolean,
): number {
  const hedef = Math.max(1, Math.floor(hedefSayfa));
  for (let olcek = MAX_OLCEK; olcek >= MIN_OLCEK; olcek--) {
    if (sayfaSayisi(satirlar, olcek, notVar) <= hedef) return olcek;
  }
  return MIN_OLCEK;
}

/** Seçilen moda göre gerçekte uygulanacak ölçeği verir. */
export function olcekCoz(
  satirlar: FormSatiri[],
  mod: SayfaModu,
  hedefSayfa: number,
  elleOlcek: number,
  notVar: boolean,
): number {
  if (mod === "tekSayfa") return hedefeSigdir(satirlar, 1, notVar);
  if (mod === "bol") return hedefeSigdir(satirlar, hedefSayfa, notVar);
  return olcekSinirla(elleOlcek);
}

/** Yerleşimde tek bir hücre. */
export interface YerlesimSatiri {
  satir: FormSatiri;
  /** Formdaki sıra numarası (1'den başlar, her madde bir numara alır). */
  sira: number;
  /** Kapladığı birim sayısı: kısa adlar 1, iki satıra kayanlar 2. */
  birim: number;
  /** Bloğun üstünden itibaren kaç birim aşağıda başladığı. */
  ofset: number;
  /** Malzeme adının kaydırılmış hâli; çizim bunu olduğu gibi basar. */
  metinSatirlari: string[];
}

export interface YerlesimBlogu {
  hucreler: YerlesimSatiri[];
  /** Blokta toplam kaç birimlik yer var. */
  kapasite: number;
  /** Dolu hücrelerin kapladığı birim; kalanı boş satır olarak çizilir. */
  kullanilan: number;
  /** İlk boş satırın sıra numarası. */
  bosBaslangic: number;
}

export interface YerlesimSayfasi {
  ilkSayfa: boolean;
  /** Her zaman iki eleman: [sol blok, sağ blok]. */
  bloklar: [YerlesimBlogu, YerlesimBlogu];
}

export interface Yerlesim {
  olcek: number;
  sayfalar: YerlesimSayfasi[];
  sayfaSayisi: number;
  satirYuksekligi: number;
  yaziBoyutu: number;
  sutunBaslikYuksekligi: number;
  notVar: boolean;
}

export interface YerlesimSecenekleri {
  /** Alt kullanım notu gösterilsin mi. */
  notVar?: boolean;
  /**
   * Boş satırlar da çizilsin mi (kağıda basıp elle doldurmak için).
   * Kapalıysa sondaki boş satırlar atılır.
   */
  bosSatirlariKoru?: boolean;
}

/**
 * Formu A4 sayfalarına böler.
 *
 * Satırlar sırayla önce sol bloğu, sonra sağ bloğu doldurur; sayfa dolunca
 * yenisine geçilir. Sıra numarası bloklar ve sayfalar boyunca kesintisiz artar.
 */
export function sayfala(form: FormVerisi, secenekler: YerlesimSecenekleri = {}): Yerlesim {
  const notVar = secenekler.notVar ?? true;
  const bosSatirlariKoru = secenekler.bosSatirlariKoru ?? true;

  let satirlar = form.satirlar;
  if (!bosSatirlariKoru) {
    let son = satirlar.length;
    while (son > 0) {
      const s = satirlar[son - 1];
      if (s.malzemeAdi.trim() || s.miktar.trim() || s.stokDurumu.trim()) break;
      son -= 1;
    }
    satirlar = satirlar.slice(0, son);
  }

  const olcek = olcekCoz(satirlar, form.sayfaModu, form.hedefSayfa, form.olcek, notVar);
  const boyut = yaziBoyutu(olcek);

  const sayfalar: YerlesimSayfasi[] = [];
  let i = 0;
  let sayfaIndex = 0;
  /** Kaçıncı maddedeyiz — boş satırlar da numara aldığı için sürekli artıyor. */
  let siraSayaci = 0;

  /** Bir bloğu kapasitesi dolana kadar doldurur. */
  function blokDoldur(kapasite: number): YerlesimBlogu {
    const hucreler: YerlesimSatiri[] = [];
    let kullanilan = 0;

    while (i < satirlar.length) {
      const satir = satirlar[i];
      const metinSatirlari = metniKaydir(
        satir.malzemeAdi,
        MALZEME_METIN_GENISLIK,
        boyut,
        satir.tur === "baslik",
      );
      const birim = Math.min(EN_FAZLA_METIN_SATIRI, metinSatirlari.length);

      // Blok tamamen boşsa sığmasa bile yerleştir; yoksa iki satırlık bir ad
      // tek birimlik bir bloğa hiç giremez ve sonsuz döngü olur.
      if (kullanilan > 0 && kullanilan + birim > kapasite) break;

      siraSayaci += 1;
      hucreler.push({ satir, sira: siraSayaci, birim, ofset: kullanilan, metinSatirlari });
      kullanilan += birim;
      i += 1;
      if (kullanilan >= kapasite) break;
    }

    const bosBaslangic = siraSayaci + 1;
    // Kalan boş satırlar da numara alıyor (kağıda basıp elle doldurmak için).
    siraSayaci += Math.max(0, kapasite - kullanilan);

    return { hucreler, kapasite, kullanilan, bosBaslangic };
  }

  do {
    const ilkSayfa = sayfaIndex === 0;
    const kapasite = blokSatirSayisi(olcek, ilkSayfa, notVar);
    const sol = blokDoldur(kapasite);
    const sag = blokDoldur(kapasite);
    sayfalar.push({ ilkSayfa, bloklar: [sol, sag] });
    sayfaIndex += 1;
  } while (i < satirlar.length && sayfaIndex <= 200);

  return {
    olcek,
    sayfalar,
    sayfaSayisi: sayfalar.length,
    satirYuksekligi: satirYuksekligi(olcek),
    yaziBoyutu: yaziBoyutu(olcek),
    sutunBaslikYuksekligi: sutunBaslikYuksekligi(olcek),
    notVar,
  };
}

/**
 * Kullanıcıya "şu an kaç sayfa" bilgisini vermek için hafif yardımcı.
 * Tam yerleşim üretmeden sadece sayı hesaplar.
 */
export function ozet(form: FormVerisi, notVar = true) {
  const doluSatir = form.satirlar.filter(
    (s) => s.malzemeAdi.trim() || s.miktar.trim() || s.stokDurumu.trim(),
  ).length;
  const olcek = olcekCoz(form.satirlar, form.sayfaModu, form.hedefSayfa, form.olcek, notVar);
  return {
    olcek,
    sayfaSayisi: sayfaSayisi(form.satirlar, olcek, notVar),
    toplamSatir: form.satirlar.length,
    doluSatir,
    tekSayfayaSigarMi: hedefeSigdir(form.satirlar, 1, notVar) > MIN_OLCEK,
  };
}
