import { ApiProperty } from '@nestjs/swagger';

export class AuthConsentResponseDto {
    @ApiProperty({ example: false })
    consentRequired: boolean;
}
