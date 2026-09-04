import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { SimulatorConfigDto } from './dto/simulator-config.dto';
import { AdminAuthGuard } from './admin-auth.guard';

@Controller('simulator')
export class SimulatorController {
    constructor(private readonly simulatorService: SimulatorService) {}

    @Get('config')
    getConfig() {
        return this.simulatorService.getConfig();
    }

    @Post('config')
    @UseGuards(AdminAuthGuard)
    updateConfig(@Body() config: SimulatorConfigDto) {
        this.simulatorService.updateConfig(config);

        return this.simulatorService.getConfig();
    }

    @Post('start')
    @UseGuards(AdminAuthGuard)
    start() {
        this.simulatorService.start();

        return {message: 'Simulator started'};
    }

    @Post('stop')
    @UseGuards(AdminAuthGuard)
    stop() {
        this.simulatorService.stop();

        return {message: 'Simulator stopped'};
    }
}