import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY tanımlı değil. Sunucu ortam değişkenlerine ekleyin." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Metin boş olamaz" }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Aşağıda serbest formatta yazılmış, ürün grupları ve/veya ürün isimleri geçen bir metin var. " +
                "Bu metni bir malzeme sipariş formuna eklenecek satırlara dönüştür. " +
                "Her satır bir malzemeyi temsil eder. Ürün grubu başlıkları (ör. 'İçecekler:', 'Temizlik Malzemeleri') " +
                "kendi başına bir satır DEĞİLDİR, sadece altındaki ürünleri gruplamak için kullanılır ve grup adı " +
                "malzeme adının başına eklenmez. Miktar metinde belirtilmişse sayı olarak al (belirtilmemişse boş bırak). " +
                "Stok durumu metinde belirtilmişse 'Var', 'Az' veya 'Yok' değerlerinden birine dönüştür (belirtilmemişse boş bırak). " +
                "Malzeme adlarını düzgün Türkçe büyük/küçük harf kuralına göre yaz (her kelimenin ilk harfi büyük).\n\n" +
                "METİN:\n" +
                text,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  malzemeAdi: { type: Type.STRING },
                  miktar: { type: Type.STRING },
                  stokDurumu: { type: Type.STRING },
                },
                required: ["malzemeAdi"],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const raw = response.text;
    if (!raw) {
      return NextResponse.json({ error: "Gemini boş yanıt döndürdü" }, { status: 502 });
    }

    const parsed = JSON.parse(raw) as {
      items: { malzemeAdi: string; miktar?: string; stokDurumu?: string }[];
    };

    const items = (parsed.items || [])
      .map((item) => ({
        malzemeAdi: (item.malzemeAdi || "").trim(),
        miktar: (item.miktar || "").trim(),
        stokDurumu: (item.stokDurumu || "").trim(),
      }))
      .filter((item) => item.malzemeAdi.length > 0);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Gemini API hatası:", err);
    return NextResponse.json({ error: "Gemini API çağrısı başarısız oldu" }, { status: 502 });
  }
}
