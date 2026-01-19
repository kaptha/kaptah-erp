import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceDesignSelectorComponent } from './invoice-design-selector.component';

describe('InvoiceDesignSelectorComponent', () => {
  let component: InvoiceDesignSelectorComponent;
  let fixture: ComponentFixture<InvoiceDesignSelectorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InvoiceDesignSelectorComponent]
    });
    fixture = TestBed.createComponent(InvoiceDesignSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
