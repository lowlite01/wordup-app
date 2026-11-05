import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TelegramService } from "./telegram.service";

// Admin-only endpoints accept either:
//  - "Authorization: tma <initData>" from a Telegram account in ADMIN_TELEGRAM_IDS, or
//  - "Authorization: Bearer <JWT>" of a Google account with the ADMIN role.
@Injectable()
export class AdminAccessGuard implements CanActivate {
  private readonly jwt = new JwtAuthGuard();

  constructor(private readonly tg: TelegramService, private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth: string = req.headers.authorization || "";
    if (auth.startsWith("tma ")) {
      const user = this.tg.verifyInitData(auth.slice(4));
      if (!this.tg.isAdmin(user.id)) throw new ForbiddenException();
      return true;
    }
    await this.jwt.canActivate(ctx); // throws 401 without a valid token
    const user = await this.prisma.user.findUnique({ where: { id: req.user?.userId } });
    if (user?.role !== "ADMIN") throw new ForbiddenException();
    return true;
  }
}
