import { ApiProperty } from '@nestjs/swagger';
import { ParticipantStatus } from '../../../../generated/prisma/enums.js';

export class SubmitParticipationResponseDto {
    @ApiProperty({ enum: ParticipantStatus, example: ParticipantStatus.SUBMITTED })
    participantStatus: ParticipantStatus;
}
