import { Controller, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ApiAuthConsent, ApiAuthSync } from './auth.swagger.js';

@Controller('auth')
export class AuthController {
    constructor(
        @Inject(AuthService)
        private readonly authService: AuthService,
    ) {}

    @Post('sync')
    @HttpCode(200)
    @ApiAuthSync()
    async sync(
        @Headers('authorization') authorization: string,
        @Headers('cookie') cookie?: string,
    ) {
        const participantUuids = this.authService.extractParticipantUuids(cookie);
        const result = await this.authService.syncUser(authorization, participantUuids);

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
    async consent(@Headers('authorization') authorization: string) {
        await this.authService.recordConsent(authorization);

        return {
            message: '약관 동의가 완료되었습니다.',
            data: {
                consentRequired: false,
            },
        };
    }
}
