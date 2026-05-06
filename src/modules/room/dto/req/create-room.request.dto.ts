import {
    IsString,
    IsOptional,
    IsEnum,
    IsArray,
    IsBoolean,
    IsISO8601,
    Length,
    MaxLength,
    ArrayMinSize,
    IsDateString,
    Matches,
} from 'class-validator';
import { RoomCategory } from '../../../../generated/prisma/enums.js';

export class CreateRoomRequestDto {
    @IsString()
    @Length(2, 40)
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    description?: string;

    @IsEnum(RoomCategory)
    category: RoomCategory;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsISO8601()
    deadlineAt: string;

    @IsDateString()
    dateStart: string;

    @IsDateString()
    dateEnd: string;

    @IsArray()
    @IsEnum([0, 1, 2, 3, 4, 5, 6], { each: true })
    @ArrayMinSize(1)
    availableDays: number[];

    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'timeStart must be in HH:mm format' })
    timeStart: string;

    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'timeEnd must be in HH:mm format' })
    timeEnd: string;

    @IsBoolean()
    @IsOptional()
    collectOrigin?: boolean = false;
}
