import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { resolve } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Flows API (e2e)', () => {
  let app: INestApplication<App>;
  const uniqueName = `e2e-flow-${Date.now()}`;

  const validBody = (name: string) => ({
    name,
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
    ],
    producer: {
      componentId: 'myesb-file-producer',
      config: { id: 'filedrop-1', directory: 'file:/tmp/out' },
    },
  });

  beforeAll(async () => {
    process.env.DEFINITIONS_DIR = resolve(__dirname, '..', '..', 'definitions');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports full CRUD and returns 409 on duplicate name', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/flows')
      .send(validBody(uniqueName))
      .expect(201);

    const id = createRes.body.id as string;
    expect(id).toBeDefined();
    expect(createRes.body.name).toBe(uniqueName);

    await request(app.getHttpServer())
      .post('/api/flows')
      .send(validBody(uniqueName))
      .expect(409)
      .expect(({ body }) => {
        expect(body.error).toBe('Duplicate Flow Name');
      });

    await request(app.getHttpServer())
      .get(`/api/flows/${id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe(uniqueName);
        expect(body.steps).toHaveLength(1);
      });

    const renamed = `${uniqueName}-updated`;
    await request(app.getHttpServer())
      .patch(`/api/flows/${id}`)
      .send({ name: renamed })
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe(renamed);
      });

    await request(app.getHttpServer())
      .get('/api/flows')
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
        expect(body.some((flow: { id: string }) => flow.id === id)).toBe(true);
      });

    const duplicateName = `${uniqueName}-copy`;
    const duplicateRes = await request(app.getHttpServer())
      .post(`/api/flows/${id}/duplicate`)
      .send({ name: duplicateName })
      .expect(201)
      .expect(({ body }) => {
        expect(body.name).toBe(duplicateName);
        expect(body.id).not.toBe(id);
        expect(body.consumerComponentId).toBe('myesb-cron-consumer');
        expect(body.steps).toHaveLength(1);
      });

    const duplicateId = duplicateRes.body.id as string;

    await request(app.getHttpServer())
      .delete(`/api/flows/${duplicateId}`)
      .expect(204);

    await request(app.getHttpServer()).delete(`/api/flows/${id}`).expect(204);

    await request(app.getHttpServer()).get(`/api/flows/${id}`).expect(404);
  });
});
