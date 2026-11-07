import {
  HttpException, HttpStatus, Injectable, Logger, NotFoundException, ServiceUnavailableException,
} from "@nestjs/common";
import { DIALOGUES, dialogueList } from "./dialogues";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramService, type TgUser } from "../telegram/telegram.service";

export const TUTOR_DAILY_LIMIT = 30;
const MODEL = "claude-haiku-5-5";
const today = () => new Date().toISOString().slice(0, 10);

export interface ChatTurn { role: "user" | "assistant"; text: string }
export interface Profile {
  level: string;
  knownCount?: number;
  recentWords?: string[];
  learningWords?: string[];
  weakWords?: string[];
  topics?: string[];
  nextTopic?: string | null;
}

const list = (a?: string[]) => (a && a.length ? a.join(", ") : "none yet");

// What the app knows about the learner, as lines for the prompt.
function profileLines(p?: Profile): string {
  if (!p) return "The learner's level is unknown; start simple and adapt.";
  const lines = [
    `The learner's current level on the app's path is ${p.level} (A0 = absolute beginner, then CEFR). Keep your English at that level or just slightly above.`,
  ];
  if (p.level === "A0" || p.level === "A1") {
    lines.push("They are a beginner: use very short sentences and the most common words, and explain mostly in their native language.");
  }
  if (p.knownCount !== undefined) {
    lines.push(
      `Words learned so far: ${p.knownCount}.`,
      `Recently learned words: ${list(p.recentWords)}.`,
      `Words still being learned: ${list(p.learningWords)}.`,
      `Words they often get wrong: ${list(p.weakWords)}.`,
      `Grammar topics passed (latest last): ${list(p.topics)}.`,
    );
    if (p.nextTopic) lines.push(`Their next topic on the path: ${p.nextTopic}.`);
    lines.push("Use these words and grammar naturally when it fits, so the learner revisits them. Do not use grammar far beyond what they have passed unless they ask.");
  }
  return lines.join("\n");
}

function systemPrompt(lang: string, profile?: Profile): string {
  const native = lang === "en" ? "English" : "Russian";
  return [
    "You are WordUp's friendly English tutor inside a vocabulary app for learners whose native language is " + native + ".",
    profileLines(profile),
    "How to help:",
    "- Chat in English so the learner practises. If they write in " + native + ", answer and gently invite them to try in English.",
    "- When the learner's English has mistakes, first show the corrected sentence, then explain the main mistake briefly in " + native + ". Do not list every tiny slip.",
    "- When asked about a word, give its meaning in " + native + ", one or two short example sentences, and a common collocation.",
    "- Grammar questions: explain in " + native + " with a simple rule and two examples.",
    "- Keep replies short (up to about 120 words), warm and encouraging. End with a short question or a tiny task at the learner's level to keep the conversation going; prefer ones that use their recent or weak words.",
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

  // Pro + daily allowance check shared by the free chat and dialogue lessons.
  private async begin(user: TgUser): Promise<{ client: Anthropic; telegramId: bigint; left: number }> {
    if (!this.client) throw new ServiceUnavailableException("Tutor is not configured");
    if (!(await this.isPro(user))) throw new HttpException("Pro only", HttpStatus.PAYMENT_REQUIRED);
    const telegramId = BigInt(user.id);
    const left = await this.takeOne(telegramId);
    if (left === null) throw new HttpException("Daily limit reached", HttpStatus.TOO_MANY_REQUESTS);
    return { client: this.client, telegramId, left };
  }

  private failed(err: unknown): never {
    if (err instanceof Anthropic.RateLimitError) {
      throw new HttpException("Tutor is busy", HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (err instanceof Anthropic.APIError) this.log.error(`API ${err.status}: ${err.message}`);
    else this.log.error(String(err));
    throw new ServiceUnavailableException("Tutor is unavailable");
  }

  // The last 16 turns are enough context; the first one must be from the learner.
  private history(turns: ChatTurn[]): Anthropic.MessageParam[] {
    const recent = turns.slice(-16);
    while (recent.length && recent[0].role !== "user") recent.shift();
    return recent.map(t => ({ role: t.role, content: t.text }));
  }

  dialogues() { return dialogueList(); }

  // One step of a dialogue lesson: the character answers, mistakes are fixed,
  // finished tasks are ticked off. `done` = task numbers already finished.
  async dialogue(user: TgUser, id: string, turns: ChatTurn[], done: number[], lang: string, profile?: Profile) {
    const d = DIALOGUES.find(x => x.id === id);
    if (!d) throw new NotFoundException();
    const { client, telegramId, left } = await this.begin(user);
    const native = lang === "en" ? "English" : "Russian";
    const tasks = d.tasks.map((t, i) => `${i}. The learner ${t.goal}.${done.includes(i) ? " (already done)" : ""}`).join("\n");
    const system = [
      `You are running a short role-play lesson in an English learning app. The learner's native language is ${native}.`,
      profileLines(profile ?? { level: d.level }),
      `You play ${d.role}. Stay in character and speak simple, natural English at the learner's level.`,
      `You opened the conversation with: "${d.opener}"`,
      "The learner has to complete these tasks (in any order):",
      tasks,
      "For every learner message, return:",
      "- correction: if the learner's last message has real mistakes (grammar, word choice, spelling that changes meaning), the full corrected version of it; otherwise null. Ignore missing capital letters and final punctuation.",
      `- explanation: if there is a correction, one or two short sentences in ${native} explaining the main mistake; otherwise null.`,
      "- reply: your next line in character, in English, 1-3 short sentences. Help the learner move to the next unfinished task naturally (for example by asking a question). Never mention the tasks or the lesson.",
      "- completed: numbers of tasks the learner has done in this conversation so far, including earlier ones. A task counts even if the English had small mistakes, as long as the meaning is clear.",
      "- finished: true when all tasks are done; then the reply should close the conversation politely.",
      "If the learner writes in their native language, reply in character in English and gently ask them to try in English; set correction to an English version of what they meant.",
    ].join("\n");

    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        output_config: {
          effort: "low",
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                correction: { type: ["string", "null"] },
                explanation: { type: ["string", "null"] },
                reply: { type: "string" },
                completed: { type: "array", items: { type: "integer" } },
                finished: { type: "boolean" },
              },
              required: ["correction", "explanation", "reply", "completed", "finished"],
              additionalProperties: false,
            },
          },
        },
        system,
        messages: this.history(turns),
      });
      if (res.stop_reason === "refusal") {
        await this.giveBack(telegramId);
        return { refused: true, left: left + 1 };
      }
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("");
      const out = JSON.parse(text) as { correction: string | null; explanation: string | null; reply: string; completed: number[]; finished: boolean };
      const completed = [...new Set([...done, ...out.completed])]
        .filter(n => Number.isInteger(n) && n >= 0 && n < d.tasks.length)
        .sort((a, b) => a - b);
      return {
        refused: false,
        left,
        correction: out.correction?.trim() || null,
        explanation: out.explanation?.trim() || null,
        reply: out.reply.trim(),
        completed,
        finished: completed.length === d.tasks.length,
      };
    } catch (err) {
      await this.giveBack(telegramId);
      this.failed(err);
    }
  }

  async reply(user: TgUser, turns: ChatTurn[], lang: string, profile?: Profile) {
    const { client, telegramId, left } = await this.begin(user);
    const messages = this.history(turns);

    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        system: systemPrompt(lang, profile),
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
      this.failed(err);
    }
  }
}
