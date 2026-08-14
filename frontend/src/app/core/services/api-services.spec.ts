import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ComponentDefinitionsApiService } from './component-definitions-api.service';
import { FlowsApiService } from './flows-api.service';
import { environment } from '../../../environments/environment';
import { CreateFlowRequest, Flow } from '../models/flow.model';
import { ComponentDefinition } from '../models/component-definition.model';

describe('API HTTP services (mocked)', () => {
  let httpMock: HttpTestingController;
  let flowsApi: FlowsApiService;
  let definitionsApi: ComponentDefinitionsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    httpMock = TestBed.inject(HttpTestingController);
    flowsApi = TestBed.inject(FlowsApiService);
    definitionsApi = TestBed.inject(ComponentDefinitionsApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('ComponentDefinitionsApiService GETs /component-definitions', () => {
    const mock: ComponentDefinition[] = [
      {
        id: 'myesb-cron-consumer',
        name: 'Scheduler',
        description: '',
        category: 'Pollers',
        role: 'consumer',
        configFields: [],
      },
    ];

    let result: ComponentDefinition[] | undefined;
    definitionsApi.getAll().subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/component-definitions`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mock);
    expect(result).toEqual(mock);
  });

  it('FlowsApiService covers CRUD HTTP calls', () => {
    const flow = {
      id: 'flow-1',
      name: 'Demo',
      consumerComponentId: 'myesb-cron-consumer',
      consumerConfig: {},
      producerComponentId: 'myesb-file-producer',
      producerConfig: {},
      steps: [],
      createdAt: '',
      updatedAt: '',
    } as Flow;

    const createPayload: CreateFlowRequest = {
      name: 'Demo',
      consumer: { componentId: 'myesb-cron-consumer', config: { id: 'c1' } },
      services: [],
      producer: {
        componentId: 'myesb-file-producer',
        config: { id: 'p1', directory: 'file:/tmp' },
      },
    };

    flowsApi.getAll().subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/flows`).flush([flow]);

    flowsApi.getById('flow-1').subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/flows/flow-1`).flush(flow);

    flowsApi.create(createPayload).subscribe();
    const createReq = httpMock.expectOne(`${environment.apiBaseUrl}/flows`);
    expect(createReq.request.method).toBe('POST');
    createReq.flush(flow);

    flowsApi.update('flow-1', { name: 'Renamed' }).subscribe();
    const patchReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/flows/flow-1`,
    );
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ ...flow, name: 'Renamed' });

    flowsApi.delete('flow-1').subscribe();
    const deleteReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/flows/flow-1`,
    );
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });
});
