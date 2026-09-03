import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RobotsService } from './robots.service';
import { RobotUpdatesDto } from './dto/robot-updates.dto';

@Controller('robots')
export class RobotsController {
    constructor(private readonly robotsService: RobotsService) { }

    @Get()
    getAllRobots() {
        return this.robotsService.getAllRobots();
    }

    @Get(':robotId')
    getRobot(@Param('robotId') robotId: string) {
        return this.robotsService.getRobot(robotId);
    }

    @Post('updates')
    receiveUpdates(@Body() body: RobotUpdatesDto) {
        return this.robotsService.processUpdates(body.updates);
    }
}
