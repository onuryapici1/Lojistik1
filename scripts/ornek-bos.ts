import { writeFileSync } from "node:fs";
import { cizimUret } from "../src/lib/cizim";
import { pdfUret } from "../src/lib/cizim-pdf";
import { xlsxUret } from "../src/lib/xlsx";
import { bosForm, yeniId, type FormSatiri, type FormVerisi } from "../src/lib/types";

function baslik(ad: string): FormSatiri {
  return { id: yeniId(), tur: "baslik", malzemeAdi: ad, miktar: "", stokDurumu: "" };
}
function bos(): FormSatiri {
  return { id: yeniId(), tur: "urun", malzemeAdi: "", miktar: "", stokDurumu: "" };
}

// Bos, elle doldurulacak form: sadece grup basliklari duruyor.
const form: FormVerisi = {
  ...bosForm(),
  sube: "", siparisTarihi: "", teslimTarihi: "",
  sayfaModu: "tekSayfa",
  satirlar: [
    baslik("ET GRUBU"), bos(), bos(), bos(), bos(),
    baslik("TAVUK GRUBU"), bos(), bos(), bos(),
    baslik("PEYNİR GRUBU"), bos(), bos(), bos(), bos(),
  ],
};

async function calistir() {
  writeFileSync("scripts/cikti/ornek-bos-form.pdf", await pdfUret(cizimUret(form)));
  writeFileSync("scripts/cikti/ornek-bos-form.xlsx", await xlsxUret(form));
  console.log("bos form uretildi");
}
calistir();
