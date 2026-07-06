import { IsArray, IsIn, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SetWordStateDto {
  @IsString()
  groupKey!: string;

  @IsString()
  word!: string;

  @IsIn(["known", "learning", "none"])
  state!: "known" | "learning" | "none";
}

export class ProgressEntryDto {
  @IsString()
  groupKey!: string;

  @IsString()
  word!: string;

  @IsIn(["known", "learning"])
  state!: "known" | "learning";
}

// Bulk import from the old localStorage progress (one-time migration).
export class SyncProgressDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgressEntryDto)
  entries!: ProgressEntryDto[];
}
