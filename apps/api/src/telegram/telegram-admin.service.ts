import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PRODUCTS, TelegramService } from "./telegram.service";

// Admin commands in the bot's private chat. Only Telegram IDs listed in the
// ADMIN_TELEGRAM_IDS env var can use them (checked by the controller).

const DAY = 24 * 60 * 60 * 1000;
const COMMANDS = ["/help", "/admin", "/stats", "/user", "/givepro", "/takepro", "/gems", "/payments", "/refund"];

export const ADMIN_COMMAND_LIST = [
  { command: "help", description: "Список всех команд" },
  { command: "stats", description: "Статистика продаж и пользователей" },
  { command: "user", description: "Инфо о пользователе: /user <id>" },
  { command: "givepro", description: "Выдать Pro: /givepro <id> <дней>" },
  { command: "takepro", description: "Забрать Pro: /takepro <id>" },
  { command: "gems", description: "Выдать кристаллы: /gems <id> <кол-во>" },
  { command: "payments", description: "Последние платежи" },
  { command: "refund", description: "Вернуть звёзды: /refund <chargeId>" },
];

const HELP = [
  "🛠 Админ-команды WordUp",
  "",
  "/stats — продажи и пользователи",
  "/user <id> — статус пользователя и его платежи",
  "/givepro <id> <дней> — подарить Pro (по умолчанию 30 дней)",
  "/takepro <id> — забрать Pro",
  "/gems <id> <кол-во> — подарить кристаллы",
  "/payments [N] — последние платежи (с chargeId)",
  "/refund <chargeId> — вернуть звёзды и забрать покупку",
  "/help — этот список",
  "",
  "Скрытые (не видны в меню, работают у всех):",
  "/myid — показать свой Telegram ID",
  "/paysupport — помощь с оплатой",
  "/terms — условия Pro",
  "",
  "Как узнать ID пользователя: попроси его отправить боту /myid, или посмотри в /payments.",
].join("\n");

const fmtDate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("ru-RU") : "—");

function parseId(arg?: string): bigint {
  if (!arg || !/^\d{3,20}$/.test(arg)) throw new Error("Нужен числовой Telegram ID, например /user 123456789");
  return BigInt(arg);
}

@Injectable()
export class TelegramAdminService {
  constructor(private readonly prisma: PrismaService, private readonly tg: TelegramService) {}

  static handles(text: string): boolean {
    const cmd = text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
    return COMMANDS.includes(cmd);
  }

  // Returns a sendMessage reply for the webhook.
  async run(text: string, chatId: number): Promise<object> {
    const [raw, ...args] = text.trim().split(/\s+/);
    const cmd = raw.split("@")[0].toLowerCase();
    let reply: string;
    try {
      reply = await this.exec(cmd, args);
    } catch (e) {
      reply = "⚠️ " + (e as Error).message;
    }
    return { method: "sendMessage", chat_id: chatId, text: reply };
  }

  private async exec(cmd: string, args: string[]): Promise<string> {
    switch (cmd) {
      case "/help":
      case "/admin": return HELP;
      case "/stats": return this.stats();
      case "/user": return this.user(parseId(args[0]));
      case "/givepro": return this.givePro(parseId(args[0]), Number(args[1] || 30));
      case "/takepro": return this.takePro(parseId(args[0]));
      case "/gems": return this.gems(parseId(args[0]), Number(args[1]));
      case "/payments": return this.payments(Math.min(30, Math.max(1, Number(args[0]) || 10)));
      case "/refund": return this.refund(args[0]);
      default: return HELP;
    }
  }

  private async stats(): Promise<string> {
    const now = new Date();
    const week = new Date(Date.now() - 7 * DAY);
    const paid = { refundedAt: null };
    const [users, newUsers, activePro, all, lastWeek, byProduct] = await Promise.all([
      this.prisma.tgAccount.count(),
      this.prisma.tgAccount.count({ where: { createdAt: { gte: week } } }),
      this.prisma.tgAccount.count({ where: { premiumUntil: { gt: now } } }),
      this.prisma.starPayment.aggregate({ where: paid, _count: { _all: true }, _sum: { stars: true } }),
      this.prisma.starPayment.aggregate({ where: { ...paid, createdAt: { gte: week } }, _count: { _all: true }, _sum: { stars: true } }),
      this.prisma.starPayment.groupBy({ by: ["product"], where: paid, _count: { _all: true }, _sum: { stars: true } }),
    ]);
    const lines = [
      "📊 WordUp",
      "",
      `👥 Пользователей в Telegram: ${users} (+${newUsers} за 7 дней)`,
      `👑 Pro сейчас: ${activePro}`,
      "",
      `⭐ Всего: ${all._sum.stars ?? 0} звёзд, покупок: ${all._count._all}`,
      `⭐ За 7 дней: ${lastWeek._sum.stars ?? 0} звёзд, покупок: ${lastWeek._count._all}`,
    ];
    if (byProduct.length) {
      lines.push("", "По товарам:");
      for (const p of byProduct) lines.push(`• ${PRODUCTS[p.product]?.title ?? p.product}: ${p._count._all} шт · ${p._sum.stars ?? 0} ⭐`);
    }
    return lines.join("\n");
  }

  private async user(id: bigint): Promise<string> {
    const [acc, pays] = await Promise.all([
      this.prisma.tgAccount.findUnique({ where: { telegramId: id } }),
      this.prisma.starPayment.findMany({ where: { telegramId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);
    if (!acc && !pays.length) return `Пользователь ${id} ещё не открывал приложение в Telegram.`;
    const pro = acc?.premiumUntil && acc.premiumUntil.getTime() > Date.now();
    const lines = [
      `👤 ${id}${this.tg.isAdmin(Number(id)) ? " (админ)" : ""}`,
      `Pro: ${pro ? "до " + fmtDate(acc!.premiumUntil) : "нет"}`,
      `Подарок новичка: ${acc?.introUsed ? "использован" : "не использован"}`,
      `Кристаллы ждут в приложении: ${acc?.gemCredit ?? 0}`,
      `Впервые: ${fmtDate(acc?.createdAt)}`,
    ];
    if (pays.length) {
      lines.push("", "Платежи:");
      for (const p of pays) lines.push(`• ${fmtDate(p.createdAt)} ${p.product} ${p.stars}⭐${p.refundedAt ? " (возврат)" : ""}`);
    }
    return lines.join("\n");
  }

  private async givePro(id: bigint, days: number): Promise<string> {
    if (!Number.isFinite(days) || days < 1 || days > 3650) throw new Error("Дней должно быть от 1 до 3650");
    const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId: id } });
    const base = Math.max(Date.now(), acc?.premiumUntil?.getTime() ?? 0);
    const premiumUntil = new Date(base + days * DAY);
    await this.prisma.tgAccount.upsert({ where: { telegramId: id }, create: { telegramId: id, premiumUntil }, update: { premiumUntil } });
    await this.notify(id, `🎁 Тебе подарили WordUp Pro на ${days} дн.! Активен до ${fmtDate(premiumUntil)}.`);
    return `✅ ${id}: Pro до ${fmtDate(premiumUntil)}`;
  }

  private async takePro(id: bigint): Promise<string> {
    const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId: id } });
    if (!acc) return `Пользователь ${id} не найден.`;
    await this.prisma.tgAccount.update({ where: { telegramId: id }, data: { premiumUntil: new Date() } });
    return `✅ ${id}: Pro снят. (Подписку в Telegram это не отменяет — для возврата используй /refund.)`;
  }

  private async gems(id: bigint, n: number): Promise<string> {
    if (!Number.isInteger(n) || n < 1 || n > 100000) throw new Error("Укажи количество, например /gems 123456789 100");
    const acc = await this.prisma.tgAccount.upsert({
      where: { telegramId: id },
      create: { telegramId: id, gemCredit: n },
      update: { gemCredit: { increment: n } },
    });
    await this.notify(id, `💎 Тебе подарили ${n} кристаллов! Открой WordUp, чтобы забрать.`);
    return `✅ ${id}: +${n} 💎 (ждут в приложении: ${acc.gemCredit})`;
  }

  private async payments(n: number): Promise<string> {
    const pays = await this.prisma.starPayment.findMany({ orderBy: { createdAt: "desc" }, take: n });
    if (!pays.length) return "Платежей пока нет.";
    return ["💳 Последние платежи:", ""].concat(pays.map(p =>
      `${fmtDate(p.createdAt)} · ${p.product} · ${p.stars}⭐ · user ${p.telegramId}${p.refundedAt ? " · ВОЗВРАТ" : ""}\n   ${p.chargeId}`,
    )).join("\n");
  }

  private async refund(chargeId?: string): Promise<string> {
    if (!chargeId) throw new Error("Укажи chargeId из /payments: /refund <chargeId>");
    const p = await this.prisma.starPayment.findUnique({ where: { chargeId } });
    if (!p) return "Платёж не найден.";
    if (p.refundedAt) return "По этому платежу уже был возврат.";
    const product = PRODUCTS[p.product];
    if (product?.subscription) {
      // stop future renewals too
      await this.tg.call("editUserStarSubscription", {
        user_id: Number(p.telegramId), telegram_payment_charge_id: chargeId, is_canceled: true,
      }).catch(() => { /* already cancelled / not a subscription charge */ });
    }
    await this.tg.call("refundStarPayment", { user_id: Number(p.telegramId), telegram_payment_charge_id: chargeId });

    // take back what the payment gave
    const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId: p.telegramId } });
    const data: { premiumUntil?: Date; gemCredit?: number } = {};
    if (product?.days && acc?.premiumUntil) {
      data.premiumUntil = new Date(Math.max(Date.now(), acc.premiumUntil.getTime() - product.days * DAY));
    }
    let gemsNote = "";
    if (product?.gems && acc) {
      const left = acc.gemCredit - product.gems;
      data.gemCredit = Math.max(0, left);
      if (left < 0) gemsNote = " Часть кристаллов уже была зачислена в приложение — их не забрать.";
    }
    await this.prisma.$transaction([
      this.prisma.starPayment.update({ where: { chargeId }, data: { refundedAt: new Date() } }),
      ...(acc && Object.keys(data).length ? [this.prisma.tgAccount.update({ where: { telegramId: p.telegramId }, data })] : []),
    ]);
    await this.notify(p.telegramId, `↩️ Возврат ${p.stars} ⭐ за «${product?.title ?? p.product}» оформлен.`);
    return `✅ Вернул ${p.stars} ⭐ пользователю ${p.telegramId}.${gemsNote}`;
  }

  private notify(id: bigint, text: string) {
    return this.tg.call("sendMessage", { chat_id: Number(id), text }).catch(() => { /* user hasn't started the bot */ });
  }
}
