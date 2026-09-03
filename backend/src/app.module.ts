import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RobotsModule } from './robots/robots.module';
import { SimulatorModule } from './simulator/simulator.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [RobotsModule, SimulatorModule, RealtimeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
