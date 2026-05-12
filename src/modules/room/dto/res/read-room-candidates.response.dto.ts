import { ApiProperty } from '@nestjs/swagger';

export class UnavailableParticipantResponseDto {
    @ApiProperty({ example: 12 })
    participantId: number;

    @ApiProperty({ example: '난방 고양이' })
    nickname: string;
}

export class TimeCandidateResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: '2026-05-18' })
    date: string;

    @ApiProperty({ example: '19:00' })
    startAt: string;

    @ApiProperty({ example: '19:30' })
    endAt: string;

    @ApiProperty({ example: 3 })
    availableCount: number;

    @ApiProperty({ example: 30 })
    durationMinutes: number;

    @ApiProperty({ example: 1 })
    rank: number;

    @ApiProperty({ type: [UnavailableParticipantResponseDto] })
    unavailableParticipants: UnavailableParticipantResponseDto[];
}

export class PlaceCandidateResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: '오낫티' })
    name: string;

    @ApiProperty({ example: '서울 용산구 서빙고로 413' })
    address: string;

    @ApiProperty({ example: 37.5271911 })
    latitude: number;

    @ApiProperty({ example: 127.004308 })
    longitude: number;

    @ApiProperty({ example: 1 })
    rank: number;
}

export class ReadRoomCandidatesResponseDto {
    @ApiProperty({ example: 3 })
    submittedParticipantCount: number;

    @ApiProperty({ type: [TimeCandidateResponseDto] })
    timeCandidates: TimeCandidateResponseDto[];

    @ApiProperty({ type: [PlaceCandidateResponseDto] })
    placeCandidates: PlaceCandidateResponseDto[];
}
