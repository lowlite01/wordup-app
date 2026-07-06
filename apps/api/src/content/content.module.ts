import { Module } from "@nestjs/common";
import { ContentService } from "./content.service";
import { AdminContentController, ContentController } from "./content.controller";

@Module({
  providers: [ContentService],
  controllers: [ContentController, AdminContentController],
})
export class ContentModule {}
