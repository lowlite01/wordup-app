import { Module } from "@nestjs/common";
import { TelegramController } from "./telegram.controller";
import { TelegramService } from "./telegram.service";
import { TelegramAdminService } from "./telegram-admin.service";
import { AdminAccessGuard } from "./admin-access.guard";

@Module({
  providers: [TelegramService, TelegramAdminService, AdminAccessGuard],
  controllers: [TelegramController],
  exports: [TelegramService, AdminAccessGuard],
})
export class TelegramModule {}
