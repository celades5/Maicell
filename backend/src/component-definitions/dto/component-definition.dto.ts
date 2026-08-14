import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfigFieldOptionDto {
  @ApiProperty()
  value!: string;

  @ApiProperty()
  label!: string;
}

export class ComponentConfigFieldDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  required!: boolean;

  @ApiProperty({
    enum: [
      'string',
      'description',
      'boolean',
      'cron',
      'enumeration',
      'textenumeration',
    ],
  })
  fieldType!: string;

  @ApiPropertyOptional()
  defaultValue?: string;

  @ApiPropertyOptional({ type: [ConfigFieldOptionDto] })
  options?: ConfigFieldOptionDto[];

  @ApiProperty()
  order!: number;
}

export class ComponentDefinitionDto {
  @ApiProperty({ example: 'myesb-cron-consumer' })
  id!: string;

  @ApiProperty({ example: 'Scheduler' })
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ enum: ['consumer', 'service', 'producer'] })
  role!: string;

  @ApiProperty({ type: [ComponentConfigFieldDto] })
  configFields!: ComponentConfigFieldDto[];
}
