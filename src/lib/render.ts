import { chromium } from "playwright-core";
import { AUTH_COOKIE } from "@/lib/auth";

const LOCAL_EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

async function launchBrowser() {
  if (IS_SERVERLESS) {
    // Vercel/AWS Lambda gibi sunucusuz ortamlarda önceden kurulu bir Chromium
    // bulunmaz; @sparticuz/chromium isteğe bağlı bir bağımlılık olarak bunu sağlar.
    const { default: sparticuzChromium } = await import("@sparticuz/chromium");
    return chromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless: true,
    });
  }
  return chromium.launch({ executablePath: LOCAL_EXECUTABLE_PATH, headless: true });
}

async function withPage<T>(
  origin: string,
  id: string,
  authToken: string,
  fn: (page: import("playwright-core").Page) => Promise<T>
): Promise<T> {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext();
    const url = new URL(`/siparis/${id}/yazdir`, origin);
    await context.addCookies([
      {
        name: AUTH_COOKIE,
        value: authToken,
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    await page.goto(url.toString(), { waitUntil: "networkidle" });
    return await fn(page);
  } finally {
    await browser.close();
  }
}

export async function renderOrderPdf(origin: string, id: string, authToken: string): Promise<Buffer> {
  return withPage(origin, id, authToken, async (page) => {
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    return Buffer.from(pdf);
  });
}

export async function renderOrderPng(origin: string, id: string, authToken: string): Promise<Buffer> {
  return withPage(origin, id, authToken, async (page) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    const png = await page.screenshot({ fullPage: true, type: "png" });
    return Buffer.from(png);
  });
}
