jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { SimulatorService } from './simulator.service';
import { ConfigService } from '@nestjs/config';

describe('SimulatorService', () => {
  let service: SimulatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulatorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: number) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<SimulatorService>(SimulatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});