import ExcelJS from "exceljs";
import type { OrderData } from "@/lib/types";
import { paginate } from "@/lib/pagination";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

export async function buildOrderWorkbook(order: OrderData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Özlem Malzeme Formu";
  workbook.created = new Date();

  const result = paginate(order.items, order.pageMode, order.splitCount, order.scale);

  result.pages.forEach((page, pageIndex) => {
    const [left, right] = page;
    const sheet = workbook.addWorksheet(`Sayfa ${pageIndex + 1}`, {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    });

    sheet.columns = [
      { width: 6 },
      { width: 32 },
      { width: 11 },
      { width: 15 },
      { width: 32 },
      { width: 11 },
      { width: 15 },
    ];

    let row = 1;

    if (pageIndex === 0) {
      sheet.mergeCells(row, 1, row, 7);
      const titleCell = sheet.getCell(row, 1);
      titleCell.value = "MALZEME SİPARİŞ FORMU";
      titleCell.font = { bold: true, size: 14, name: "Arial" };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.border = THIN_BORDER;
      sheet.getRow(row).height = 22;
      row += 1;

      sheet.mergeCells(row, 1, row, 2);
      sheet.getCell(row, 1).value = `ŞUBE: ${order.sube}`;
      sheet.mergeCells(row, 3, row, 4);
      sheet.getCell(row, 3).value = `SİPARİŞ TARİHİ: ${order.siparisTarihi}`;
      sheet.mergeCells(row, 5, row, 7);
      sheet.getCell(row, 5).value = `TESLİM TARİHİ: ${order.teslimTarihi}`;
      for (const col of [1, 3, 5]) {
        const cell = sheet.getCell(row, col);
        cell.font = { bold: true, name: "Arial", size: 10 };
        cell.border = THIN_BORDER;
      }
      row += 1;
    } else {
      sheet.mergeCells(row, 1, row, 7);
      const cell = sheet.getCell(row, 1);
      cell.value = `Sayfa ${pageIndex + 1} / ${result.pages.length}`;
      cell.font = { italic: true, size: 9, name: "Arial", color: { argb: "FF64748B" } };
      cell.alignment = { horizontal: "right" };
      row += 1;
    }

    const headerRow = row;
    const headers = ["Sıra", "Malzeme Adı", "Miktar", "Stok Durumu", "Malzeme Adı", "Miktar", "Stok Durumu"];
    headers.forEach((text, i) => {
      const cell = sheet.getCell(headerRow, i + 1);
      cell.value = text;
      cell.font = { bold: true, name: "Arial", size: 10 };
      cell.fill = HEADER_FILL;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: "center" };
    });
    row += 1;

    const rowCount = Math.max(left.length, right.length);
    const startNumber = result.pages.slice(0, pageIndex).reduce((sum, p) => sum + p[0].length + p[1].length, 0);

    for (let i = 0; i < rowCount; i++) {
      const r = row + i;
      const l = left[i];
      const rt = right[i];

      sheet.getCell(r, 1).value = l ? startNumber + i + 1 : "";
      sheet.getCell(r, 2).value = l?.malzemeAdi ?? "";
      sheet.getCell(r, 3).value = l?.miktar ?? "";
      sheet.getCell(r, 4).value = l?.stokDurumu ?? "";
      sheet.getCell(r, 5).value = rt?.malzemeAdi ?? "";
      sheet.getCell(r, 6).value = rt?.miktar ?? "";
      sheet.getCell(r, 7).value = rt?.stokDurumu ?? "";

      for (let c = 1; c <= 7; c++) {
        const cell = sheet.getCell(r, c);
        cell.border = THIN_BORDER;
        cell.font = { name: "Arial", size: 10 };
        if (c === 1 || c === 3 || c === 4 || c === 6 || c === 7) {
          cell.alignment = { horizontal: "center" };
        }
      }
    }
    row += rowCount;

    if (pageIndex === result.pages.length - 1) {
      row += 1;
      sheet.mergeCells(row, 1, row, 7);
      sheet.getCell(row, 1).value = "KULLANIM NOTU";
      sheet.getCell(row, 1).font = { bold: true, size: 9, name: "Arial" };
      row += 1;
      sheet.mergeCells(row, 1, row, 7);
      sheet.getCell(row, 1).value =
        "Miktar: sayı olarak girilir (ör. 10). Stok Durumu: Var / Az / Yok şeklinde yazılır.";
      sheet.getCell(row, 1).font = { size: 9, name: "Arial", italic: true };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
