import {
  HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramService, type TgUser } from "../telegram/telegram.service";

export const TUTOR_DAILY_LIMIT = 30;
const MODEL = "claude-haiku-5-5";
const today = () => new Date().toISOString().slice(0, 10);

export interface ChatTurn { role: "user" | "assistant"; text: string }

function systemPrompt(lang: string, level?: string): string {
  const native = lang === "en" ? "English" : "Russian";
  return [
    "You are WordUp's friendly English tutor inside a vocabulary app for learners whose native language is " + native + ".",
    level ? `The learner's level is about ${level} (CEFR). Keep your English at that level or slightly above.` : "The learner's level is unknown; start simple and adapt.",
    "How to help:",
    "- Chat in English so the learner practises. If they write in " + native + ", answer and gently invite them to try in English.",
    "- When the learner's English has mistakes, first show the corrected sentence, then explain the main mistake briefly in " + native + ". Do not list every tiny slip.",
    "- When asked about a word, give its meaning in " + native + ", one or two short example sentences, and a common collocation.",
    "- Grammar questions: explain in " + native + " with a simple rule and two examples.",
    "- Keep replies short (up to about 120 words), warm and encouraging. End with a short question or a tiny task to keep the conversation going.",
    "- Plain text only: no Markdown headings or tables. Simple dashes for lists and *asterisks* for a highlighted word are fine.",
    "- Stay on learning English. Politely steer other topics back to practice.",
  ].join("\n");
}

@Injectable()
export class TutorService {
  private readonly log = new Logger("Tutor");
  private readonly client: Anthropic | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tg: TelegramService,
    config: ConfigService,
  ) {
    const key = config.get<string>("ANTHROPIC_API_KEY");
    this.client = key ? new Anthropic({ apiKey: key, maxRetries: 2, timeout: 60_000 }) : null;
  }

  private async isPro(user: TgUser): Promise<boolean> {
    if (this.tg.isAdmin(user.id)) return true;
    const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId: BigInt(user.id) } });
    return Boolean(acc?.premiumUntil && acc.premiumUntil.getTime() > Date.now());
  }

  async quota(user: TgUser) {
    const pro = await this.isPro(user);
    const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId: BigInt(user.id) } });
    const used = acc?.tutorDay === today() ? acc.tutorUsed : 0;
    return { pro, limit: TUTOR_DAILY_LIMIT, left: Math.max(0, TUTOR_DAILY_LIMIT - used), enabled: Boolean(this.client) };
  }

  // Takes one message from today's allowance. Two conditional updates keep it
  // correct even when two requests arrive at the same moment.
  private async takeOne(telegramId: bigint): Promise<number | null> {
    const day = today();
    await this.prisma.tgAccount.upsert({ where: { telegramId }, create: { telegramId }, update: {} });
    const fresh = await this.prisma.tgAccount.updateMany({
      where: { telegramId, OR: [{ tutorDay: null }, { tutorDay: { not: day } }] },
      data: { tutorDay: day, tutorUsed: 1 },
    });
    if (fresh.count) return TUTOR_DAILY_LIMIT - 1;
    const more = await this.prisma.tgAccount.updateMany({
      where: { telegramId, tutorDay: day, tutorUsed: { lt: TUTOR_DAILY_LIMIT } },
      data: { tutorUsed: { increment: 1 } },
    });
    if (!more.count) return null;
    const acc = await this.prisma.tgAccount.findUnique({ where: { telegramId } });
    return Math.max(0, TUTOR_DAILY_LIMIT - (acc?.tutorUsed ?? TUTOR_DAILY_LIMIT));
  }

  private async giveBack(telegramId: bigint) {
    await this.prisma.tgAccount.updateMany({
      where: { telegramId, tutorDay: today(), tutorUsed: { gt: 0 } },
      data: { tutorUsed: { decrement: 1 } },
    });
  }

  async reply(user: TgUser, turns: ChatTurn[], lang: string, level?: string) {
    if (!this.client) throw new ServiceUnavailableException("Tutor is not configured");
    if (!(await this.isPro(user))) throw new HttpException("Pro only", HttpStatus.PAYMENT_REQUIRED);
    const telegramId = BigInt(user.id);
    const left = await this.takeOne(telegramId);
    if (left === null) throw new HttpException("Daily limit reached", HttpStatus.TOO_MANY_REQUESTS);

    // The last 16 turns are enough context; the first one must be from the learner.
    const recent = turns.slice(-16);
    while (recent.length && recent[0].role !== "user") recent.shift();
    const messages: Anthropic.MessageParam[] = recent.map(t => ({ role: t.role, content: t.text }));

    try {
      const res = await this.client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        system: systemPrompt(lang, level),
        messages,
      });
      if (res.stop_reason === "refusal") {
        await this.giveBack(telegramId);
        return { reply: "", refused: true, left: left + 1 };
      }
      const reply = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("")
        .trim();
      return { reply, refused: false, left };
    } catch (err) {
      await this.giveBack(telegramId);
      if (err instanceof Anthropic.RateLimitError) {
        throw new HttpException("Tutor is busy", HttpStatus.SERVICE_UNAVAILABLE);
      }
      if (err instanceof Anthropic.APIError) {
        this.log.error(`API ${err.status}: ${err.message}`);
      } else {
        this.log.error(String(err));
      }
      throw new ServiceUnavailableException("Tutor is unavailable");
    }
  }
}
