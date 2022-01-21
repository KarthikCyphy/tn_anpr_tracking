import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../shared/shared.module';
import { VehicleSearchComponent } from './vehicle-search.component';
import { VehicleSearchRoutingModule } from './vehicle-search-routing.module';


@NgModule({
  declarations: [
    VehicleSearchComponent
  ],
  imports: [
    CommonModule,
    VehicleSearchRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    NgbModule,
    SharedModule,
  ]
})
export class VehicleSearchModule { }
