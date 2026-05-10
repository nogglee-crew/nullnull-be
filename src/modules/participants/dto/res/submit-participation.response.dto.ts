import { ApiProperty } from '@nestjs/swagger';
import { ParticipantStatus } from '../../../../generated/prisma/enums.js';

export class ParticipantStatusResponseDto {
    @ApiProperty({ enum: ParticipantStatus, example: ParticipantStatus.SUBMITTED })
    participantStatus: ParticipantStatus;
}
