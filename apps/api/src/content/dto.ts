import { IsIn, IsInt, IsOptional, IsString, MinLength } from "class-validator";

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  key!: string;

  @IsIn(["level", "topic"])
  category!: "level" | "topic";

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsIn(["level", "topic"])
  category?: "level" | "topic";

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateWordDto {
  @IsString()
  @MinLength(1)
  groupKey!: string;

  @IsString()
  @MinLength(1)
  word!: string;

  @IsString()
  pos!: string;

  @IsString()
  def!: string;

  @IsString()
  example!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateWordDto {
  @IsOptional()
  @IsString()
  word?: string;

  @IsOptional()
  @IsString()
  pos?: string;

  @IsOptional()
  @IsString()
  def?: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
