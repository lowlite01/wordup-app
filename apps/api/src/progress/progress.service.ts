import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GamificationService } from "../gamification/gamification.service";
import { ProgressEntryDto, SetWordStateDto } from "./dto";

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  // Returns progress grouped like the front-end's { known: {...}, learning: {...} }.
  async getForUser(userId: string) {
    const rows = await this.prisma.wordProgress.findMany({ where: { userId } });
    const known: Record<string, string[]> = {};
    const learning: Record<string, string[]> = {};
    for (const r of rows) {
      const bucket = r.state === "known" ? known : learning;
      (bucket[r.groupKey] ??= []).push(r.word);
    }
    return { known, learning };
  }

  async setWordState(userId: string, dto: SetWordStateDto) {
    const { groupKey, word, state } = dto;
    if (state === "none") {
      await this.prisma.wordProgress.deleteMany({ where: { userId, groupKey, word } });
    } else {
      await this.prisma.wordProgress.upsert({
        where: { userId_groupKey_word: { userId, groupKey, word } },
        update: { state },
        create: { userId, groupKey, word, state },
      });
    }
    // Earning "known" words is what drives XP and the daily streak.
    const award = state === "known"
      ? await this.gamification.onWordKnown(userId)
      : await this.gamification.getSummary(userId);
    return { ok: true, gamification: award };
  }

  // Merges localStorage progress into the account on first login. Only
  // upserts the given entries — never deletes existing server rows — so
  // logging in from a fresh browser can't wipe progress from another device.
  async sync(userId: string, entries: ProgressEntryDto[]) {
    await Promise.all(entries.map(e =>
      this.prisma.wordProgress.upsert({
        where: { userId_groupKey_word: { userId, groupKey: e.groupKey, word: e.word } },
        update: { state: e.state },
        create: { userId, groupKey: e.groupKey, word: e.word, state: e.state },
      }),
    ));
    await this.gamification.recomputeXp(userId);
    return this.getForUser(userId);
  }

  // Explicit, deliberate wipe — used by the "reset all progress" button.
  async resetAll(userId: string) {
    await this.prisma.wordProgress.deleteMany({ where: { userId } });
    await this.gamification.recomputeXp(userId);
    return this.getForUser(userId);
  }
}
