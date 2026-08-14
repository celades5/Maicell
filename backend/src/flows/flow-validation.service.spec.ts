import { BadRequestException } from '@nestjs/common';
import { resolve } from 'node:path';
import { ComponentDefinitionsService } from '../component-definitions/component-definitions.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { FlowValidationService } from './flow-validation.service';

describe('FlowValidationService', () => {
  let service: FlowValidationService;

  beforeAll(() => {
    process.env.DEFINITIONS_DIR = resolve(
      __dirname,
      '..',
      '..',
      '..',
      'definitions',
    );
    const definitions = new ComponentDefinitionsService();
    service = new FlowValidationService(definitions);
  });

  const validDto = (): CreateFlowDto => ({
    name: 'Scheduler to File Drop',
    consumer: {
      componentId: 'myesb-cron-consumer',
      config: { id: 'scheduler-1' },
    },
    services: [
      {
        componentId: 'myesb-filereader-service',
        config: {
          id: 'filereader-1',
          'file-uri': 'file:/tmp/input.xml',
          'return-type': 'TEXT',
        },
      },
      {
        componentId: 'myesb-xml2json-transformer',
        config: { id: 'xml2json-1' },
      },
    ],
    producer: {
      componentId: 'myesb-file-producer',
      config: { id: 'filedrop-1', directory: 'file:/tmp/out' },
    },
  });

  const getIssues = (error: unknown) => {
    expect(error).toBeInstanceOf(BadRequestException);
    const body = (error as BadRequestException).getResponse() as {
      details?: { issues?: Array<{ path: string; code: string }> };
    };
    return body.details?.issues ?? [];
  };

  it('accepts a valid example flow (happy path)', () => {
    expect(() => service.validateCreate(validDto())).not.toThrow();
  });

  it('rejects role mismatch (producer used as consumer)', () => {
    const dto = validDto();
    dto.consumer.componentId = 'myesb-file-producer';

    try {
      service.validateCreate(dto);
      fail('expected BadRequestException');
    } catch (error) {
      const issues = getIssues(error);
      expect(issues.some((issue) => issue.code === 'ROLE_MISMATCH')).toBe(true);
      expect(
        issues.some((issue) => issue.path === 'consumer.componentId'),
      ).toBe(true);
    }
  });

  it('rejects missing required config fields', () => {
    const dto = validDto();
    dto.producer.config = {};

    try {
      service.validateCreate(dto);
      fail('expected BadRequestException');
    } catch (error) {
      const issues = getIssues(error);
      expect(issues.some((issue) => issue.code === 'REQUIRED_CONFIG')).toBe(
        true,
      );
      expect(
        issues.some((issue) => issue.path === 'producer.config.id'),
      ).toBe(true);
      expect(
        issues.some((issue) => issue.path === 'producer.config.directory'),
      ).toBe(true);
    }
  });

  it('rejects file-uri that does not start with file:', () => {
    const dto = validDto();
    dto.services[0].config = {
      id: 'filereader-1',
      'file-uri': 'http://example.com/file.xml',
      'return-type': 'TEXT',
    };

    try {
      service.validateCreate(dto);
      fail('expected BadRequestException');
    } catch (error) {
      const issues = getIssues(error);
      expect(issues.some((issue) => issue.code === 'INVALID_FILE_URI')).toBe(
        true,
      );
      expect(
        issues.some((issue) => issue.path === 'services[0].config.file-uri'),
      ).toBe(true);
    }
  });

  it('rejects directory that does not start with file:', () => {
    const dto = validDto();
    dto.producer.config = { id: 'filedrop-1', directory: 'meme' };

    try {
      service.validateCreate(dto);
      fail('expected BadRequestException');
    } catch (error) {
      const issues = getIssues(error);
      expect(
        issues.some((issue) => issue.code === 'INVALID_DIRECTORY_URI'),
      ).toBe(true);
      expect(
        issues.some((issue) => issue.path === 'producer.config.directory'),
      ).toBe(true);
    }
  });

  it('rejects unknown component ids', () => {
    const dto = validDto();
    dto.consumer.componentId = 'not-a-real-component';

    try {
      service.validateCreate(dto);
      fail('expected BadRequestException');
    } catch (error) {
      const issues = getIssues(error);
      expect(issues.some((issue) => issue.code === 'UNKNOWN_COMPONENT')).toBe(
        true,
      );
    }
  });

  it('accepts zero services', () => {
    const dto = validDto();
    dto.services = [];
    expect(() => service.validateCreate(dto)).not.toThrow();
  });
});
