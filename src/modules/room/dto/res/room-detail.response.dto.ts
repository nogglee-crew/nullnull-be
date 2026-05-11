import { ApiProperty } from '@nestjs/swagger';
import {
    type RoomCategory,
    type RoomStatus,
    type ParticipantStatus,
    type ClosedFromStatus,
    type ClosedTrigger,
} from '../../../../generated/prisma/enums.js';

export class RoomDetailResponseDto {
    @ApiProperty({ description: '조회자 정보' })
    viewer: {
        role: 'HOST' | 'MEMBER' | 'GUEST';
        participantId: number | null;
        participantStatus: ParticipantStatus | null;
        nickname: string | null;
        consentRequired: boolean;
    };

    @ApiProperty({ description: '방 기본 정보' })
    room: {
        slug: string;
        name: string;
        description: string | null;
        category: RoomCategory;
        status: RoomStatus;
        hostNickname: string;
        badge: string;
        text: string;
        dateStart: string;
        dateEnd: string;
        availableDays: number[];
        timeStart: string;
        timeEnd: string;
        collectOrigin: boolean;
        deadlineAt: string;
    };

    @ApiProperty({ description: '참여 현황 요약' })
    summary: {
        totalCount: number;
        submittedCount: number;
        declinedCount: number;
        joinedCount: number;
        submittedRatio: number;
    };

    @ApiProperty({ description: '참여자 명단' })
    participants: {
        submitted: string[];
        declined: string[];
        joined: string[];
    };

    @ApiProperty({ description: '나의 제출 정보 (GUEST인 경우 null)' })
    mySubmission: {
        nickname: string;
        status: ParticipantStatus;
        blockedSlots: { date: string; slotIndex: number }[];
        origin: { address: string } | null;
    } | null;

    @ApiProperty({ description: '확정된 약속 정보 (확정 전이면 null)' })
    confirmedMeeting: {
        startAt: string;
        endAt: string;
        place: { name: string; address: string } | null;
        confirmedCount: number;
    } | null;

    @ApiProperty({ description: '종료 정보 (종료 전이면 null)' })
    closed: {
        closedAt: string;
        closedFromStatus: ClosedFromStatus;
        closedTrigger: ClosedTrigger;
    } | null;
}
