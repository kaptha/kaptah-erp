import { Test, TestingModule } from '@nestjs/testing';
import { UserEntityRelationsService } from './user-entity-relations.service';

describe('UserEntityRelationsService', () => {
  let service: UserEntityRelationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserEntityRelationsService],
    }).compile();

    service = module.get<UserEntityRelationsService>(UserEntityRelationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
