import { Controller, Get } from '@nestjs/common';
import { RobotsService } from './robots.service';

@Controller('robots')
export class RobotsController {
    constructor(private readonly robotsService: RobotsService) { }

    @Get()
    getAllRobots() {
        return this.robotsService.getAllRobots();
    }
}
