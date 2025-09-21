import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CvUploadComponent } from './components/cv-upload/cv-upload.component';
import { CvDisplayComponent } from './components/cv-display/cv-display.component';

const routes: Routes = [
  { path: 'upload', component: CvUploadComponent },

  { path: 'display', component: CvDisplayComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CvRoutingModule {}
