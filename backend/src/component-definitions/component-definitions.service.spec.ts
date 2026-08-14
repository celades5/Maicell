import { resolve } from 'node:path';
import { ComponentDefinitionsService } from './component-definitions.service';
import { ALLOWED_COMPONENT_IDS } from './component-definitions.constants';

describe('ComponentDefinitionsService', () => {
  let service: ComponentDefinitionsService;

  beforeAll(() => {
    process.env.DEFINITIONS_DIR = resolve(
      __dirname,
      '..',
      '..',
      '..',
      'definitions',
    );
    service = new ComponentDefinitionsService();
  });

  it('loads and returns exactly the four whitelisted components', () => {
    const definitions = service.getAll();

    expect(definitions).toHaveLength(4);
    expect(definitions.map((definition) => definition.id)).toEqual([
      ...ALLOWED_COMPONENT_IDS,
    ]);
  });

  it('merges catalog metadata with the correct roles and labels', () => {
    const byId = Object.fromEntries(
      service.getAll().map((definition) => [definition.id, definition]),
    );

    expect(byId['myesb-cron-consumer']).toMatchObject({
      name: 'Scheduler',
      category: 'Pollers',
      role: 'consumer',
    });
    expect(byId['myesb-filereader-service']).toMatchObject({
      name: 'File Reader Service',
      category: 'File Handlers',
      role: 'service',
    });
    expect(byId['myesb-xml2json-transformer']).toMatchObject({
      name: 'XML to JSON Transformer',
      category: 'Transformers',
      role: 'service',
    });
    expect(byId['myesb-file-producer']).toMatchObject({
      name: 'File Drop',
      category: 'Droppers',
      role: 'producer',
    });
  });

  it('normalizes required fields, types, defaults, and options', () => {
    const fileReader = service
      .getAll()
      .find((definition) => definition.id === 'myesb-filereader-service');

    expect(fileReader).toBeDefined();

    const idField = fileReader!.configFields.find(
      (field) => field.key === 'id',
    );
    const fileUri = fileReader!.configFields.find(
      (field) => field.key === 'file-uri',
    );
    const returnType = fileReader!.configFields.find(
      (field) => field.key === 'return-type',
    );

    expect(idField).toMatchObject({
      required: true,
      fieldType: 'string',
      label: 'id',
    });
    expect(fileUri).toMatchObject({
      required: true,
      fieldType: 'string',
      defaultValue: 'file:',
      label: 'File Location',
    });
    expect(returnType).toMatchObject({
      required: true,
      fieldType: 'enumeration',
      defaultValue: 'TEXT',
      label: 'Return Type',
    });
    expect(returnType!.options).toEqual(
      expect.arrayContaining([
        { value: 'TEXT', label: 'TEXT' },
        { value: 'XML', label: 'XML' },
        { value: 'BYTES', label: 'BYTES' },
      ]),
    );
  });

  it('sorts config fields by order', () => {
    const scheduler = service
      .getAll()
      .find((definition) => definition.id === 'myesb-cron-consumer');

    expect(scheduler).toBeDefined();
    expect(scheduler!.configFields.map((field) => field.key)).toEqual([
      'description',
      'id',
      'autostart',
      'cron-expression',
    ]);

    const orders = scheduler!.configFields.map((field) => field.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('excludes nested, advanced, and beanreference fields', () => {
    for (const definition of service.getAll()) {
      const keys = definition.configFields.map((field) => field.key);

      expect(keys).not.toContain('exception-handling');
      expect(keys).not.toContain('meta-data');
      expect(keys).not.toContain('serialize');
      expect(keys).not.toContain('filename-generator');
    }

    const fileDrop = service
      .getAll()
      .find((definition) => definition.id === 'myesb-file-producer');

    expect(fileDrop!.configFields.map((field) => field.key)).toEqual([
      'description',
      'id',
      'directory',
      'filename-extension',
      'filename-from-header',
      'messagepart',
    ]);
  });

  it('caches normalized definitions between getAll calls', () => {
    const first = service.getAll();
    const second = service.getAll();

    expect(first).toBe(second);
  });
});
