import { Routes } from '@angular/router';
import { FlowFormPage } from './features/flows/pages/flow-form.page';
import { FlowListPage } from './features/flows/pages/flow-list.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'flows' },
  { path: 'flows', component: FlowListPage },
  { path: 'flows/new', component: FlowFormPage },
  { path: 'flows/:id/view', component: FlowFormPage, data: { mode: 'view' } },
  {
    path: 'flows/:id/duplicate',
    component: FlowFormPage,
    data: { mode: 'duplicate' },
  },
  { path: 'flows/:id', component: FlowFormPage, data: { mode: 'edit' } },
  { path: '**', redirectTo: 'flows' },
];
