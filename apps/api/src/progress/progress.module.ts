import { Module } from "@nestjs/common";
import { ProgressService } from "./progress.service";
import { ProgressController } from "./progress.controller";
import { GamificationModule } from "../gamification/gamification.module";

@Module({
  imports: [GamificationModule],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}
