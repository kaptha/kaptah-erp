import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsdUploadModalComponent } from './csd-upload-modal.component';

describe('CsdUploadModalComponent', () => {
  let component: CsdUploadModalComponent;
  let fixture: ComponentFixture<CsdUploadModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CsdUploadModalComponent]
    });
    fixture = TestBed.createComponent(CsdUploadModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
