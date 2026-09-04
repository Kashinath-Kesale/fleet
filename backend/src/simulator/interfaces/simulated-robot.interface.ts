import { RobotStatus } from "src/robots/interfaces/robot-state.interface";

export interface SimulatedRobot {
    robot_id: string;
    robot_type: 'picker' | 'hauler';

    x: number;
    y: number;

    battery: number;
    status: RobotStatus;

    sequence: number;

    targetX: number;
    targetY: number;
}