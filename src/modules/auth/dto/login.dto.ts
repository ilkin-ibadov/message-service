import { IsEmail, MinLength, IsOptional } from 'class-validator';
export class LoginDto {
  @IsEmail() email: string;
  @MinLength(6) password: string;
  @IsOptional() ip?: string;
  @IsOptional() device?: string;
}
