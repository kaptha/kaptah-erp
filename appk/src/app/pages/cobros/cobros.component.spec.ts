import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CobrosComponent } from './cobros.component';

describe('CobrosComponent', () => {
  let component: CobrosComponent;
  let fixture: ComponentFixture<CobrosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CobrosComponent]
    });
    fixture = TestBed.createComponent(CobrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
