import { TestBed } from '@angular/core/testing';

import { ApibizService } from './apibiz.service';

describe('ApibizService', () => {
  let service: ApibizService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApibizService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
