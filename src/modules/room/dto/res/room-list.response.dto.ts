import { ApiProperty } from '@nestjs/swagger';
import { RoomCategory, RoomStatus } from '../../../../generated/prisma/enums.js';

export class RoomListItemDto {
    @ApiProperty()
    roomId: number;

    @ApiProperty()
    slug: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ enum: RoomCategory })
    category: RoomCategory;

    @ApiProperty({ enum: RoomStatus })
    status: RoomStatus;

    @ApiProperty({ enum: ['HOST', 'MEMBER'] })
    myRole: 'HOST' | 'MEMBER';

    @ApiProperty()
    hostNickname: string;

    @ApiProperty()
    participantCount: number;

    @ApiProperty()
    submittedCount: number;

    @ApiProperty()
    submittedRatio: number;

    @ApiProperty({ nullable: true })
    confirmedMeeting: {
        startAt: string;
        placeName: string | null;
    } | null;

    @ApiProperty()
    dateStart: string;

    @ApiProperty()
    dateEnd: string;

    @ApiProperty()
    deadlineAt: string;

    @ApiProperty()
    createdAt: string;
}

export class RoomListResponseDto {
    @ApiProperty()
    totalCount: number;

    @ApiProperty({ type: [RoomListItemDto] })
    rooms: RoomListItemDto[];
}
