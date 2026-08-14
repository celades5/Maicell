import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ComponentInstanceDto {
  @ApiProperty({
    example: 'myesb-cron-consumer',
    description: 'Whitelisted ConnectPlaza component id',
  })
  @IsString()
  @IsNotEmpty()
  componentId!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { id: 'scheduler-1', cron: '0 0/5 * * * ?' },
    description: 'Component-specific configuration (keys from definitions)',
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}

export class CreateFlowDto {
  @ApiProperty({ example: 'XML to JSON file drop' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: ComponentInstanceDto })
  @ValidateNested()
  @Type(() => ComponentInstanceDto)
  consumer!: ComponentInstanceDto;

  @ApiProperty({ type: [ComponentInstanceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentInstanceDto)
  services!: ComponentInstanceDto[];

  @ApiProperty({ type: ComponentInstanceDto })
  @ValidateNested()
  @Type(() => ComponentInstanceDto)
  producer!: ComponentInstanceDto;
}
