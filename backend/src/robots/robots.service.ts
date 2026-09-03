import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { lstatSync, readFileSync } from 'fs';
import { join } from 'path';
import { RobotState } from './interfaces/robot-state.interface';
import { RobotRoster } from './interfaces/robot-roster.interface';
import { RobotUpdateDto } from './dto/robot-update.dto';


@Injectable()
export class RobotsService implements OnModuleInit {
    private readonly robots = new Map<string, RobotState>();

    onModuleInit(): void {
        this.loadRobots();
    }

    private loadRobots(): void {
        const filePath = join(process.cwd(), '..', 'data', 'robots.json');

        const file = readFileSync(filePath, 'utf-8');
        const roster: RobotRoster[] = JSON.parse(file);

        for (const robot of roster) {
            this.robots.set(robot.robot_id, {
                robot_id: robot.robot_id,
                robot_type: robot.robot_type,
                x: robot.start.x,
                y: robot.start.y,
                battery: 100,
                status: 'idle',
                lastSeen: Date.now(),
                sequence: 0,
            });
        }
    }


    updateRobot(update: RobotUpdateDto): RobotState {
        const existing = this.robots.get(update.robot_id);

        if (!existing) throw new Error(`Unknown robot: ${update.robot_id}`);

        if (update.sequence <= existing.sequence) return existing;

        const updated: RobotState = {
            ...existing,
            x: update.x,
            y: update.y,
            battery: update.battery,
            status: update.status as RobotState['status'],
            lastSeen: Date.now(),
            sequence: update.sequence,
        };

        this.robots.set(update.robot_id, updated);

        return updated;
    }

    processUpdates(updates: RobotUpdateDto[]): RobotState[] {
        return updates.map((update) => this.updateRobot(update));
    }

    getAllRobots(): RobotState[] {
        return Array.from(this.robots.values());
    }

    getRobot(robotId: string): RobotState | undefined {
        return this.robots.get(robotId);
    }

    isRobotStale(robot: RobotState): boolean {
        const STALE_THRESHOLD_MS = 15000;

        return Date.now() - robot.lastSeen > STALE_THRESHOLD_MS;
    }

    getAttentionRobots(): RobotState[] {
        return this.getAllRobots().filter((robot) => {
            return (
                this.isRobotStale(robot) ||
                robot.battery < 20 ||
                ['blocked', 'error', 'maintenance'].includes(robot.status)
            );
        });
    }
}
