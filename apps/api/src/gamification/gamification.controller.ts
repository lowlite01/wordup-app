import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { GamificationService } from "./gamification.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

@Controller()
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @UseGuards(JwtAuthGuard)
  @Get("gamification/me")
  summary(@CurrentUser() user: AuthUser) {
    return this.gamification.getSummary(user.userId);
  }

  // Leaderboard is public — anyone can see the ranking.
  @Get("leaderboard")
  leaderboard(@Query("limit") limit?: string) {
    return this.gamification.leaderboard(limit ? parseInt(limit, 10) : 20);
  }
}
