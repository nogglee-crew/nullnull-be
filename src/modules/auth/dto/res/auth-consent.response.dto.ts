import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponseDto } from '../../../../common/dto/response.dto.js';

class AuthConsentDataDto {
    @ApiProperty({ example: false })
    consentRequired!: boolean;
}

export class AuthConsentResponseDto extends SuccessResponseDto {
    @ApiProperty({ type: AuthConsentDataDto })
    data!: AuthConsentDataDto;
}
