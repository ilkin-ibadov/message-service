import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class UserResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
