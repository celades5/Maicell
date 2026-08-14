import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { CreateFlowDto } from './dto/create-flow.dto';
import { Flow } from './entities/flow.entity';
import { FlowStep } from './entities/flow-step.entity';
import { FlowValidationService } from './flow-validation.service';
import { FlowsService } from './flows.service';

describe('FlowsService', () => {
  let service: FlowsService;
  let flowsRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let flowStepsRepository: {
    create: jest.Mock;
    delete: jest.Mock;
  };
  let flowValidation: { validateCreate: jest.Mock; validateUpdate: jest.Mock };

  const dto: CreateFlowDto = {
    name: 'Demo Flow',
    consumer: {
      componentId: 'myesb-cron-consumer',
      config: { id: 'c1' },
    },
    services: [],
    producer: {
      componentId: 'myesb-file-producer',
      config: { id: 'p1', directory: 'file:/tmp/out' },
    },
  };

  beforeEach(async () => {
    flowsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    flowStepsRepository = {
      create: jest.fn((value: Partial<FlowStep>) => value as FlowStep),
      delete: jest.fn(),
    };
    flowValidation = {
      validateCreate: jest.fn(),
      validateUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlowsService,
        { provide: getRepositoryToken(Flow), useValue: flowsRepository },
        {
          provide: getRepositoryToken(FlowStep),
          useValue: flowStepsRepository,
        },
        { provide: FlowValidationService, useValue: flowValidation },
      ],
    }).compile();

    service = module.get(FlowsService);
  });

  it('throws NotFoundException when flow is missing', async () => {
    flowsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps unique-name DB errors to ConflictException on create', async () => {
    const created = {
      id: 'temp',
      name: dto.name,
    } as Flow;

    flowsRepository.create.mockReturnValue(created);
    flowsRepository.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], { code: '23505' } as never),
    );

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(flowValidation.validateCreate).toHaveBeenCalledWith(dto);
  });

  it('creates a flow after validation', async () => {
    const entity = {
      id: 'flow-1',
      name: dto.name,
      consumerComponentId: dto.consumer.componentId,
      consumerConfig: dto.consumer.config ?? {},
      producerComponentId: dto.producer.componentId,
      producerConfig: dto.producer.config ?? {},
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Flow;

    flowsRepository.create.mockReturnValue(entity);
    flowsRepository.save.mockResolvedValue(entity);
    flowsRepository.findOne.mockResolvedValue(entity);

    await expect(service.create(dto)).resolves.toEqual(entity);
    expect(flowValidation.validateCreate).toHaveBeenCalledWith(dto);
  });
});
