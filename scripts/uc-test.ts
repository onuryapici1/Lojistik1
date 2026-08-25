import { writeFileSync } from "node:fs";

const SIR = "yerel-test-imza-anahtari-sadece-gelistirme-icin";
const TABAN = "http://localhost:3000";

function b64url(b: ArrayBuffer) {
  return Buffer.from(b).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function jeton() {
  const govde = String(Date.now() + 3600_000);
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SIR), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  const imza = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(govde));
  return `${govde}.${b64url(imza)}`;
}

const form = {
  sube: "Kadıköy Şubesi",
  siparisTarihi: "2026-08-25",
  teslimTarihi: "2026-08-27",
  sayfaModu: "bol",
  hedefSayfa: 2,
  olcek: 100,
  satirlar: Array.from({length: 180}, (_, i) => ({
    id: `s${i}`, malzemeAdi: `Ürün ${i+1} çğışöü`, miktar: String(i%20+1),
    stokDurumu: (["Var","Az","Yok",""] as const)[i%4],
  })),
};

let hata = 0;
function kontrol(ad: string, kosul: boolean, detay = "") {
  console.log(`  ${kosul ? "ok" : "BASARISIZ"}: ${ad} ${detay}`);
  if (!kosul) hata++;
}

async function calistir() {
  const cerez = `ozlem_oturum=${await jeton()}`;

  // 1) Oturumsuz istek reddedilmeli
  const yetkisiz = await fetch(`${TABAN}/api/cikti/pdf`, {
    method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(form),
  });
  kontrol("oturumsuz istek 401", yetkisiz.status === 401, `(${yetkisiz.status})`);

  // 2) PDF
  const pdf = await fetch(`${TABAN}/api/cikti/pdf`, {
    method: "POST", headers: {"Content-Type":"application/json", Cookie: cerez}, body: JSON.stringify(form),
  });
  const pdfBayt = Buffer.from(await pdf.arrayBuffer());
  kontrol("PDF 200", pdf.status === 200, `(${pdf.status})`);
  kontrol("PDF imzasi", pdfBayt.subarray(0,5).toString() === "%PDF-", `${(pdfBayt.length/1024).toFixed(0)} KB`);
  kontrol("PDF content-type", (pdf.headers.get("content-type")||"").includes("application/pdf"));
  console.log("    disposition:", pdf.headers.get("content-disposition"));
  writeFileSync("scripts/cikti/uc-test.pdf", pdfBayt);

  // 3) XLSX
  const xl = await fetch(`${TABAN}/api/cikti/xlsx`, {
    method: "POST", headers: {"Content-Type":"application/json", Cookie: cerez}, body: JSON.stringify(form),
  });
  const xlBayt = Buffer.from(await xl.arrayBuffer());
  kontrol("XLSX 200", xl.status === 200, `(${xl.status})`);
  kontrol("XLSX zip imzasi", xlBayt[0] === 0x50 && xlBayt[1] === 0x4b, `${(xlBayt.length/1024).toFixed(0)} KB`);
  writeFileSync("scripts/cikti/uc-test.xlsx", xlBayt);

  // 4) Bozuk govde
  const bozuk = await fetch(`${TABAN}/api/cikti/pdf`, {
    method: "POST", headers: {"Content-Type":"application/json", Cookie: cerez}, body: "{bozuk",
  });
  kontrol("bozuk govde 400", bozuk.status === 400, `(${bozuk.status})`);

  // 5) Gemini anahtari yokken net hata
  const ai = await fetch(`${TABAN}/api/yapayzeka`, {
    method: "POST", headers: {"Content-Type":"application/json", Cookie: cerez},
    body: JSON.stringify({ metin: "su 10 koli, kola 5 kasa" }),
  });
  const aiVeri = await ai.json().catch(() => ({}));
  kontrol("GEMINI_API_KEY yokken 500 + net mesaj", ai.status === 500 && String(aiVeri.hata||"").includes("GEMINI_API_KEY"), `${ai.status} "${aiVeri.hata}"`);

  console.log(hata === 0 ? "\nUC TESTLERI GECTI" : `\n${hata} BASARISIZ`);
  process.exit(hata === 0 ? 0 : 1);
}
calistir().catch(e => { console.error("PATLADI:", e); process.exit(1); });
