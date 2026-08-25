import { writeFileSync } from "node:fs";
import { xlsxUret } from "../src/lib/xlsx";
import { dosyaAdi } from "../src/lib/indirme";
import { bosForm, bosSatir, type FormVerisi } from "../src/lib/types";

function formYap(n: number, mod: FormVerisi["sayfaModu"] = "tekSayfa"): FormVerisi {
  const f = bosForm();
  f.sube = "Kadıköy Şubesi";
  f.siparisTarihi = "2026-08-25";
  f.teslimTarihi = "2026-08-27";
  f.sayfaModu = mod;
  f.satirlar = Array.from({ length: n }, (_, i) => ({
    ...bosSatir(),
    malzemeAdi: `Ürün ${i + 1} — çğışöü`,
    miktar: String(i + 1),
    stokDurumu: (["Var", "Az", "Yok", ""] as const)[i % 4],
  }));
  return f;
}

async function calistir() {
  let hata = 0;
  for (const [n, mod] of [[12, "tekSayfa"], [200, "bol"]] as const) {
    const form = formYap(n, mod);
    const buf = await xlsxUret(form);
    const ad = `scripts/cikti/${dosyaAdi(form, "xlsx")}`.replace(".xlsx", `-${n}.xlsx`);
    writeFileSync(ad, buf);
    const zipMi = buf[0] === 0x50 && buf[1] === 0x4b;
    console.log(`  ${zipMi ? "ok" : "BASARISIZ"}: n=${n} ${mod} -> ${(buf.length/1024).toFixed(0)} KB  ${ad}`);
    if (!zipMi) hata++;
  }
  console.log("  dosya adi ornegi:", dosyaAdi(formYap(1), "pdf"));
  process.exit(hata === 0 ? 0 : 1);
}
calistir().catch((e) => { console.error("PATLADI:", e); process.exit(1); });
