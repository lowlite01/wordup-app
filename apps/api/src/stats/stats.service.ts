import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RecordQuizDto } from "./dto";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string) {
    const rows = await this.prisma.quizStat.findMany({ where: { userId } });
    const out: Record<string, { right: number; wrong: number; confused: Record<string, number> }> = {};
    for (const r of rows) {
      out[r.word] = {
        right: r.right,
        wrong: r.wrong,
        confused: (r.confused as Record<string, number>) ?? {},
      };
    }
    return out;
  }

  async record(userId: string, dto: RecordQuizDto) {
    const { word, picked } = dto;
    const existing = await this.prisma.quizStat.findUnique({
      where: { userId_word: { userId, word } },
    });
    const correct = picked === word;
    const confused: Record<string, number> =
      (existing?.confused as Record<string, number>) ?? {};
    if (!correct) confused[picked] = (confused[picked] ?? 0) + 1;

    await this.prisma.quizStat.upsert({
      where: { userId_word: { userId, word } },
      update: {
        right: (existing?.right ?? 0) + (correct ? 1 : 0),
        wrong: (existing?.wrong ?? 0) + (correct ? 0 : 1),
        confused,
      },
      create: {
        userId,
        word,
        right: correct ? 1 : 0,
        wrong: correct ? 0 : 1,
        confused,
      },
    });
    return { ok: true };
  }

  async clear(userId: string) {
    await this.prisma.quizStat.deleteMany({ where: { userId } });
    return { ok: true };
  }

  // Bulk import from localStorage on first login; replaces the user's rows.
  async sync(userId: string, stats: Record<string, { right: number; wrong: number; confused: Record<string, number> }>) {
    const rows = Object.entries(stats).map(([word, s]) => ({
      userId,
      word,
      right: s.right ?? 0,
      wrong: s.wrong ?? 0,
      confused: s.confused ?? {},
    }));
    await this.prisma.$transaction([
      this.prisma.quizStat.deleteMany({ where: { userId } }),
      ...(rows.length
        ? [this.prisma.quizStat.createMany({ data: rows, skipDuplicates: true })]
        : []),
    ]);
    return this.getForUser(userId);
  }
}
