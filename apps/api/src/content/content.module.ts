import { Module } from "@nestjs/common";
import { TelegramModule } from "../telegram/telegram.module";
import { ContentService } from "./content.service";
import { AdminContentController, ContentController } from "./content.controller";

@Module({
  imports: [TelegramModule],
  providers: [ContentService],
  controllers: [ContentController, AdminContentController],
})
export class ContentModule {}
