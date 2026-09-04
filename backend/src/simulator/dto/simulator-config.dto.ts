import { isInt, IsInt, IsNumber, IsOptional, Min } from "class-validator";


export class SimulatorConfigDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    fleetSize?: number;

    @IsOptional()
    @IsNumber()
    @Min(100)
    updateInterval?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    payloadSize?: number;
}