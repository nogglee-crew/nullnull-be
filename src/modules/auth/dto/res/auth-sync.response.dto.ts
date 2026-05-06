import { ApiProperty } from '@nestjs/swagger';

class AuthUserDto {
    @ApiProperty({ example: 'eb50a73f-785f-49ce-887b-5f0bba67a1e3' })
    userId: string;

    @ApiProperty({ example: '김개발' })
    nickname: string;
}

export class AuthSyncResponseDto {
    @ApiProperty({ type: AuthUserDto })
    user: AuthUserDto;

    @ApiProperty({ example: true })
    consentRequired: boolean;
}
