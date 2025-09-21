import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CvUploadComponent } from './cv-upload.component';

describe('CvUploadComponent', () => {
  let component: CvUploadComponent;
  let fixture: ComponentFixture<CvUploadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CvUploadComponent]
    });
    fixture = TestBed.createComponent(CvUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
