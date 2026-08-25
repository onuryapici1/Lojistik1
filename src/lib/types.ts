/**
 * Özlem Malzeme Formu — ortak tipler.
 *
 * Form yapısı, elle doldurulan Excel şablonundan birebir alınmıştır:
 * A4 dikey, yan yana iki blok, her blokta Sıra / Malzeme Adı / Miktar / Stok Durumu.
 * Sağ blok, sol bloğun devamıdır (1..N solda, N+1..2N sağda).
 */

/** Bir satırdaki stok durumu. Boş bırakılabilir. */
export type StokDurumu = "" | "Var" | "Az" | "Yok";

export const STOK_SECENEKLERI: StokDurumu[] = ["", "Var", "Az", "Yok"];

/**
 * Satır türü.
 * - `urun`   : normal malzeme satırı (Malzeme Adı / Miktar / Stok Durumu)
 * - `baslik` : "ET GRUBU", "SOSLAR" gibi grup başlığı — kendi satırını kaplar,
 *              miktar/stok alanı olmaz, kalın ve renkli basılır.
 */
export type SatirTuru = "urun" | "baslik";

export interface FormSatiri {
  /** İstemci tarafında satırı takip etmek için; veritabanı kimliğiyle aynı olmak zorunda değil. */
  id: string;
  tur: SatirTuru;
  malzemeAdi: string;
  /** Serbest metin: "10", "2 koli", "yarım kasa" gibi girdilere izin verir. */
  miktar: string;
  stokDurumu: StokDurumu;
}

/**
 * Sayfa yerleşim tercihi.
 * - `auto`     : ölçek kullanıcının seçtiği değerde kalır, sayfa sayısı ne çıkarsa çıkar
 * - `tekSayfa` : her şey tek A4'e sığana kadar otomatik küçültülür
 * - `bol`      : tam olarak `hedefSayfa` kadar sayfaya sığacak şekilde küçültülür
 */
export type SayfaModu = "auto" | "tekSayfa" | "bol";

export interface FormVerisi {
  id?: string;
  sube: string;
  /** ISO tarih (YYYY-MM-DD). Boş olabilir. */
  siparisTarihi: string;
  teslimTarihi: string;
  sayfaModu: SayfaModu;
  hedefSayfa: number;
  /** Yüzde ölçek; sadece `auto` modunda doğrudan kullanılır. */
  olcek: number;
  satirlar: FormSatiri[];
  createdAt?: string;
  updatedAt?: string;
}

let sayac = 0;

/** Çakışmayan satır kimliği üretir. randomUUID her yerde yok, o yüzden yedeği var. */
export function yeniId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  sayac += 1;
  return `satir-${Date.now()}-${sayac}`;
}

export function bosSatir(): FormSatiri {
  return { id: yeniId(), tur: "urun", malzemeAdi: "", miktar: "", stokDurumu: "" };
}

export function bosBaslik(): FormSatiri {
  return { id: yeniId(), tur: "baslik", malzemeAdi: "", miktar: "", stokDurumu: "" };
}

export function satirBosMu(satir: FormSatiri): boolean {
  return !satir.malzemeAdi.trim() && !satir.miktar.trim() && !satir.stokDurumu.trim();
}

export function bugun(): string {
  // Yerel saate göre YYYY-MM-DD. toISOString() UTC'ye kaydırdığı için gece yarısı civarı yanlış gün verebiliyor.
  const d = new Date();
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${ay}-${gun}`;
}

export function bosForm(): FormVerisi {
  return {
    sube: "",
    siparisTarihi: bugun(),
    teslimTarihi: "",
    sayfaModu: "tekSayfa",
    hedefSayfa: 2,
    olcek: 100,
    satirlar: Array.from({ length: 12 }, bosSatir),
  };
}

/**
 * Tarih seçilmediğinde forma basılan boş kalıp.
 * Kağıda basıp elle doldurmak için: gün/ay/yıl hanelerinin yeri belli olsun.
 */
export const TARIH_KALIBI = "../../....";

/** Tarihi form üzerinde gösterilecek biçime çevirir: 2026-08-25 -> 25.08.2026 */
export function tarihGoster(iso: string): string {
  if (!iso) return "";
  const parcalar = iso.split("-");
  if (parcalar.length !== 3) return iso;
  const [yil, ay, gun] = parcalar;
  return `${gun}.${ay}.${yil}`;
}
