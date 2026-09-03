import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';

@Module({
  providers: [SimulatorService]
})
export class SimulatorModule {}
