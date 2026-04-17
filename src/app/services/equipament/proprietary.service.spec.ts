import { TestBed } from '@angular/core/testing';

import { ProprietaryService } from './proprietary.service';

describe('ProprietaryService', () => {
  let service: ProprietaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProprietaryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
