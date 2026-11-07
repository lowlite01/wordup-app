import { Module } from "@nestjs/common";
import { TelegramModule } from "../telegram/telegram.module";
import { TutorController } from "./tutor.controller";
import { TutorService } from "./tutor.service";

@Module({
  imports: [TelegramModule],
  providers: [TutorService],
  controllers: [TutorController],
})
export class TutorModule {}
