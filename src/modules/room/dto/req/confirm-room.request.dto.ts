import { IsInt, IsOptional, Min } from 'class-validator';

export class ConfirmRoomRequestDto {
    @IsInt()
    @Min(1)
    timeCandidateId: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    placeCandidateId?: number | null;
}
