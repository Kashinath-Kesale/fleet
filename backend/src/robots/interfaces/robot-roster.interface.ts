export interface RobotRoster {
    robot_id: string,
    robot_type: 'picker' | 'hauler';
    start: {
        x: number;
        y: number;
    };
}