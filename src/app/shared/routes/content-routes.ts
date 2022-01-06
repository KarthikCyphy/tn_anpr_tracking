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
];