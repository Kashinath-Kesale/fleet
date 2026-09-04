import { Test, TestingModule } from '@nestjs/testing';
import { RobotsService } from './robots.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('RobotsService', () => {
  let service: RobotsService;

  const realtimeGatewayMock = {
    broadcastRobotUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RobotsService,
        {
          provide: RealtimeGateway,
          useValue: realtimeGatewayMock,
        },
      ],
    }).compile();

    service = module.get<RobotsService>(RobotsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should ignore stale robot updates', () => {
    const firstUpdate = {
      robot_id: 'r1',
      x: 100,
      y: 100,
      battery: 90,
      status: 'active',
      sequence: 10,
    };

    const staleUpdate = {
      robot_id: 'r1',
      x: 200,
      y: 200,
      battery: 50,
      status: 'error',
      sequence: 9,
    };

    service.updateRobot(firstUpdate);
    const result = service.updateRobot(staleUpdate);

    expect(result.sequence).toBe(10);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.battery).toBe(90);
  });
});