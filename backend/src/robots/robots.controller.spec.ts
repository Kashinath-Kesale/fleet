import { Test, TestingModule } from '@nestjs/testing';
import { RobotsController } from './robots.controller';
import { RobotsService } from './robots.service';

describe('RobotsController', () => {
  let controller: RobotsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RobotsController],
      providers: [
        {
          provide: RobotsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<RobotsController>(RobotsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
