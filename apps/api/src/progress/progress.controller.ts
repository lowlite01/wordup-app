import { Body, Controller, Delete, Get, Post, Put, UseGuards } from "@nestjs/common";
import { ProgressService } from "./progress.service";
import { SetWordStateDto, SyncProgressDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("progress")
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.progress.getForUser(user.userId);
  }

  @Put()
  set(@CurrentUser() user: AuthUser, @Body() dto: SetWordStateDto) {
    return this.progress.setWordState(user.userId, dto);
  }

  @Post("sync")
  sync(@CurrentUser() user: AuthUser, @Body() dto: SyncProgressDto) {
    return this.progress.sync(user.userId, dto.entries);
  }

  @Delete()
  resetAll(@CurrentUser() user: AuthUser) {
    return this.progress.resetAll(user.userId);
  }
}
