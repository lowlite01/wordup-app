import { isTelegram, telegramInitData, openInvoice } from "./telegram";

// WordUp Pro status. Purchases happen in Telegram (Stars); the server keeps
// who paid. We cache the last known status so Pro works offline too.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const KEY = "wordup-pro-v1";

export type ProductId = "pro_week" | "pro_month" | "gems_150" | "gems_500";
// Display prices (the server has the real ones and sends them in /tg/me).
export const DEFAULT_PRICES: Record<ProductId, number> = { pro_week: 29, pro_month: 149, gems_150: 25, gems_500: 60 };
export const BOT_LINK = "https://t.me/WordUpDailyBot";
export const FREE_IELTS = 2; // IELTS topics open without Pro

export interface ProStatus {
  premiumUntil: string | null;
  introUsed: boolean;
  prices: Record<ProductId, number>;
}

export function loadPro(): ProStatus {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) as string);
    if (s && "premiumUntil" in s) return { ...s, prices: { ...DEFAULT_PRICES, ...s.prices } };
  } catch { /* ignore */ }
  return { premiumUntil: null, introUsed: false, prices: DEFAULT_PRICES };
}
function savePro(s: ProStatus) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export const isProActive = (s: ProStatus) => Boolean(s.premiumUntil && Date.parse(s.premiumUntil) > Date.now());

async function tgFetch<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(API_URL + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Authorization: `tma ${telegramInitData}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

/** Ask the server for the current status (+ crystals waiting). Telegram only. */
export async function fetchPro(): Promise<{ status: ProStatus; gemCredit: number } | null> {
  if (!isTelegram) return null;
  const r = await tgFetch<{ premiumUntil: string | null; introUsed: boolean; gemCredit: number; prices: Record<ProductId, number> }>("/tg/me");
  const status = { premiumUntil: r.premiumUntil, introUsed: r.introUsed, prices: { ...DEFAULT_PRICES, ...r.prices } };
  savePro(status);
  return { status, gemCredit: r.gemCredit };
}

/** Collect bought crystals (the server zeroes its counter). */
export async function claimGems(): Promise<number> {
  const r = await tgFetch<{ gems: number }>("/tg/claim", {});
  return r.gems;
}

/** Open Telegram's payment sheet. Resolves with Telegram's final status. */
export async function buy(product: ProductId): Promise<string> {
  const { link } = await tgFetch<{ link: string }>("/tg/invoice", { product });
  return openInvoice(link);
}
