import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalServComponent } from './modal-serv.component';

describe('ModalServComponent', () => {
  let component: ModalServComponent;
  let fixture: ComponentFixture<ModalServComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalServComponent]
    });
    fixture = TestBed.createComponent(ModalServComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
