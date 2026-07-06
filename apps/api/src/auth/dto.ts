import { IsString } from "class-validator";

export class GoogleLoginDto {
  // The ID token returned by Google Identity Services on the front-end.
  @IsString()
  credential!: string;
}
