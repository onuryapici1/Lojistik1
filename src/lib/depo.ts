/**
 * Veritabanı erişimi.
 *
 * Tablo adları (Order / OrderItem) ilk sürümden devralındı; alan adları
 * uygulamanın Türkçe tipleriyle burada eşleştiriliyor.
 */

import { prisma } from "./prisma";
import type { FormVerisi, FormSatiri, SayfaModu, StokDurumu } from "./types";
import { yeniId } from "./types";
import { MIN_OLCEK, MAX_OLCEK } from "./yerlesim";

const GECERLI_MODLAR: SayfaModu[] = ["auto", "tekSayfa", "bol"];
const GECERLI_STOK: StokDurumu[] = ["", "Var", "Az", "Yok"];

function modOku(v: string): SayfaModu {
  // İlk sürümde "fit1" / "splitN" kullanılıyordu; eski kayıtlar okunabilsin.
  if (v === "fit1") return "tekSayfa";
  if (v === "splitN") return "bol";
  return (GECERLI_MODLAR as string[]).includes(v) ? (v as SayfaModu) : "auto";
}

function stokOku(v: string): StokDurumu {
  return (GECERLI_STOK as string[]).includes(v) ? (v as StokDurumu) : "";
}

/** Dışarıdan gelen ham gövdeyi güvenli bir FormVerisi'ne çevirir. */
export function formuDogrula(ham: unknown): { form: FormVerisi } | { hata: string } {
  if (typeof ham !== "object" || ham === null) return { hata: "Geçersiz istek gövdesi" };
  const o = ham as Record<string, unknown>;

  const metin = (v: unknown, enFazla = 300): string =>
    typeof v === "string" ? v.slice(0, enFazla) : "";

  const satirlarHam = Array.isArray(o.satirlar) ? o.satirlar : [];
  if (satirlarHam.length > 2000) return { hata: "Satır sayısı çok fazla (en fazla 2000)" };

  const satirlar: FormSatiri[] = satirlarHam.map((s) => {
    const r = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
    return {
      id: metin(r.id, 64) || yeniId(),
      malzemeAdi: metin(r.malzemeAdi, 300),
      miktar: metin(r.miktar, 60),
      stokDurumu: stokOku(metin(r.stokDurumu, 10)),
    };
  });

  const hedefSayfaHam = Number(o.hedefSayfa);
  const olcekHam = Number(o.olcek);

  return {
    form: {
      sube: metin(o.sube, 120),
      siparisTarihi: metin(o.siparisTarihi, 10),
      teslimTarihi: metin(o.teslimTarihi, 10),
      sayfaModu: modOku(metin(o.sayfaModu, 20)),
      hedefSayfa: Number.isFinite(hedefSayfaHam) ? Math.min(20, Math.max(1, Math.round(hedefSayfaHam))) : 2,
      olcek: Number.isFinite(olcekHam)
        ? Math.min(MAX_OLCEK, Math.max(MIN_OLCEK, Math.round(olcekHam)))
        : MAX_OLCEK,
      satirlar,
    },
  };
}

type KayitliForm = {
  id: string;
  sube: string;
  siparisTarihi: string;
  teslimTarihi: string;
  pageMode: string;
  splitCount: number;
  scale: number;
  createdAt: Date;
  updatedAt: Date;
  items: { id: string; malzemeAdi: string; miktar: string; stokDurumu: string }[];
};

function kayittanForma(k: KayitliForm): FormVerisi {
  return {
    id: k.id,
    sube: k.sube,
    siparisTarihi: k.siparisTarihi,
    teslimTarihi: k.teslimTarihi,
    sayfaModu: modOku(k.pageMode),
    hedefSayfa: k.splitCount,
    olcek: k.scale,
    satirlar: k.items.map((i) => ({
      id: i.id,
      malzemeAdi: i.malzemeAdi,
      miktar: i.miktar,
      stokDurumu: stokOku(i.stokDurumu),
    })),
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  };
}

const ITEM_SECIM = {
  orderBy: { position: "asc" as const },
  select: { id: true, malzemeAdi: true, miktar: true, stokDurumu: true },
};

export async function formOlustur(form: FormVerisi): Promise<FormVerisi> {
  const kayit = await prisma.order.create({
    data: {
      sube: form.sube,
      siparisTarihi: form.siparisTarihi,
      teslimTarihi: form.teslimTarihi,
      pageMode: form.sayfaModu,
      splitCount: form.hedefSayfa,
      scale: form.olcek,
      items: {
        create: form.satirlar.map((s, i) => ({
          position: i,
          malzemeAdi: s.malzemeAdi,
          miktar: s.miktar,
          stokDurumu: s.stokDurumu,
        })),
      },
    },
    include: { items: ITEM_SECIM },
  });
  return kayittanForma(kayit as KayitliForm);
}

export async function formGetir(id: string): Promise<FormVerisi | null> {
  const kayit = await prisma.order.findUnique({
    where: { id },
    include: { items: ITEM_SECIM },
  });
  return kayit ? kayittanForma(kayit as KayitliForm) : null;
}

export async function formGuncelle(id: string, form: FormVerisi): Promise<FormVerisi | null> {
  const mevcut = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!mevcut) return null;

  // Satırları tek tek eşleştirmek yerine silip yeniden yazıyoruz: sıra değişimi,
  // araya ekleme ve silme işlemleri bu yolla tek bir işlemde tutarlı kalıyor.
  const [, kayit] = await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId: id } }),
    prisma.order.update({
      where: { id },
      data: {
        sube: form.sube,
        siparisTarihi: form.siparisTarihi,
        teslimTarihi: form.teslimTarihi,
        pageMode: form.sayfaModu,
        splitCount: form.hedefSayfa,
        scale: form.olcek,
        items: {
          create: form.satirlar.map((s, i) => ({
            position: i,
            malzemeAdi: s.malzemeAdi,
            miktar: s.miktar,
            stokDurumu: s.stokDurumu,
          })),
        },
      },
      include: { items: ITEM_SECIM },
    }),
  ]);

  return kayittanForma(kayit as KayitliForm);
}

export async function formSil(id: string): Promise<boolean> {
  try {
    await prisma.order.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export interface FormOzeti {
  id: string;
  sube: string;
  siparisTarihi: string;
  teslimTarihi: string;
  satirSayisi: number;
  updatedAt: string;
}

export async function formlariListele(limit = 100): Promise<FormOzeti[]> {
  const kayitlar = await prisma.order.findMany({
    orderBy: { updatedAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
    select: {
      id: true,
      sube: true,
      siparisTarihi: true,
      teslimTarihi: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  });

  return kayitlar.map((k) => ({
    id: k.id,
    sube: k.sube,
    siparisTarihi: k.siparisTarihi,
    teslimTarihi: k.teslimTarihi,
    satirSayisi: k._count.items,
    updatedAt: k.updatedAt.toISOString(),
  }));
}
