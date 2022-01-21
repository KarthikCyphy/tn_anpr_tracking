import { Routes } from '@angular/router';

export const content: Routes = [
  {
    path: 'home',
    loadChildren: () => import('../../home/home.module').then(m => m.HomeModule),
  },
  {
    path: 'upload-video',
    loadChildren: () => import('../../upload-video/upload-video.module').then(m => m.UploadVideoModule),
  },
  {
    path: 'vehicle-search',
    loadChildren: () => import('../../vehicle-search/vehicle-search.module').then(m => m.VehicleSearchModule),
  },
];