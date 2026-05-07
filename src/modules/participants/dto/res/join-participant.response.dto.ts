import { ApiProperty } from '@nestjs/swagger';

export class JoinParticipantResponseDto {
    @ApiProperty({ example: 1 })
    participantId: number;
}
