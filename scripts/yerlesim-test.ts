import { sayfala, ozet, sayfaSayisi, hedefeSigdir, blokSatirSayisi, MIN_OLCEK, MAX_OLCEK } from "../src/lib/yerlesim";
import { bosForm, bosSatir, type FormVerisi } from "../src/lib/types";

function formYap(n: number, mod: FormVerisi["sayfaModu"] = "auto", hedef = 2): FormVerisi {
  const f = bosForm();
  f.sayfaModu = mod;
  f.hedefSayfa = hedef;
  f.satirlar = Array.from({ length: n }, (_, i) => ({ ...bosSatir(), malzemeAdi: `Malzeme ${i + 1}` }));
  return f;
}

let hata = 0;
function kontrol(ad: string, kosul: boolean, detay = "") {
  if (!kosul) { console.log(`  BASARISIZ: ${ad} ${detay}`); hata++; }
  else console.log(`  ok: ${ad} ${detay}`);
}

console.log("--- kapasite ---");
for (const olcek of [100, 80, 60, 50]) {
  console.log(`  olcek ${olcek}: ilk sayfa blok=${blokSatirSayisi(olcek, true, true)} -> sayfa kapasitesi=${blokSatirSayisi(olcek, true, true) * 2}`);
}

console.log("--- sayfa sayisi tutarliligi ---");
for (const n of [1, 10, 44, 76, 88, 150, 400]) {
  const f = formYap(n, "auto");
  const y = sayfala(f);
  const hesap = sayfaSayisi(n, y.olcek, true);
  kontrol(`n=${n} sayfala vs sayfaSayisi`, y.sayfalar.length === hesap, `(${y.sayfalar.length} / ${hesap})`);
  const toplam = y.sayfalar.reduce((a, s) => a + s.bloklar[0].length + s.bloklar[1].length, 0);
  kontrol(`n=${n} hic satir kaybolmadi`, toplam === n, `(${toplam})`);
}

console.log("--- sira numaralari kesintisiz ---");
{
  const y = sayfala(formYap(150, "auto"));
  const siralar: number[] = [];
  for (const s of y.sayfalar) for (const b of s.bloklar) for (const h of b) siralar.push(h.sira);
  kontrol("1..150 artan", siralar.length === 150 && siralar.every((v, i) => v === i + 1));
}

console.log("--- tek sayfaya sigdir ---");
for (const n of [20, 44, 80, 120, 160]) {
  const f = formYap(n, "tekSayfa");
  const y = sayfala(f);
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
}

console.log("--- ozet ---");
{
  const f = formYap(50, "tekSayfa");
  f.satirlar[10].malzemeAdi = "";
  const o = ozet(f);
  console.log("  ", JSON.stringify(o));
  kontrol("dolu satir sayisi", o.doluSatir === 49, `${o.doluSatir}`);
}

console.log(hata === 0 ? "\nTUM TESTLER GECTI" : `\n${hata} TEST BASARISIZ`);
process.exit(hata === 0 ? 0 : 1);
