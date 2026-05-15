import { ApiProperty } from '@nestjs/swagger';

export class UpdateMeResponseDto {
    @ApiProperty()
    user: {
        id: string;
        nickname: string;
    };
}
