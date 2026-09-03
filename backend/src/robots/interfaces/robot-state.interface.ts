export type RobotStatus =
    | 'idle'
    | 'active'
    | 'on_mission'
    | 'charging'
    | 'blocked'
    | 'error'
    | 'maintenance'
    | 'offline';


export interface RobotState {
    robot_id: string;
    robot_type: 'picker' | 'hauler';
    x: number;
    y: number;
    battery: number;
    status: RobotStatus;
    lastSeen: number;
}