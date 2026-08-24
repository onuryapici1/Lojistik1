import type { OrderItemData, PageMode } from "./types";

// A4 sayfa ölçüleri ve baskı düzeni sabitleri (mm cinsinden).
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PAGE_MARGIN_MM = 10;
export const HEADER_BLOCK_MM = 24; // başlık + şube/tarih alanları
export const COLUMN_HEADER_MM = 7; // "Sıra / Malzeme Adı / Miktar / Stok Durumu" satırı
export const BASE_ROW_HEIGHT_MM = 6.4; // scale=100 iken bir satırın yüksekliği
export const BASE_FONT_MM = 3.1; // scale=100 iken yazı boyutu (rowHeight ile aynı oranda ölçeklenir)
export const MIN_SCALE = 55;
export const MAX_SCALE = 100;

function availableColumnHeightMm(isFirstPage: boolean) {
  const header = isFirstPage ? HEADER_BLOCK_MM : 10; // sonraki sayfalarda küçük üst boşluk
  return A4_HEIGHT_MM - PAGE_MARGIN_MM * 2 - header - COLUMN_HEADER_MM;
}

export function rowsPerColumnAt(scale: number, isFirstPage = true): number {
  const rowHeight = (BASE_ROW_HEIGHT_MM * scale) / 100;
  return Math.max(1, Math.floor(availableColumnHeightMm(isFirstPage) / rowHeight));
}

export function itemsPerPageAt(scale: number, isFirstPage = true): number {
  return rowsPerColumnAt(scale, isFirstPage) * 2;
}

export interface PaginationResult {
  scale: number;
  pages: OrderItemData[][][]; // pages[pageIndex][columnIndex] = items
  pageCount: number;
  rowsPerColumn: number;
}

function chunkIntoPages(items: OrderItemData[], scale: number): OrderItemData[][][] {
  const pages: OrderItemData[][][] = [];
  let i = 0;
  let pageIndex = 0;
  if (items.length === 0) {
    return [[[], []]];
  }
  while (i < items.length) {
    const isFirstPage = pageIndex === 0;
    const rowsPerColumn = rowsPerColumnAt(scale, isFirstPage);
    const left = items.slice(i, i + rowsPerColumn);
    i += left.length;
    const right = items.slice(i, i + rowsPerColumn);
    i += right.length;
    pages.push([left, right]);
    pageIndex += 1;
  }
  return pages;
}

/** Belirli bir scale değerinde toplam sayfa sayısını hesaplar. */
export function computePageCount(items: OrderItemData[], scale: number): number {
  if (items.length === 0) return 1;
  let remaining = items.length;
  let pageIndex = 0;
  let pages = 0;
  while (remaining > 0) {
    const isFirstPage = pageIndex === 0;
    const capacity = itemsPerPageAt(scale, isFirstPage);
    remaining -= capacity;
    pageIndex += 1;
    pages += 1;
    if (pageIndex > 500) break; // güvenlik sınırı
  }
  return pages;
}

/** "1 sayfaya sığdır" için gereken en büyük (en az sıkıştırılmış) scale değerini bulur. */
export function findScaleForSinglePage(items: OrderItemData[]): number {
  for (let scale = MAX_SCALE; scale >= MIN_SCALE; scale--) {
    if (computePageCount(items, scale) === 1) return scale;
  }
  return MIN_SCALE;
}

/** Hedef sayfa sayısına ulaşmak için gereken en büyük (en okunaklı) scale değerini bulur. */
export function findScaleForPageCount(items: OrderItemData[], targetPages: number): number {
  if (targetPages <= 0) targetPages = 1;
  for (let scale = MAX_SCALE; scale >= MIN_SCALE; scale--) {
    if (computePageCount(items, scale) <= targetPages) return scale;
  }
  return MIN_SCALE;
}

export function resolveScale(items: OrderItemData[], pageMode: PageMode, splitCount: number, manualScale: number): number {
  if (pageMode === "fit1") return findScaleForSinglePage(items);
  if (pageMode === "splitN") return findScaleForPageCount(items, splitCount);
  return manualScale;
}

export function paginate(items: OrderItemData[], pageMode: PageMode, splitCount: number, manualScale: number): PaginationResult {
  const scale = resolveScale(items, pageMode, splitCount, manualScale);
  const pages = chunkIntoPages(items, scale);
  return {
    scale,
    pages,
    pageCount: pages.length,
    rowsPerColumn: rowsPerColumnAt(scale, true),
  };
}
