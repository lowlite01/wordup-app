import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { XP_PER_KNOWN_WORD, dayDiff, levelProgress } from "./leveling";

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  // Called when a word is newly marked "known": bump XP, keep the daily
  // streak alive, then re-check achievements.
  async onWordKnown(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return this.getSummary(userId);

    const now = new Date();
    let streak = user.streakCount;
    if (!user.lastStudyDate) {
      streak = 1;
    } else {
      const diff = dayDiff(user.lastStudyDate, now);
      if (diff === 0) {
        // already studied today — streak unchanged
      } else if (diff === 1) {
        streak += 1;
      } else {
        streak = 1; // missed a day, streak resets
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: user.xp + XP_PER_KNOWN_WORD,
        streakCount: streak,
        lastStudyDate: now,
      },
    });

    await this.checkAchievements(userId);
    return this.getSummary(userId);
  }

  // Recompute XP from the actual number of known words (after a bulk sync).
  async recomputeXp(userId: string) {
    const knownCount = await this.prisma.wordProgress.count({
      where: { userId, state: "known" },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { xp: knownCount * XP_PER_KNOWN_WORD },
    });
    await this.checkAchievements(userId);
    return this.getSummary(userId);
  }

  async getSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { achievements: { include: { achievement: true } } },
    });
    if (!user) return null;
    const knownCount = await this.prisma.wordProgress.count({
      where: { userId, state: "known" },
    });
    return {
      ...levelProgress(user.xp),
      streak: user.streakCount,
      knownCount,
      achievements: user.achievements.map(ua => ({
        ...ua.achievement,
        earnedAt: ua.earnedAt,
      })),
    };
  }

  // Award any achievement whose threshold the user has now crossed.
  // Convention: achievement ids "words-N" check known-word count,
  // "streak-N" check the current streak.
  async checkAchievements(userId: string) {
    const [user, knownCount, all, earned] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.wordProgress.count({ where: { userId, state: "known" } }),
      this.prisma.achievement.findMany(),
      this.prisma.userAchievement.findMany({ where: { userId } }),
    ]);
    if (!user) return;
    const earnedIds = new Set(earned.map(e => e.achievementId));

    const toAward = all.filter(a => {
      if (earnedIds.has(a.id)) return false;
      if (a.id.startsWith("words-")) return knownCount >= a.threshold;
      if (a.id.startsWith("streak-")) return user.streakCount >= a.threshold;
      return false;
    });

    if (toAward.length) {
      await this.prisma.userAchievement.createMany({
        data: toAward.map(a => ({ userId, achievementId: a.id })),
        skipDuplicates: true,
      });
    }
  }

  async leaderboard(limit = 20) {
    const users = await this.prisma.user.findMany({
      orderBy: { xp: "desc" },
      take: limit,
      select: { id: true, name: true, avatarUrl: true, xp: true, streakCount: true },
    });
    return users.map((u, i) => ({
      rank: i + 1,
      ...levelProgress(u.xp),
      name: u.name,
      avatarUrl: u.avatarUrl,
      streak: u.streakCount,
    }));
  }
}
