import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { StatsService } from "./stats.service";
import { RecordQuizDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("stats")
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.stats.getForUser(user.userId);
  }

  @Post()
  record(@CurrentUser() user: AuthUser, @Body() dto: RecordQuizDto) {
    return this.stats.record(user.userId, dto);
  }

  @Post("sync")
  sync(@CurrentUser() user: AuthUser, @Body() body: { stats: Record<string, { right: number; wrong: number; confused: Record<string, number> }> }) {
    return this.stats.sync(user.userId, body.stats ?? {});
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser) {
    return this.stats.clear(user.userId);
  }
}
