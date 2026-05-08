import { Type } from 'class-transformer';
import {
    IsArray,
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class BlockedSlotInputDto {
    @ApiProperty({ example: '2026-05-01' })
    @IsDateString({}, { message: '날짜 형식이 맞지 않습니다.' })
    date: string;

    @ApiProperty({ example: [30, 31] })
    @IsArray({ message: '불가능 시간 슬롯 인덱스 정보가 배열 형태가 아닙니다.' })
    @Type(() => Number)
    @IsInt({ each: true, message: '불가능 시간 슬롯 인덱스가 유효하지 않습니다.' })
    slotIndexes: number[];
}

class OriginInputDto {
    @ApiProperty({ example: '서울 강남구 강남대로 396' })
    @IsString({ message: '주소가 유효하지 않습니다.' })
    address: string;

    @ApiProperty({ example: 37.4979 })
    @Type(() => Number)
    @IsNumber({}, { message: '위도가 유효하지 않습니다.' })
    lat: number;

    @ApiProperty({ example: 127.0276 })
    @Type(() => Number)
    @IsNumber({}, { message: '경도가 유효하지 않습니다.' })
    lng: number;
}

export class SubmitParticipationRequestDto {
    @ApiProperty({ type: [BlockedSlotInputDto] })
    @IsOptional()
    @IsArray({ message: '불가능 시간 슬롯 정보가 배열 형태가 아닙니다.' })
    @ValidateNested({ each: true })
    @Type(() => BlockedSlotInputDto)
    blockedSlots: BlockedSlotInputDto[];

    @ApiProperty({ type: OriginInputDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => OriginInputDto)
    origin?: OriginInputDto;
}
