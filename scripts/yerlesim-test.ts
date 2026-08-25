import {
  sayfala,
  ozet,
  sayfaSayisi,
  hedefeSigdir,
  blokSatirSayisi,
  metniKaydir,
  satirBirimi,
  yaziBoyutu,
  MALZEME_METIN_GENISLIK,
  EN_FAZLA_METIN_SATIRI,
  MIN_OLCEK,
  MAX_OLCEK,
} from "../src/lib/yerlesim";
import { emGenisligi } from "../src/lib/yaziGenislik";
import { bosForm, bosSatir, type FormSatiri, type FormVerisi } from "../src/lib/types";

function formYap(n: number, mod: FormVerisi["sayfaModu"] = "auto", hedef = 2): FormVerisi {
  const f = bosForm();
  f.sayfaModu = mod;
  f.hedefSayfa = hedef;
  f.satirlar = Array.from({ length: n }, (_, i) => ({ ...bosSatir(), malzemeAdi: `Malzeme ${i + 1}` }));
  return f;
}

/** Verilen adlarla form kurar. */
function adlardanForm(adlar: string[], mod: FormVerisi["sayfaModu"] = "auto"): FormVerisi {
  const f = bosForm();
  f.sayfaModu = mod;
  f.satirlar = adlar.map((ad) => ({ ...bosSatir(), malzemeAdi: ad }));
  return f;
}

/** Tüm hücreleri sayfa/blok sırasıyla düz listeye açar. */
function tumHucreler(y: ReturnType<typeof sayfala>) {
  return y.sayfalar.flatMap((s) => [...s.bloklar[0].hucreler, ...s.bloklar[1].hucreler]);
}

let hata = 0;
function kontrol(ad: string, kosul: boolean, detay = "") {
  if (!kosul) {
    console.log(`  BASARISIZ: ${ad} ${detay}`);
    hata++;
  } else console.log(`  ok: ${ad} ${detay}`);
}

console.log("--- kapasite ---");
for (const olcek of [100, 80, 60, 50]) {
  const b = blokSatirSayisi(olcek, true, true);
  console.log(`  olcek ${olcek}: ilk sayfa blok=${b} birim -> sayfa kapasitesi=${b * 2} birim`);
}

console.log("--- metin kaydirma ---");
{
  const boyut = yaziBoyutu(100);
  const kisa = metniKaydir("Panko", MALZEME_METIN_GENISLIK, boyut);
  kontrol("kisa ad tek satir", kisa.length === 1, JSON.stringify(kisa));

  const uzun = metniKaydir("PAKETLİ KONSERVE ÜRÜNLER", MALZEME_METIN_GENISLIK, boyut);
  kontrol("uzun ad iki satira boluniyor", uzun.length === 2, JSON.stringify(uzun));

  // Her satir gercekten sutuna sigiyor mu (son satir haric; o kirpilabilir)
  const emMm = boyut * 1.42;
  const sigiyor = uzun.slice(0, -1).every((sat) => emGenisligi(sat, false) * emMm <= MALZEME_METIN_GENISLIK);
  kontrol("kaydirilan satirlar sutuna sigiyor", sigiyor);

  // Kelime kaybi olmamali
  kontrol("kelime kaybi yok", uzun.join(" ") === "PAKETLİ KONSERVE ÜRÜNLER", uzun.join(" "));

  const cokUzun = metniKaydir(
    "Bu cok uzun bir malzeme adi ve kesinlikle iki satira bile sigmayacak kadar uzundur",
    MALZEME_METIN_GENISLIK,
    boyut,
  );
  kontrol("en fazla iki satir", cokUzun.length <= EN_FAZLA_METIN_SATIRI, `${cokUzun.length}`);

  kontrol("bos ad tek bos satir", metniKaydir("", MALZEME_METIN_GENISLIK, boyut).length === 1);
}

console.log("--- satir birimi ---");
{
  const kisaSatir: FormSatiri = { ...bosSatir(), malzemeAdi: "Panko" };
  const uzunSatir: FormSatiri = { ...bosSatir(), malzemeAdi: "PAKETLİ KONSERVE ÜRÜNLER" };
  kontrol("kisa ad 1 birim", satirBirimi(kisaSatir, 100) === 1);
  kontrol("uzun ad 2 birim", satirBirimi(uzunSatir, 100) === 2);
  // Olcek kuculdukce ayni ad tek satira sigabilir
  kontrol(
    "kucuk olcekte uzun ad tek satira sigar",
    satirBirimi(uzunSatir, MIN_OLCEK) === 1,
    `birim=${satirBirimi(uzunSatir, MIN_OLCEK)}`,
  );
}

console.log("--- sayfa sayisi tutarliligi ---");
for (const n of [1, 10, 44, 76, 88, 150, 400]) {
  const f = formYap(n, "auto");
  const y = sayfala(f);
  const hesap = sayfaSayisi(f.satirlar, y.olcek, true);
  kontrol(`n=${n} sayfala vs sayfaSayisi`, y.sayfalar.length === hesap, `(${y.sayfalar.length} / ${hesap})`);
  kontrol(`n=${n} hic satir kaybolmadi`, tumHucreler(y).length === n, `(${tumHucreler(y).length})`);
}

console.log("--- uzun adlarla sayfa sayisi tutarliligi ---");
{
  // Yarisi uzun, yarisi kisa: birim maliyeti karisik
  const adlar = Array.from({ length: 120 }, (_, i) =>
    i % 2 === 0 ? "PAKETLİ KONSERVE ÜRÜNLER" : "Panko",
  );
  for (const mod of ["auto", "tekSayfa", "bol"] as const) {
    const f = adlardanForm(adlar, mod);
    f.hedefSayfa = 2;
    const y = sayfala(f);
    const hesap = sayfaSayisi(f.satirlar, y.olcek, true);
    kontrol(`karisik ${mod}: sayfala vs sayfaSayisi`, y.sayfalar.length === hesap, `(${y.sayfalar.length} / ${hesap})`);
    kontrol(`karisik ${mod}: satir kaybi yok`, tumHucreler(y).length === adlar.length, `${tumHucreler(y).length}/${adlar.length}`);
  }
}

console.log("--- blok kapasitesi asilmiyor ---");
{
  const adlar = Array.from({ length: 200 }, (_, i) => (i % 3 === 0 ? "PAKETLİ KONSERVE ÜRÜNLER" : "Sosis"));
  const y = sayfala(adlardanForm(adlar, "auto"));
  let asan = 0;
  for (const s of y.sayfalar) {
    for (const b of s.bloklar) {
      // Tek hucrenin kapasiteyi asmasi kabul (bos bloga zorla yerlestirme),
      // ama birden fazla hucre varken asilmamali.
      if (b.hucreler.length > 1 && b.kullanilan > b.kapasite) asan++;
    }
  }
  kontrol("hicbir blok kapasiteyi asmiyor", asan === 0, `asan=${asan}`);
}

console.log("--- ofsetler tutarli ---");
{
  const adlar = Array.from({ length: 60 }, (_, i) => (i % 4 === 0 ? "PAKETLİ KONSERVE ÜRÜNLER" : "Panko"));
  const y = sayfala(adlardanForm(adlar, "auto"));
  let bozuk = 0;
  for (const s of y.sayfalar) {
    for (const b of s.bloklar) {
      let beklenen = 0;
      for (const h of b.hucreler) {
        if (h.ofset !== beklenen) bozuk++;
        beklenen += h.birim;
      }
      if (b.kullanilan !== beklenen) bozuk++;
    }
  }
  kontrol("ofset ve kullanilan birim tutarli", bozuk === 0, `bozuk=${bozuk}`);
}

console.log("--- sira numaralari kesintisiz ---");
{
  const y = sayfala(formYap(150, "auto"));
  const siralar = tumHucreler(y).map((h) => h.sira);
  kontrol("1..150 artan", siralar.length === 150 && siralar.every((v, i) => v === i + 1));
}

console.log("--- tek sayfaya sigdir ---");
for (const n of [20, 44, 80, 120, 160]) {
  const y = sayfala(formYap(n, "tekSayfa"));
  kontrol(`n=${n} tek sayfa`, y.sayfalar.length === 1, `olcek=${y.olcek}`);
}

console.log("--- N sayfaya bol ---");
for (const [n, hedef] of [[100, 2], [200, 2], [300, 3], [40, 2]] as const) {
  const y = sayfala(formYap(n, "bol", hedef));
  kontrol(`n=${n} hedef=${hedef}`, y.sayfalar.length <= hedef, `gercek=${y.sayfalar.length} olcek=${y.olcek}`);
}

console.log("--- sinir durumlar ---");
{
  const y = sayfala(formYap(0, "auto"));
  kontrol("bos form 1 sayfa", y.sayfalar.length === 1, `${y.sayfalar.length}`);
  const cok = sayfala(formYap(5000, "tekSayfa"));
  kontrol("5000 satir tek sayfaya sigmaz, min olcege duser", cok.olcek === MIN_OLCEK, `olcek=${cok.olcek} sayfa=${cok.sayfalar.length}`);
  kontrol("olcek sinirlar icinde", cok.olcek >= MIN_OLCEK && cok.olcek <= MAX_OLCEK);

  // Hepsi iki satirlik uzun adlar
  const uzunlar = sayfala(adlardanForm(Array.from({ length: 300 }, () => "PAKETLİ KONSERVE ÜRÜNLER"), "auto"));
  kontrol("300 uzun ad kaybolmadi", tumHucreler(uzunlar).length === 300, `${tumHucreler(uzunlar).length}`);
}

console.log("--- ozet ---");
{
  const f = formYap(50, "tekSayfa");
  f.satirlar[10].malzemeAdi = "";
  const o = ozet(f);
  console.log("  ", JSON.stringify(o));
  kontrol("dolu satir sayisi", o.doluSatir === 49, `${o.doluSatir}`);
  kontrol("hedefeSigdir calisiyor", hedefeSigdir(f.satirlar, 1, true) >= MIN_OLCEK);
}

console.log(hata === 0 ? "\nTUM TESTLER GECTI" : `\n${hata} TEST BASARISIZ`);
process.exit(hata === 0 ? 0 : 1);
