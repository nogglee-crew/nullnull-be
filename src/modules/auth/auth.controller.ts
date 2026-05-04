import { Controller, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ApiAuthConsent, ApiAuthSync } from '../../swagger/auth.swagger.js';
import { type AuthConsentRequestDto } from './dto/req/auth-consent.request.dto.js';
import { type AuthSyncRequestDto } from './dto/req/auth-sync.request.dto.js';

@Controller('auth')
export class AuthController {
    constructor(
        @Inject(AuthService)
        private readonly authService: AuthService,
    ) {}

    @Post('sync')
    @HttpCode(200)
    @ApiAuthSync()
    async sync(@Headers() headers: AuthSyncRequestDto) {
        const participantUuids = this.authService.extractParticipantUuids(headers.cookie);
        const result = await this.authService.syncUser(headers.authorization, participantUuids);

        return {
            message: '사용자 동기화가 완료되었습니다.',
            data: {
                user: {
                    userId: result.user.userId,
                    nickname: result.user.nickname,
                },
                consentRequired: result.consentRequired,
            },
        };
    }

    @Post('consent')
    @HttpCode(200)
    @ApiAuthConsent()
    async consent(@Headers() headers: AuthConsentRequestDto) {
        await this.authService.recordConsent(headers.authorization);

        return {
            message: '약관 동의가 완료되었습니다.',
            data: {
                consentRequired: false,
            },
        };
    }
}
