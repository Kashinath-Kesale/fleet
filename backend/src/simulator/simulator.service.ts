import { Injectable, OnModuleInit  } from '@nestjs/common';
import { SimulatedRobot } from './interfaces/simulated-robot.interface';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RobotRoster } from 'src/robots/interfaces/robot-roster.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SimulatorService implements OnModuleInit {
    private readonly robots = new Map<string, SimulatedRobot>();

    private readonly OBSTACLES = [
        { x: 150, y: 80, width: 200, height: 60 },
        { x: 150, y: 220, width: 200, height: 60 },
        { x: 150, y: 360, width: 200, height: 60 },
        { x: 500, y: 60, width: 60, height: 400 },
        { x: 650, y: 150, width: 200, height: 50 },
        { x: 650, y: 340, width: 200, height: 50 },
    ];

    private readonly SITE_WIDTH = 900;
    private readonly SITE_HEIGHT = 560;
    private readonly MOVE_STEP = 3;

    private  fleetSize: number;
    private updateInterval: number;
    private payloadSize: number;

    private timer?: NodeJS.Timeout;

    constructor(private readonly configService: ConfigService) {
        this.fleetSize = Number(
            this.configService.get<number>('SIMULATOR_FLEET_SIZE', 8),
        );
        this.updateInterval = Number(
            this.configService.get<number>('SIMULATOR_UPDATE_INTERVAL', 1000),
        );
        this.payloadSize = Number(
            this.configService.get<number>('SIMULATOR_PAYLOAD_SIZE', 0),
        );
    }

    onModuleInit(): void {
        this.loadRobots();
        this.start();
    }


    private isInsideObstacle(x: number, y: number): boolean {
        const ROBOT_RADIUS = 5;

        return this.OBSTACLES.some((obstacle) => {
            return (
                x >= obstacle.x - ROBOT_RADIUS && 
                x <= obstacle.x + obstacle.width + ROBOT_RADIUS &&
                y >= obstacle.y - ROBOT_RADIUS && 
                y <= obstacle.y + obstacle.height + ROBOT_RADIUS
            );
        });
    }

    private assignRandomTarget(robot: SimulatedRobot): void {
        let targetX: number;
        let targetY: number;

        do {
            targetX = Math.random() * this.SITE_WIDTH;
            targetY = Math.random() * this.SITE_HEIGHT;
        }
        while (this.isInsideObstacle(targetX, targetY));

        robot.targetX = targetX;
        robot.targetY = targetY;
    }


    private moveRobot(robot: SimulatedRobot): void {
        const dx = robot.targetX - robot.x;
        const dy = robot.targetY - robot.y;


        const distance = Math.sqrt(dx * dx + dy * dy);

        if(distance <= this.MOVE_STEP) {
            robot.x = robot.targetX;
            robot.y =  robot.targetY;
            this.assignRandomTarget(robot);
            return;
        }

        const nextX = robot.x + (dx / distance) * this.MOVE_STEP;
        const nextY = robot.y + (dy / distance) * this.MOVE_STEP;

        
        if(nextX < 0 || nextX > this.SITE_WIDTH || 
            nextY < 0 || nextY > this.SITE_HEIGHT
        ) {
            this.assignRandomTarget(robot);
            return;
        }

        
        if(this.isInsideObstacle(nextX, nextY)) {
            this.assignRandomTarget(robot);
            return;
        }

        robot.x = nextX;
        robot.y = nextY;
    }


    private updateBattery(robot: SimulatedRobot): void {
        if(robot.status === 'active' || robot.status === 'on_mission') {
            robot.battery = Math.max(0, robot.battery - 0.2);
        }
        else if(robot.status === 'charging') {
            robot.battery = Math.min(100, robot.battery + 1);
        }
    }



    private updateStatus(robot: SimulatedRobot): void {
        if(robot.battery <= 20 && robot.status !== 'charging') {
            robot.status = 'charging';
            return;
        }

        if(robot.status === 'charging') {
            if(robot.battery >= 80) {
                robot.status = 'idle'; 
            }

            return;
        }


        const random = Math.random();

        if(robot.status === 'idle' && random < 0.1) {
            robot.status = 'active';
        } 
        else if(robot.status === 'active' && random < 0.05) {
            robot.status = 'on_mission';
        }
        else if(robot.status === 'on_mission' && random < 0.1) {
            robot.status = 'active';
        }
    }


    updateConfig(config: {
        fleetSize?: number;
        updateInterval?: number;
        payloadSize?: number;
    }): void {
        if(config.fleetSize !== undefined) {
            this.fleetSize = config.fleetSize;
        }

        if(config.updateInterval !== undefined) {
            this.updateInterval = config.updateInterval;
        }

        if(config.payloadSize !== undefined) {
            this.payloadSize = config.payloadSize;
        }

        this.stop();
        this.start();
    }


    private generatePayload(): string {
        const payloadSize = Number(
            this.configService.get<number>('SIMULATOR_PAYLOAD_SIZE', 0),
        );

        return 'x'.repeat(this.payloadSize);
    }


    getConfig() {
        return {
            fleetSize: this.fleetSize,
            updateInterval: this.updateInterval,
            payloadSize: this.payloadSize,
        };
    }



    private async sendUpdates(): Promise<void> {
        const updates = Array.from(this.robots.values()).map((robot) => ({
            robot_id: robot.robot_id,
            x: Number(robot.x.toFixed(2)),
            y: Number(robot.y.toFixed(2)),
            battery: Number(robot.battery.toFixed(2)),
            status: robot.status,
            sequence: robot.sequence,
            payload: this.generatePayload(),
        }));


        try {
            await fetch('http://localhost:3000/robots/updates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({updates}),
            });
        }
        catch(error) {
            console.error('Failed to send simulator updates:', error);
        }
    }




    private loadRobots(): void {
        const filePath = join(process.cwd(), '..', 'data', 'robots.json');

        const file = readFileSync(filePath, 'utf-8');
        const roster: RobotRoster[] = JSON.parse(file);

        for(const robot of roster) {
            this.robots.set(robot.robot_id, {
                robot_id: robot.robot_id,
                robot_type: robot.robot_type,
                x: robot.start.x,
                y: robot.start.y,
                battery: 100,
                status: 'idle',
                sequence: 0,
                targetX: robot.start.x,
                targetY: robot.start.y,
            });
        }



        while(this.robots.size < this.fleetSize) {
            const robotId = `r${this.robots.size + 1}`;

            let x: number;
            let y: number;

            do {
                x = Math.random() * this.SITE_WIDTH;
                y = Math.random() * this.SITE_HEIGHT;
            }
            while( this.isInsideObstacle(x, y));


            const robotType = this.robots.size % 2 === 0 ? 'picker' : 'hauler';

            this.robots.set(robotId, {
                robot_id: robotId,
                robot_type: robotType,
                x,
                y,
                battery: 100,
                status: 'idle',
                sequence: 0,
                targetX: x,
                targetY: y,
            });
        }



        console.log(`Simulator loaded ${this.robots.size} robots`);
    }

    start(): void {
        if(this.timer) return;

        console.log('Simulator started');

        this.timer = setInterval(async () => {
            for(const robot of this.robots.values()) {
                this.updateStatus(robot);
                this.updateBattery(robot);

                this.moveRobot(robot);

                robot.sequence++;

                console.log(
                    robot.robot_id,
                    robot.x.toFixed(1),
                    robot.y.toFixed(1),
                    robot.battery.toFixed(1),
                    robot.status,
                );
            }

            await this.sendUpdates();
        }, this.updateInterval);
    }

    stop(): void { 
        if(!this.timer) return;

        clearInterval(this.timer);
        this.timer = undefined;

        console.log('Simulator stopped');
    }

    getRobots(): SimulatedRobot[] {
        return Array.from(this.robots.values());
    }
}
