import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CfdiComponent } from './cfdi.component';

describe('CfdiComponent', () => {
  let component: CfdiComponent;
  let fixture: ComponentFixture<CfdiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CfdiComponent]
    });
    fixture = TestBed.createComponent(CfdiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
