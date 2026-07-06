import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGroupDto, CreateWordDto, UpdateGroupDto, UpdateWordDto } from "./dto";

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // Public: rebuilds the exact { wordGroups, topicLevel2 } shape the front-end
  // expects, so nothing downstream of the data layer has to change.
  async getContent() {
    const groups = await this.prisma.wordGroup.findMany({
      orderBy: { order: "asc" },
      include: { words: { orderBy: { order: "asc" } } },
    });
    const wordGroups: Record<string, unknown[]> = {};
    const topicLevel2: Record<string, unknown[]> = {};
    for (const g of groups) {
      const words = g.words.map(w => ({ word: w.word, pos: w.pos, def: w.def, example: w.example }));
      if (g.key.endsWith("@2")) topicLevel2[g.key.slice(0, -2)] = words;
      else wordGroups[g.key] = words;
    }
    return { wordGroups, topicLevel2 };
  }

  // ---- Admin: groups ----
  listGroups() {
    return this.prisma.wordGroup.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { words: true } } },
    });
  }

  createGroup(dto: CreateGroupDto) {
    return this.prisma.wordGroup.create({
      data: { key: dto.key, category: dto.category, order: dto.order ?? 0 },
    });
  }

  async updateGroup(key: string, dto: UpdateGroupDto) {
    await this.ensureGroup(key);
    return this.prisma.wordGroup.update({ where: { key }, data: dto });
  }

  async deleteGroup(key: string) {
    await this.ensureGroup(key);
    await this.prisma.wordGroup.delete({ where: { key } });
    return { ok: true };
  }

  // ---- Admin: words ----
  async listWords(groupKey: string) {
    await this.ensureGroup(groupKey);
    return this.prisma.wordEntry.findMany({
      where: { groupKey },
      orderBy: { order: "asc" },
    });
  }

  async createWord(dto: CreateWordDto) {
    await this.ensureGroup(dto.groupKey);
    return this.prisma.wordEntry.create({
      data: {
        groupKey: dto.groupKey,
        word: dto.word,
        pos: dto.pos,
        def: dto.def,
        example: dto.example,
        order: dto.order ?? 0,
      },
    });
  }

  async updateWord(id: string, dto: UpdateWordDto) {
    const existing = await this.prisma.wordEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Word not found");
    return this.prisma.wordEntry.update({ where: { id }, data: dto });
  }

  async deleteWord(id: string) {
    const existing = await this.prisma.wordEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Word not found");
    await this.prisma.wordEntry.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureGroup(key: string) {
    const g = await this.prisma.wordGroup.findUnique({ where: { key } });
    if (!g) throw new NotFoundException(`Group "${key}" not found`);
  }
}
