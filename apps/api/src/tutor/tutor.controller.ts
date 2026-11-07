import { Body, Controller, Get, Headers, HttpCode, Post } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMaxSize, ArrayMinSize, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested,
} from "class-validator";
import { TelegramService } from "../telegram/telegram.service";
import { TutorService } from "./tutor.service";

class TurnDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString() @MinLength(1) @MaxLength(2000)
  text!: string;
}

class ChatDto {
  @ValidateNested({ each: true }) @Type(() => TurnDto)
  @ArrayMinSize(1) @ArrayMaxSize(40)
  turns!: TurnDto[];

  @IsOptional() @IsIn(["ru", "en"])
  lang?: string;

  @IsOptional() @IsIn(["A0", "A1", "A2", "B1", "B2", "C1", "C2"])
  level?: string;
}

const initDataOf = (auth?: string) => (auth?.startsWith("tma ") ? auth.slice(4) : "");

// Tutor chat for Pro learners in the Telegram Mini App.
@Controller("tg/tutor")
export class TutorController {
  constructor(private readonly tg: TelegramService, private readonly tutor: TutorService) {}

  @Get()
  quota(@Headers("authorization") auth?: string) {
    return this.tutor.quota(this.tg.verifyInitData(initDataOf(auth)));
  }

  @Post()
  @HttpCode(200)
  chat(@Body() body: ChatDto, @Headers("authorization") auth?: string) {
    const user = this.tg.verifyInitData(initDataOf(auth));
    return this.tutor.reply(user, body.turns, body.lang ?? "ru", body.level);
  }
}
