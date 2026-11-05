import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Post } from "@nestjs/common";
import { IsIn } from "class-validator";
import { PRODUCTS, TelegramService } from "./telegram.service";
import { TelegramAdminService } from "./telegram-admin.service";

class InvoiceDto {
  @IsIn(Object.keys(PRODUCTS))
  product!: string;
}

// The Mini App sends its signed launch data as "Authorization: tma <initData>".
function initDataOf(auth?: string): string {
  return auth?.startsWith("tma ") ? auth.slice(4) : "";
}

@Controller("tg")
export class TelegramController {
  constructor(private readonly tg: TelegramService, private readonly admin: TelegramAdminService) {}

  // Pro status + crystals waiting to be collected.
  @Get("me")
  me(@Headers("authorization") auth?: string) {
    const user = this.tg.verifyInitData(initDataOf(auth));
    return this.tg.status(user.id);
  }

  @Post("claim")
  async claim(@Headers("authorization") auth?: string) {
    const user = this.tg.verifyInitData(initDataOf(auth));
    return { gems: await this.tg.claimGems(user.id) };
  }

  @Post("invoice")
  async invoice(@Body() body: InvoiceDto, @Headers("authorization") auth?: string) {
    const user = this.tg.verifyInitData(initDataOf(auth));
    return { link: await this.tg.createInvoice(user.id, body.product) };
  }

  // Called by Telegram only (checked with the secret header).
  @Post("webhook")
  @HttpCode(200)
  async webhook(@Body() update: any, @Headers("x-telegram-bot-api-secret-token") secret?: string) {
    if (!this.tg.enabled || secret !== this.tg.webhookSecret) throw new ForbiddenException();
    // admin commands: only in a private chat with an admin
    const msg = update?.message;
    const text: string | undefined = msg?.text;
    if (text && msg.chat?.id === msg.from?.id && this.tg.isAdmin(msg.from?.id) && TelegramAdminService.handles(text)) {
      return this.admin.run(text, msg.chat.id);
    }
    return (await this.tg.handleUpdate(update)) ?? { ok: true };
  }
}
