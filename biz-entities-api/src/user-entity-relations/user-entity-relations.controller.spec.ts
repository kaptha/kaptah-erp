import { Test, TestingModule } from '@nestjs/testing';
import { UserEntityRelationsController } from './user-entity-relations.controller';

describe('UserEntityRelationsController', () => {
  let controller: UserEntityRelationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserEntityRelationsController],
    }).compile();

    controller = module.get<UserEntityRelationsController>(UserEntityRelationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
