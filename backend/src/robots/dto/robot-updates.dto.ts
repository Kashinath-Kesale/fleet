import { Type } from 'class-transformer';
import { ValidateNested, ArrayMinSize, Validate } from 'class-validator';
import { RobotUpdateDto } from './robot-update.dto';

export class RobotUpdatesDto {
    @ValidateNested({ each: true })
    @Type(() => RobotUpdateDto)
    @ArrayMinSize(1)
    updates: RobotUpdateDto[];
}