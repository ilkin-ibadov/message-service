import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8})
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, default: Role.USER })
  @IsEnum(Role)
  role: Role;
}
