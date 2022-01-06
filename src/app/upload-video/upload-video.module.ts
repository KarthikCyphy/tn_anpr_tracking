import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UploadVideoRoutingModule } from './upload-video-routing.module';
import { UploadVideoComponent } from './upload-video.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [
    UploadVideoComponent
  ],
  imports: [
    CommonModule,
    UploadVideoRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    NgbModule,
    SharedModule,
  ]
})
export class UploadVideoModule { }
