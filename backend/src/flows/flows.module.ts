import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComponentDefinitionsModule } from '../component-definitions/component-definitions.module';
import { Flow } from './entities/flow.entity';
import { FlowStep } from './entities/flow-step.entity';
import { FlowValidationService } from './flow-validation.service';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flow, FlowStep]),
    ComponentDefinitionsModule,
  ],
  controllers: [FlowsController],
  providers: [FlowsService, FlowValidationService],
  exports: [FlowsService],
})
export class FlowsModule {}
