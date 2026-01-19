import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCfdiModalComponent } from './add-cfdi-modal.component';

describe('AddCfdiModalComponent', () => {
  let component: AddCfdiModalComponent;
  let fixture: ComponentFixture<AddCfdiModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddCfdiModalComponent]
    });
    fixture = TestBed.createComponent(AddCfdiModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
