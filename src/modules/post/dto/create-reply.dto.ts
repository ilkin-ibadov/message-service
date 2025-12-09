import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReplyDto {
    @ApiProperty({
        example: 'This is my reply',
        description: 'Text content of the reply',
    })
    @IsString()
    @IsNotEmpty()
    text: string;
}
