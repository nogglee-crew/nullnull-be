import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinParticipantRequestDto {
    @ApiProperty({ example: '김개발' })
    @IsString({ message: '모임에 참여하기 위해 닉네임을 입력해 주세요.' })
    nickname: string;
}
