import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { SimulatorController } from './simulator.controller';

@Module({
  controllers: [SimulatorController],
  providers: [SimulatorService]
})
export class SimulatorModule { }
