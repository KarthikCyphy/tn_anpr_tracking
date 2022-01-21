import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VehicleSearchComponent } from './vehicle-search.component';

const routes: Routes = [
  {
    path: '',
    component: VehicleSearchComponent,
    children: []
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VehicleSearchRoutingModule { }
