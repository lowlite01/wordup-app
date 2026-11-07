import { Body, Controller, Get, Headers, HttpCode, Post } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested,
} from "class-validator";
import { TelegramService } from "../telegram/telegram.service";
import { TutorService } from "./tutor.service";

class TurnDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString() @MinLength(1) @MaxLength(2000)
  text!: string;
}

const LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];

class ProfileDto {
  @IsIn(LEVELS)
  level!: string;

  @IsInt() @Min(0)
  knownCount!: number;

  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(60, { each: true })
  recentWords!: string[];

  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(60, { each: true })
  learningWords!: string[];

  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(60, { each: true })
  weakWords!: string[];

  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(80, { each: true })
  topics!: string[];

  @IsOptional() @IsString() @MaxLength(80)
  nextTopic?: string | null;
}

class ChatDto {
  @ValidateNested({ each: true }) @Type(() => TurnDto)
  @ArrayMinSize(1) @ArrayMaxSize(40)
  turns!: TurnDto[];

  @IsOptional() @IsIn(["ru", "en"])
  lang?: string;

  @IsOptional() @IsIn(LEVELS)
  level?: string;

  @IsOptional() @ValidateNested() @Type(() => ProfileDto)
  profile?: ProfileDto;
}

class DialogueDto {
  @IsString() @MaxLength(40)
  id!: string;

  @ValidateNested({ each: true }) @Type(() => TurnDto)
  @ArrayMinSize(1) @ArrayMaxSize(40)
  turns!: TurnDto[];

  @IsArray() @ArrayMaxSize(10) @IsInt({ each: true }) @Min(0, { each: true })
  done!: number[];

  @IsOptional() @IsIn(["ru", "en"])
  lang?: string;

  @IsOptional() @ValidateNested() @Type(() => ProfileDto)
  profile?: ProfileDto;
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
    return this.tutor.reply(user, body.turns, body.lang ?? "ru", body.profile ?? (body.level ? { level: body.level } : undefined));
  }

  // Dialogue lessons: the list is public (no AI call), each step needs Pro.
  @Get("dialogues")
  dialogues() {
    return this.tutor.dialogues();
  }

  @Post("dialogue")
  @HttpCode(200)
  dialogue(@Body() body: DialogueDto, @Headers("authorization") auth?: string) {
    const user = this.tg.verifyInitData(initDataOf(auth));
    return this.tutor.dialogue(user, body.id, body.turns, body.done, body.lang ?? "ru", body.profile);
  }
}
