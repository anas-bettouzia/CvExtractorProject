import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbToastModule, NgbAccordionModule, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

// ng-bootstrap
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

// Routing
import { CvRoutingModule } from './cv-routing.module';

// Components
import { CvUploadComponent } from './components/cv-upload/cv-upload.component';
import { CvDisplayComponent } from './components/cv-display/cv-display.component';

@NgModule({
  declarations: [
    CvUploadComponent,
    CvDisplayComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    NgbModule,
    CvRoutingModule,
  ],
  exports: [
    CvUploadComponent,
    CvDisplayComponent,
  ],
})
export class CvModule {}
