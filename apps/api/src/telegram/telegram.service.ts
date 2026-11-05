import { Injectable, Logger, OnModuleInit, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

// WordUp Pro, paid with Telegram Stars (currency "XTR") inside the Mini App.
// Flow: the app asks us for an invoice link -> Telegram shows its payment
// sheet -> Telegram sends our webhook a pre_checkout_query (we approve it)
// and then a successful_payment message (we grant Pro / crystals).

export interface Product {
  stars: number;
  title: string;       // shown on Telegram's payment sheet (max 32 chars)
  description: string; // max 255 chars
  days?: number;       // Pro days granted
  gems?: number;       // crystals granted
  intro?: boolean;     // one-time newcomer offer
  subscription?: boolean; // renews every 30 days
}

export const PRODUCTS: Record<string, Product> = {
  pro_week: {
    stars: 29, days: 7, intro: true,
    title: "WordUp Pro · 7 дней",
    description: "Подарок новичка: неделя Pro — безлимитные сердечки, все темы и уровни, IELTS, заморозка серии и двойные кристаллы.",
  },
  pro_month: {
    stars: 149, days: 30, gems: 100, subscription: true,
    title: "WordUp Pro · месяц",
    description: "Безлимитные сердечки, все темы и уровни, IELTS, заморозка серии, двойные кристаллы и +100 кристаллов каждый месяц. Продлевается автоматически, отменить можно в Telegram.",
  },
  gems_150: { stars: 25, gems: 150, title: "150 кристаллов", description: "150 кристаллов для WordUp." },
  gems_500: { stars: 60, gems: 500, title: "500 кристаллов", description: "500 кристаллов для WordUp — выгоднее всего." },
};

const DAY = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_PERIOD = 2592000; // 30 days — the only period Telegram allows

export interface TgUser { id: number; first_name?: string }

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly log = new Logger("Telegram");
  private readonly token: string;
  readonly webhookSecret: string;
  private readonly webAppUrl: string;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.token = config.get<string>("TELEGRAM_BOT_TOKEN") || "";
    // Telegram echoes this in a header on every webhook call, so nobody else can fake updates.
    this.webhookSecret = this.token ? createHash("sha256").update("webhook:" + this.token).digest("hex").slice(0, 48) : "";
    this.webAppUrl = config.get<string>("WEB_APP_URL") || "https://wordup-app-api.vercel.app";
    this.publicUrl = config.get<string>("PUBLIC_API_URL") || config.get<string>("RENDER_EXTERNAL_URL") || "";
    this.support = config.get<string>("SUPPORT_CONTACT") || "";
  }
  private readonly publicUrl: string;
  private readonly support: string; // e.g. "@yourname" — who answers payment questions

  get enabled() { return Boolean(this.token); }

  // Point the bot's webhook at this server on every start (cheap and idempotent).
  async onModuleInit() {
    if (!this.token || !this.publicUrl) return;
    try {
      await this.call("setWebhook", {
        url: `${this.publicUrl.replace(/\/$/, "")}/api/tg/webhook`,
        secret_token: this.webhookSecret,
        allowed_updates: ["message", "pre_checkout_query"],
      });
      this.log.log("Webhook set");
    } catch (e) {
      this.log.error(`setWebhook failed: ${(e as Error).message}`);
    }
  }

  async call<T = unknown>(method: string, body: object): Promise<T> {
    if (!this.token) throw new ServiceUnavailableException("Telegram is not configured");
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; result: T; description?: string };
    if (!data.ok) throw new Error(`${method}: ${data.description}`);
    return data.result;
  }

  // ---- Who is calling? Verify the Mini App's signed initData. ----
  // https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
  verifyInitData(initData: string): TgUser {
    if (!this.token) throw new ServiceUnavailableException("Telegram is not configured");
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) throw new UnauthorizedException();
    params.delete("hash");
    const check = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secret = createHmac("sha256", "WebAppData").update(this.token).digest();
    const calc = createHmac("sha256", secret).update(check).digest();
    const given = Buffer.from(hash, "hex");
    if (given.length !== calc.length || !timingSafeEqual(given, calc)) throw new UnauthorizedException();
    const authDate = Number(params.get("auth_date")) * 1000;
    if (!authDate || Date.now() - authDate > 7 * DAY) throw new UnauthorizedException("initData expired");
    const user = JSON.parse(params.get("user") || "null") as TgUser | null;
    if (!user?.id) throw new UnauthorizedException();
    return user;
  }

  // ---- Status for the app ----
  async status(telegramId: number) {
    const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId: BigInt(telegramId) } });
    const until = acc?.premiumUntil ?? null;
    return {
      pro: Boolean(until && until.getTime() > Date.now()),
      premiumUntil: until ? until.toISOString() : null,
      introUsed: acc?.introUsed ?? false,
      gemCredit: acc?.gemCredit ?? 0,
      prices: Object.fromEntries(Object.entries(PRODUCTS).map(([k, p]) => [k, p.stars])),
    };
  }

  // Hand bought crystals over to the app (it keeps the crystal balance locally).
  async claimGems(telegramId: number): Promise<number> {
    const id = BigInt(telegramId);
    return this.prisma.$transaction(async tx => {
      const acc = await tx.tgAccount.findUnique({ where: { telegramId: id } });
      if (!acc || acc.gemCredit <= 0) return 0;
      await tx.tgAccount.update({ where: { telegramId: id }, data: { gemCredit: 0 } });
      return acc.gemCredit;
    });
  }

  async createInvoice(telegramId: number, productId: string): Promise<string> {
    const p = PRODUCTS[productId];
    if (p.intro) {
      const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId: BigInt(telegramId) } });
      if (acc?.introUsed) throw new UnauthorizedException("Offer already used");
    }
    return this.call<string>("createInvoiceLink", {
      title: p.title,
      description: p.description,
      payload: `${productId}:${telegramId}`,
      currency: "XTR",
      prices: [{ label: p.title, amount: p.stars }],
      ...(p.subscription ? { subscription_period: SUBSCRIPTION_PERIOD } : {}),
    });
  }

  // ---- Webhook ----
  // Returns an optional Bot API method to run as the webhook reply (fastest
  // way to answer a pre_checkout_query, which must be answered within 10 s).
  async handleUpdate(update: any): Promise<object | undefined> {
    const pcq = update?.pre_checkout_query;
    if (pcq) {
      const error = await this.checkPreCheckout(pcq);
      return error
        ? { method: "answerPreCheckoutQuery", pre_checkout_query_id: pcq.id, ok: false, error_message: error }
        : { method: "answerPreCheckoutQuery", pre_checkout_query_id: pcq.id, ok: true };
    }
    const msg = update?.message;
    if (!msg) return;
    if (msg.successful_payment) {
      await this.grant(msg.from.id, msg.successful_payment);
      return;
    }
    const text: string = msg.text || "";
    if (text.startsWith("/start")) return this.welcome(msg.chat.id);
    if (text.startsWith("/paysupport")) {
      return { method: "sendMessage", chat_id: msg.chat.id, text: this.support
        ? `💬 Проблема с оплатой? Напиши ${this.support} и приложи скрин — разберёмся и, если нужно, вернём звёзды.`
        : "💬 Проблема с оплатой? Напиши разработчику WordUp и приложи скрин — разберёмся и, если нужно, вернём звёзды." };
    }
    if (text.startsWith("/terms")) {
      return { method: "sendMessage", chat_id: msg.chat.id, text: "WordUp Pro — цифровая подписка внутри приложения. Оплата в Telegram Stars. Подписка продлевается каждые 30 дней, отменить можно в Настройках Telegram → Мои звёзды. Возврат — через /paysupport." };
    }
  }

  private welcome(chatId: number) {
    return {
      method: "sendMessage",
      chat_id: chatId,
      text: "👋 Привет! Это WordUp — английские слова за 5 минут в день.\n\n🔥 Держи серию каждый день\n🗺️ Проходи дорожку от A1 до C1\n🎓 Готовься к IELTS\n\nЖми кнопку ниже, чтобы начать 👇",
      reply_markup: { inline_keyboard: [[{ text: "🚀 Открыть WordUp", web_app: { url: this.webAppUrl } }]] },
    };
  }

  private parsePayload(payload: string): { productId: string; userId: number } | null {
    const [productId, uid] = String(payload || "").split(":");
    if (!PRODUCTS[productId] || !Number(uid)) return null;
    return { productId, userId: Number(uid) };
  }

  private async checkPreCheckout(q: any): Promise<string | null> {
    const parsed = this.parsePayload(q.invoice_payload);
    if (!parsed || parsed.userId !== q.from?.id) return "Неверный счёт";
    const p = PRODUCTS[parsed.productId];
    if (q.currency !== "XTR" || q.total_amount !== p.stars) return "Цена изменилась, открой оплату заново";
    if (p.intro) {
      const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId: BigInt(parsed.userId) } });
      if (acc?.introUsed) return "Подарок новичка уже использован";
    }
    return null;
  }

  private async grant(fromId: number, sp: any) {
    const parsed = this.parsePayload(sp.invoice_payload);
    if (!parsed) { this.log.error(`Unknown payload ${sp.invoice_payload}`); return; }
    const p = PRODUCTS[parsed.productId];
    const id = BigInt(fromId);
    const chargeId: string = sp.telegram_payment_charge_id;

    const until = await this.prisma.$transaction(async tx => {
      if (await tx.starPayment.findUnique({ where: { chargeId } })) return "duplicate" as const; // already processed
      await tx.starPayment.create({ data: { chargeId, telegramId: id, product: parsed.productId, stars: sp.total_amount } });
      const acc = await tx.tgAccount.findUnique({ where: { telegramId: id } });
      const now = Date.now();
      let premiumUntil = acc?.premiumUntil ?? null;
      if (p.days) {
        const base = Math.max(now, premiumUntil?.getTime() ?? 0);
        let next = base + p.days * DAY;
        // Subscriptions: Telegram tells us exactly when the paid period ends.
        if (p.subscription && sp.subscription_expiration_date) {
          next = Math.max(next - p.days * DAY, sp.subscription_expiration_date * 1000);
        }
        premiumUntil = new Date(next);
      }
      const data = {
        premiumUntil,
        introUsed: (acc?.introUsed ?? false) || Boolean(p.intro),
        gemCredit: (acc?.gemCredit ?? 0) + (p.gems ?? 0),
      };
      await tx.tgAccount.upsert({ where: { telegramId: id }, create: { telegramId: id, ...data }, update: data });
      return premiumUntil;
    });

    if (until === "duplicate") return;
    const text = p.days
      ? `👑 Спасибо! WordUp Pro активен до ${until?.toLocaleDateString("ru-RU") ?? "—"}.${p.gems ? ` +${p.gems} 💎 уже ждут в приложении.` : ""}`
      : `💎 Спасибо! +${p.gems} кристаллов уже ждут в приложении.`;
    await this.call("sendMessage", { chat_id: fromId, text }).catch(() => { /* chat may be closed */ });
  }
}
