import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CvDisplayComponent } from './cv-display.component';

describe('CvDisplayComponent', () => {
  let component: CvDisplayComponent;
  let fixture: ComponentFixture<CvDisplayComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CvDisplayComponent]
    });
    fixture = TestBed.createComponent(CvDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
