import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db = "down";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = "up";
    } catch {
      db = "down";
    }
    // which commit is running (Render sets RENDER_GIT_COMMIT) — used by tools/wait-deploy.sh
    const commit = (process.env.RENDER_GIT_COMMIT || "dev").slice(0, 7);
    return { status: "ok", db, commit, time: new Date().toISOString() };
  }
}
