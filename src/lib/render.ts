import { chromium } from "playwright-core";
import { AUTH_COOKIE } from "@/lib/auth";

const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";

async function withPage<T>(
  origin: string,
  id: string,
  authToken: string,
  fn: (page: import("playwright-core").Page) => Promise<T>
): Promise<T> {
  const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH, headless: true });
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
