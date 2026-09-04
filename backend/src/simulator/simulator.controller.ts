import { Body, Controller, Get, Post } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { SimulatorConfigDto } from './dto/simulator-config.dto';


@Controller('simulator')
export class SimulatorController {
    constructor(private readonly simulatorService: SimulatorService) {}

    @Get('config')
    getConfig() {
        return this.simulatorService.getConfig();
    }

    @Post('config')
    updateConfig(@Body() config: SimulatorConfigDto) {
        this.simulatorService.updateConfig(config);

        return this.simulatorService.getConfig();
    }


    @Post('start')
    start() {
        this.simulatorService.start();

        return {message: 'Simulator started'};
    }

    @Post('stop')
    stop() {
        this.simulatorService.stop();

        return {message: 'Simulator stopped'};
    }
}