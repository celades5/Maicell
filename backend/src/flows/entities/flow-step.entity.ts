import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Flow } from './flow.entity';

@Entity('flow_steps')
export class FlowStep {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ format: 'uuid' })
  @Column()
  flowId!: string;

  @ApiProperty({ example: 'myesb-filereader-service' })
  @Column()
  componentId!: string;

  @ApiProperty({ example: 0 })
  @Column({ type: 'int' })
  order!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { 'file-uri': 'file:/data/in', 'return-type': 'String' },
  })
  @Column({ type: 'jsonb', default: {} })
  config!: Record<string, unknown>;

  @ManyToOne(() => Flow, (flow) => flow.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'flowId' })
  flow!: Flow;
}
