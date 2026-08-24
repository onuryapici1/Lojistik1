export type PageMode = "auto" | "fit1" | "splitN";

export interface OrderItemData {
  id: string;
  malzemeAdi: string;
  miktar: string;
  stokDurumu: string;
}

export interface OrderData {
  id?: string;
  sube: string;
  siparisTarihi: string;
  teslimTarihi: string;
  pageMode: PageMode;
  splitCount: number;
  scale: number;
  items: OrderItemData[];
  createdAt?: string;
  updatedAt?: string;
}

export function emptyItem(): OrderItemData {
  return {
    id: crypto.randomUUID(),
    malzemeAdi: "",
    miktar: "",
    stokDurumu: "",
  };
}

export function emptyOrder(): OrderData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    sube: "",
    siparisTarihi: today,
    teslimTarihi: "",
    pageMode: "auto",
    splitCount: 2,
    scale: 100,
    items: Array.from({ length: 10 }, () => emptyItem()),
  };
}
