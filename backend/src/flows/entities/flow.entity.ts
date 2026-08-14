import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FlowStep } from './flow-step.entity';

@Entity('flows')
export class Flow {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'XML to JSON file drop' })
  @Column({ unique: true })
  name!: string;

  @ApiProperty({ example: 'myesb-cron-consumer' })
  @Column()
  consumerComponentId!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { id: 'scheduler-1', cron: '0 0/5 * * * ?' },
  })
  @Column({ type: 'jsonb', default: {} })
  consumerConfig!: Record<string, unknown>;

  @ApiProperty({ example: 'myesb-file-producer' })
  @Column()
  producerComponentId!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { id: 'file-drop-1', directory: 'file:/data/out' },
  })
  @Column({ type: 'jsonb', default: {} })
  producerConfig!: Record<string, unknown>;

  @ApiProperty({ type: () => [FlowStep] })
  @OneToMany(() => FlowStep, (step) => step.flow, {
    cascade: true,
  })
  steps!: FlowStep[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt!: Date;
}
