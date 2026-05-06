import {
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
    UseFilters,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ApiAuthConsent, ApiAuthSync } from '../../swagger/auth.swagger.js';
import { type AuthConsentRequestDto } from './dto/req/auth-consent.request.dto.js';
import { type AuthSyncRequestDto } from './dto/req/auth-sync.request.dto.js';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuccessResponseInterceptor } from '../../common/interceptor/success-response.interceptor.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { AuthSyncResponseDto } from './dto/res/auth-sync.response.dto.js';
import { ApiCustomResponseDecorator } from '../../common/utils/decorators/api-custom-response.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import CustomResponse from '../../common/response/custom-response.js';

@ApiTags('인증(Auth)')
@ApiBearerAuth('accessToken')
@Controller('/auth')
@UseInterceptors(SuccessResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class AuthController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    @ApiOperation({
        summary: '사용자 동기화 API',
        description: '로그인한 사용자 정보를 동기화합니다.',
    })
    @ApiHeader({
        name: 'cookie',
        required: false,
        description:
            '선택값. 비회원 참여 이력이 있으면 `participant_uuid_{roomSlug}` 쿠키가 자동 전송됩니다.',
    })
    @ApiAuthSync()
    @ApiCustomResponseDecorator(AuthSyncResponseDto, {
        statusCode: HttpStatus.OK,
        message: '사용자 동기화가 완료되었습니다.',
        path: '/auth/sync',
    })
    @HttpCode(HttpStatus.OK)
    @Post('sync')
    async sync(
        @Headers() headers: AuthSyncRequestDto,
    ): Promise<CustomResponse<AuthSyncResponseDto>> {
        const participantUuids = this.authService.extractParticipantUuids(headers.cookie);
        const result = await this.authService.syncUser(headers.authorization, participantUuids);

        return new CustomResponse<AuthSyncResponseDto>(result, '사용자 동기화가 완료되었습니다.');
    }

    @Post('consent')
    @UseGuards(JwtAuthGuard)
    @HttpCode(200)
    @ApiAuthConsent()
    async consent(
        @Headers() headers: AuthConsentRequestDto,
    ): Promise<CustomResponse<{ consentRequired: boolean }>> {
        await this.authService.recordConsent(headers.authorization);

        return new CustomResponse({ consentRequired: false }, '약관 동의가 완료되었습니다.');
    }
}
