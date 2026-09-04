import { IsNumber, IsString, Max, Min, IsIn, IsOptional } from "class-validator";
export class RobotUpdateDto {
    @IsString()
    robot_id: string;

    @IsNumber()
    x: number;

    @IsNumber()
    y: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    battery: number;

    @IsString()
    @IsIn(["idle", "active", "on_mission", "charging", "blocked", "error", "maintenance", "offline"])
    status: string;

    @IsNumber()
    sequence: number;

    @IsOptional()
    @IsString()
    payload?: string;
}