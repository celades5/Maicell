import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DuplicateFlowDto {
  @ApiProperty({
    example: 'XML to JSON file drop (copy)',
    description: 'Unique name for the duplicated flow',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
