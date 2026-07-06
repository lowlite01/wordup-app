import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Used by Google auth (phase 3): match on googleId, else create.
  async findOrCreateByGoogle(data: {
    googleId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: data.googleId }, { email: data.email }] },
    });
    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: data.googleId,
          name: data.name ?? existing.name,
          avatarUrl: data.avatarUrl ?? existing.avatarUrl,
        },
      });
    }
    return this.prisma.user.create({ data });
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { achievements: { include: { achievement: true } } },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  // Convenience for local development before auth exists.
  async ensureDemoUser() {
    const email = "demo@wordup.local";
    return this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: "Demo user" },
    });
  }
}
