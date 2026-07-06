import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Runs after JwtAuthGuard: allows the request only if the authenticated
// user has the ADMIN role. Use as @UseGuards(JwtAuthGuard, AdminGuard).
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.userId;
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.role === "ADMIN";
  }
}
