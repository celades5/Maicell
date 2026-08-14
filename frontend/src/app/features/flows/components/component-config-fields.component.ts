import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ComponentConfigField } from '../../../core/models/component-definition.model';
import { ConfigFormGroup } from '../utils/flow-form.util';

@Component({
  selector: 'app-component-config-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './component-config-fields.component.html',
  styleUrl: './component-config-fields.component.css',
})
export class ComponentConfigFieldsComponent {
  @Input({ required: true }) configGroup!: ConfigFormGroup;
  @Input({ required: true }) fields: ComponentConfigField[] = [];

  trackField(_index: number, field: ComponentConfigField): string {
    return field.key;
  }

  isInvalid(key: string): boolean {
    const control = this.configGroup.controls[key];
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}
