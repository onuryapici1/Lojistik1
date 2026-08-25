/**
 * A4 yerleşim motoru.
 *
 * Ekrandaki önizleme, PDF, PNG ve Excel çıktısının hepsi bu modülü kullanır.
 * Tek kaynak olmasının sebebi: önizlemede 2 sayfa görünüp PDF'te 3 sayfa çıkmasın.
 *
 * Bütün ölçüler milimetre cinsindendir.
 */

import type { FormVerisi, FormSatiri, SayfaModu } from "./types";

export const SAYFA_GENISLIK = 210;
export const SAYFA_YUKSEKLIK = 297;
export const KENAR_BOSLUK = 10;

/** İki blok arasındaki boşluk. */
export const BLOK_ARASI = 5;

export const ICERIK_GENISLIK = SAYFA_GENISLIK - KENAR_BOSLUK * 2; // 190
export const BLOK_GENISLIK = (ICERIK_GENISLIK - BLOK_ARASI) / 2; // 92.5

/**
 * Blok içindeki sütun genişlikleri; toplamı BLOK_GENISLIK olmalı.
 * "Stok Durumu" başlığı kırpılmadan sığsın diye o sütun geniş tutuldu.
 */
export const SUTUN_GENISLIK = {
  sira: 7,
  malzemeAdi: 42.5,
  miktar: 16,
  stokDurumu: 27,
} as const;

/** Sütun başlığı yazısı, hücre yazısından biraz küçük (uzun başlıklar sığsın diye). */
export const BASLIK_YAZI_ORANI = 0.85;

export const SUTUN_BASLIKLARI = {
  sira: "Sıra",
  malzemeAdi: "Malzeme Adı",
  miktar: "Miktar",
  stokDurumu: "Stok Durumu",
} as const;

/** Sayfa başındaki sabit alanlar (ölçekten etkilenmez, form hep okunaklı kalsın diye). */
export const BASLIK_YUKSEKLIK = 9; // "MALZEME SİPARİŞ FORMU"
export const BILGI_YUKSEKLIK = 8; // ŞUBE / SİPARİŞ TARİHİ / TESLİM TARİHİ
export const BASLIK_ALT_BOSLUK = 3;
/** 2. ve sonraki sayfalarda sadece küçük bir "devam" başlığı olur. */
export const DEVAM_BASLIK_YUKSEKLIK = 7;

/** Alt kullanım notu açıksa ayrılan yer. */
export const NOT_YUKSEKLIK = 13;

export const VARSAYILAN_NOTLAR = [
  "Malzeme adları Malzeme Adı sütunundaki boş satırlara yazılır.",
  "Miktar sayı olarak girilir (ör. 10). Stok Durumu: Var / Az / Yok.",
  "Sağ blok, sol bloğun devamıdır.",
];

/** Ölçek %100 iken bir tablo satırının yüksekliği. */
export const TABAN_SATIR_YUKSEKLIK = 6.0;
/** Ölçek %100 iken tablo yazı boyutu. */
export const TABAN_YAZI_BOYUTU = 3.0;
/** Ölçek %100 iken sütun başlığı satırının yüksekliği. */
export const TABAN_SUTUN_BASLIK_YUKSEKLIK = 6.5;

export const MIN_OLCEK = 50;
export const MAX_OLCEK = 100;

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

/** Verilen ölçekte kaç A4 sayfa tuttuğunu hesaplar. */
export function sayfaSayisi(satirSayisi: number, olcek: number, notVar: boolean): number {
  if (satirSayisi <= 0) return 1;
  let kalan = satirSayisi;
  let sayfa = 0;
  while (kalan > 0) {
    kalan -= sayfaKapasitesi(olcek, sayfa === 0, notVar);
    sayfa += 1;
    if (sayfa > 200) break; // güvenlik sınırı
  }
  return sayfa;
}

/**
 * Hedef sayfa sayısına sığan **en büyük** (yani en okunaklı) ölçeği bulur.
 * Hiçbir ölçekte sığmıyorsa MIN_OLCEK döner.
 */
export function hedefeSigdir(satirSayisi: number, hedefSayfa: number, notVar: boolean): number {
  const hedef = Math.max(1, Math.floor(hedefSayfa));
  for (let olcek = MAX_OLCEK; olcek >= MIN_OLCEK; olcek--) {
    if (sayfaSayisi(satirSayisi, olcek, notVar) <= hedef) return olcek;
  }
  return MIN_OLCEK;
}

/** Seçilen moda göre gerçekte uygulanacak ölçeği verir. */
export function olcekCoz(
  satirSayisi: number,
  mod: SayfaModu,
  hedefSayfa: number,
  elleOlcek: number,
  notVar: boolean,
): number {
  if (mod === "tekSayfa") return hedefeSigdir(satirSayisi, 1, notVar);
  if (mod === "bol") return hedefeSigdir(satirSayisi, hedefSayfa, notVar);
  return olcekSinirla(elleOlcek);
}

/** Yerleşimde tek bir hücre: satır verisi + formdaki global sıra numarası. */
export interface YerlesimSatiri {
  satir: FormSatiri;
  sira: number;
}

export interface YerlesimSayfasi {
  ilkSayfa: boolean;
  /** Her zaman iki eleman: [sol blok, sağ blok]. Bloklar eksik satırla dolmaz. */
  bloklar: [YerlesimSatiri[], YerlesimSatiri[]];
  /** Bloğun kaç satırlık yer kapladığı — boş satırlar da çizilsin diye. */
  blokSatirSayisi: number;
  /**
   * Her bloğun ilk satırının global sıra numarası (1'den başlar).
   * Veri bitse bile boş satırlara numara yazabilmek için gerekiyor.
   */
  blokBaslangic: [number, number];
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

  const olcek = olcekCoz(satirlar.length, form.sayfaModu, form.hedefSayfa, form.olcek, notVar);

  const sayfalar: YerlesimSayfasi[] = [];
  let i = 0;
  let sayfaIndex = 0;
  /** Kaç satırlık yer harcandığı — dolu olsun olmasın. Numaralandırma buna göre. */
  let harcananSlot = 0;

  do {
    const ilkSayfa = sayfaIndex === 0;
    const blokBoyu = blokSatirSayisi(olcek, ilkSayfa, notVar);

    const solBaslangic = harcananSlot + 1;
    const sol: YerlesimSatiri[] = [];
    for (let k = 0; k < blokBoyu && i < satirlar.length; k++, i++) {
      sol.push({ satir: satirlar[i], sira: solBaslangic + k });
    }
    harcananSlot += blokBoyu;

    const sagBaslangic = harcananSlot + 1;
    const sag: YerlesimSatiri[] = [];
    for (let k = 0; k < blokBoyu && i < satirlar.length; k++, i++) {
      sag.push({ satir: satirlar[i], sira: sagBaslangic + k });
    }
    harcananSlot += blokBoyu;

    sayfalar.push({
      ilkSayfa,
      bloklar: [sol, sag],
      blokSatirSayisi: blokBoyu,
      blokBaslangic: [solBaslangic, sagBaslangic],
    });
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
  const olcek = olcekCoz(form.satirlar.length, form.sayfaModu, form.hedefSayfa, form.olcek, notVar);
  return {
    olcek,
    sayfaSayisi: sayfaSayisi(form.satirlar.length, olcek, notVar),
    toplamSatir: form.satirlar.length,
    doluSatir,
    tekSayfayaSigarMi: hedefeSigdir(form.satirlar.length, 1, notVar) > MIN_OLCEK,
  };
}
