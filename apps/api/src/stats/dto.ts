import { IsString } from "class-validator";

export class RecordQuizDto {
  @IsString()
  word!: string;

  // The word the user actually picked; equal to `word` when correct.
  @IsString()
  picked!: string;
}
