import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from "@nestjs/common";
import { ContentService } from "./content.service";
import { CreateGroupDto, CreateWordDto, UpdateGroupDto, UpdateWordDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminGuard } from "../auth/admin.guard";

// Public content used by the app to render groups and words.
@Controller("content")
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  get() {
    return this.content.getContent();
  }
}

// Everything here is admin-only.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/content")
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  @Get("groups")
  listGroups() {
    return this.content.listGroups();
  }

  @Post("groups")
  createGroup(@Body() dto: CreateGroupDto) {
    return this.content.createGroup(dto);
  }

  @Patch("groups/:key")
  updateGroup(@Param("key") key: string, @Body() dto: UpdateGroupDto) {
    return this.content.updateGroup(key, dto);
  }

  @Delete("groups/:key")
  deleteGroup(@Param("key") key: string) {
    return this.content.deleteGroup(key);
  }

  @Get("groups/:key/words")
  listWords(@Param("key") key: string) {
    return this.content.listWords(key);
  }

  @Post("words")
  createWord(@Body() dto: CreateWordDto) {
    return this.content.createWord(dto);
  }

  @Patch("words/:id")
  updateWord(@Param("id") id: string, @Body() dto: UpdateWordDto) {
    return this.content.updateWord(id, dto);
  }

  @Delete("words/:id")
  deleteWord(@Param("id") id: string) {
    return this.content.deleteWord(id);
  }
}
