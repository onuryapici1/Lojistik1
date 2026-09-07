import ExcelJS from "exceljs";
import type { FormSatiri, StokDurumu } from "./types";

export type ExcelSatiri = Omit<FormSatiri, "id">;

function normalle(metin: string): string {
  return metin.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function degerMetni(deger: ExcelJS.CellValue): string {
  if (deger === null || deger === undefined) return "";
  if (typeof deger !== "object") return String(deger).trim();
  if ("richText" in deger) return deger.richText.map((parca) => parca.text).join("").trim();
  if ("result" in deger) return degerMetni(deger.result);
  if ("text" in deger) return deger.text.trim();
  return "";
}

function stokNormalle(metin: string): StokDurumu {
  const stok = normalle(metin);
  return stok === "var" ? "Var" : stok === "az" ? "Az" : stok === "yok" ? "Yok" : "";
}

function formBilgisi(metin: string): boolean {
  return /^(malzeme siparis formu|sube\s*:|siparis tarihi\s*:|teslim tarihi|kullanim notu)/.test(normalle(metin));
}

function kirmiziMi(renk?: Partial<ExcelJS.Color> & { indexed?: number }): boolean {
  if (renk?.indexed === 10) return true;
  const rgb = renk?.argb?.slice(-6);
  if (!rgb || !/^[\da-f]{6}$/i.test(rgb)) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(rgb.slice(i, i + 2), 16));
  return r >= 128 && r > g * 1.5 && r > b * 1.5;
}

/** Sütunları başlıklardan bulur; her sayfa bölümünü önce sol, sonra sağ okur. */
export async function excelOku(veri: string): Promise<ExcelSatiri[]> {
  const kitap = new ExcelJS.Workbook();
  await kitap.xlsx.load(Buffer.from(veri, "base64") as unknown as Parameters<typeof kitap.xlsx.load>[0]);
  const sonuc: ExcelSatiri[] = [];

  kitap.eachSheet((sayfa) => {
    const bolumler: { satir: number; kolonlar: number[] }[] = [];
    sayfa.eachRow((satir) => {
      const kolonlar: number[] = [];
      satir.eachCell((hucre, kolon) => {
        if (hucre.master.address !== hucre.address) return;
        if (normalle(degerMetni(hucre.value)) === "malzeme adi"
          && normalle(degerMetni(satir.getCell(kolon + 1).value)) === "miktar"
          && normalle(degerMetni(satir.getCell(kolon + 2).value)) === "stok durumu") {
          kolonlar.push(kolon);
        }
      });
      if (kolonlar.length) bolumler.push({ satir: satir.number, kolonlar });
    });

    bolumler.forEach((bolum, index) => {
      const son = bolumler[index + 1]?.satir ?? sayfa.rowCount + 1;
      for (const kolon of bolum.kolonlar) {
        for (let no = bolum.satir + 1; no < son; no++) {
          const satir = sayfa.getRow(no);
          // Form üst bilgileri ve dipnot alanı veri tablosunu bitirir.
          let bilgi = false;
          satir.eachCell((h) => { if (formBilgisi(degerMetni(h.value))) bilgi = true; });
          if (bilgi) break;
          const adHucre = satir.getCell(kolon);
          // Birleşik hücrenin devamını ikinci kez malzeme olarak aktarma.
          if (adHucre.master.address !== adHucre.address) continue;
          const ad = degerMetni(adHucre.value);
          if (!ad) continue;
          const miktarHucre = satir.getCell(kolon + 1);
          const stokHucre = satir.getCell(kolon + 2);
          const yatayBaslik = miktarHucre.master.address === adHucre.address
            && stokHucre.master.address === adHucre.address;
          const miktar = yatayBaslik ? "" : degerMetni(miktarHucre.value);
          const stok = yatayBaslik ? "" : degerMetni(stokHucre.value);
          const grupAdi = /(?:^| )grubu$/.test(normalle(ad))
            || /^(soslar|icecekler|temizlik|paketli urunler)$/.test(normalle(ad));
          const renkliBaslik = adHucre.font?.bold && kirmiziMi(adHucre.font.color);
          const baslik = !miktar && !stok && (yatayBaslik || grupAdi || renkliBaslik);
          sonuc.push({
            tur: baslik ? "baslik" : "urun",
            malzemeAdi: ad.slice(0, 300),
            miktar: baslik ? "" : miktar.slice(0, 60),
            stokDurumu: baslik ? "" : stokNormalle(stok),
          });
        }
      }
    });
  });

  return sonuc;
}
