import { Module } from '@nestjs/common';
import { RobotsController } from './robots.controller';
import { RobotsService } from './robots.service';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { RealtimeModule } from 'src/realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [RobotsController],
  providers: [RobotsService]
})
export class RobotsModule {}
