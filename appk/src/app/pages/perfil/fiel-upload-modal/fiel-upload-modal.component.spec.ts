import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FielUploadModalComponent } from './fiel-upload-modal.component';

describe('FielUploadModalComponent', () => {
  let component: FielUploadModalComponent;
  let fixture: ComponentFixture<FielUploadModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FielUploadModalComponent]
    });
    fixture = TestBed.createComponent(FielUploadModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
