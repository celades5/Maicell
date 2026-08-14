import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentConfigFieldsComponent } from './component-config-fields.component';
import { buildConfigGroup } from '../utils/flow-form.util';
import { ComponentConfigField } from '../../../core/models/component-definition.model';

describe('ComponentConfigFieldsComponent', () => {
  let fixture: ComponentFixture<ComponentConfigFieldsComponent>;
  let component: ComponentConfigFieldsComponent;

  const fields: ComponentConfigField[] = [
    {
      key: 'id',
      label: 'id',
      description: '',
      required: true,
      fieldType: 'string',
      order: 1,
    },
    {
      key: 'return-type',
      label: 'Return Type',
      description: 'TEXT/XML/BYTES',
      required: true,
      fieldType: 'enumeration',
      options: [
        { value: 'TEXT', label: 'TEXT' },
        { value: 'XML', label: 'XML' },
      ],
      defaultValue: 'TEXT',
      order: 2,
    },
    {
      key: 'delete-after-reading',
      label: 'Delete after reading',
      description: '',
      required: false,
      fieldType: 'boolean',
      defaultValue: 'false',
      order: 3,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentConfigFieldsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentConfigFieldsComponent);
    component = fixture.componentInstance;
    component.fields = fields;
    component.configGroup = buildConfigGroup(fields);
    fixture.detectChanges();
  });

  it('renders inputs from configFields definitions', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Return Type');
    expect(compiled.textContent).toContain('Delete after reading');
    expect(compiled.querySelector('input[type="text"]')).toBeTruthy();
    expect(compiled.querySelector('select')).toBeTruthy();
    expect(compiled.querySelector('input[type="checkbox"]')).toBeTruthy();
  });
});
