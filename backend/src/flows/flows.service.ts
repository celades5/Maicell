import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ComponentInstanceDto, CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { Flow } from './entities/flow.entity';
import { FlowStep } from './entities/flow-step.entity';
import { FlowValidationService } from './flow-validation.service';

@Injectable()
export class FlowsService {
  constructor(
    @InjectRepository(Flow)
    private readonly flowsRepository: Repository<Flow>,
    @InjectRepository(FlowStep)
    private readonly flowStepsRepository: Repository<FlowStep>,
    private readonly flowValidation: FlowValidationService,
  ) {}

  findAll(): Promise<Flow[]> {
    return this.flowsRepository.find({
      relations: { steps: true },
      order: {
        name: 'ASC',
        steps: {
          order: 'ASC',
        },
      },
    });
  }

  async findOne(id: string): Promise<Flow> {
    const flow = await this.flowsRepository.findOne({
      where: { id },
      relations: { steps: true },
      order: {
        steps: {
          order: 'ASC',
        },
      },
    });

    if (!flow) {
      throw new NotFoundException({
        message: 'We could not find that integration flow.',
        error: 'Flow Not Found',
        details: { flowId: id },
        hint: 'Check the flow id, or open the flows list to pick an existing one.',
      });
    }

    return flow;
  }

  async create(dto: CreateFlowDto): Promise<Flow> {
    this.flowValidation.validateCreate(dto);

    const flow = this.flowsRepository.create({
      name: dto.name,
      consumerComponentId: dto.consumer.componentId,
      consumerConfig: dto.consumer.config ?? {},
      producerComponentId: dto.producer.componentId,
      producerConfig: dto.producer.config ?? {},
      steps: this.mapServicesToSteps(dto.services),
    });

    try {
      const saved = await this.flowsRepository.save(flow);
      return this.findOne(saved.id);
    } catch (error) {
      this.rethrowUniqueNameConflict(error, dto.name);
    }
  }

  async update(id: string, dto: UpdateFlowDto): Promise<Flow> {
    this.flowValidation.validateUpdate(dto);

    const flow = await this.findOne(id);

    if (dto.name !== undefined) {
      flow.name = dto.name;
    }

    if (dto.consumer) {
      flow.consumerComponentId = dto.consumer.componentId;
      flow.consumerConfig = dto.consumer.config ?? {};
    }

    if (dto.producer) {
      flow.producerComponentId = dto.producer.componentId;
      flow.producerConfig = dto.producer.config ?? {};
    }

    if (dto.services) {
      await this.flowStepsRepository.delete({ flowId: id });
      flow.steps = this.mapServicesToSteps(dto.services);
    }

    try {
      await this.flowsRepository.save(flow);
      return this.findOne(id);
    } catch (error) {
      this.rethrowUniqueNameConflict(error, dto.name ?? flow.name);
    }
  }

  async remove(id: string): Promise<void> {
    const flow = await this.findOne(id);
    await this.flowsRepository.remove(flow);
  }

  async duplicate(id: string, name: string): Promise<Flow> {
    const source = await this.findOne(id);
    const steps = [...(source.steps ?? [])].sort((a, b) => a.order - b.order);

    return this.create({
      name,
      consumer: {
        componentId: source.consumerComponentId,
        config: { ...(source.consumerConfig ?? {}) },
      },
      services: steps.map((step) => ({
        componentId: step.componentId,
        config: { ...(step.config ?? {}) },
      })),
      producer: {
        componentId: source.producerComponentId,
        config: { ...(source.producerConfig ?? {}) },
      },
    });
  }

  private mapServicesToSteps(services: ComponentInstanceDto[]): FlowStep[] {
    return services.map((service, index) =>
      this.flowStepsRepository.create({
        componentId: service.componentId,
        order: index,
        config: service.config ?? {},
      }),
    );
  }

  private rethrowUniqueNameConflict(error: unknown, flowName: string): never {
    if (
      error instanceof QueryFailedError &&
      typeof error.driverError === 'object' &&
      error.driverError !== null &&
      'code' in error.driverError &&
      error.driverError.code === '23505'
    ) {
      throw new ConflictException({
        message: `The flow name "${flowName}" is already in use.`,
        error: 'Duplicate Flow Name',
        details: {
          field: 'name',
          value: flowName,
        },
        hint: 'Choose a different unique name and try saving again.',
      });
    }

    throw error;
  }
}
