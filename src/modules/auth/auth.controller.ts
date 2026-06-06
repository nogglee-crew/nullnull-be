import {
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
    Req,
    UseFilters,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import {
    ApiAuthConsentErrorResponses,
    ApiAuthSyncErrorResponses,
} from '../../swagger/auth.swagger.js';
import { type AuthSyncRequestDto } from './dto/req/auth-sync.request.dto.js';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuccessResponseInterceptor } from '../../common/interceptor/success-response.interceptor.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { AuthConsentResponseDto } from './dto/res/auth-consent.response.dto.js';
import { AuthSyncResponseDto } from './dto/res/auth-sync.response.dto.js';
import { ApiCustomResponseDecorator } from '../../common/utils/decorators/api-custom-response.decorator.js';
import { JwtAuthGuard } from './guard/jwt-auth.guard.js';
import CustomResponse from '../../common/response/custom-response.js';
import { type AuthenticatedRequest } from '../../common/type/auth-request.interface.js';

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
    @ApiCustomResponseDecorator(AuthSyncResponseDto, {
        message: '사용자 동기화가 완료되었습니다.',
        path: '/auth/sync',
    })
    @ApiAuthSyncErrorResponses()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('sync')
    async sync(
        @Req() req: AuthenticatedRequest,
        @Headers() headers: AuthSyncRequestDto,
    ): Promise<CustomResponse<AuthSyncResponseDto>> {
        const { cookie } = headers;
        const participantUuids = this.authService.extractParticipantUuids(cookie);
        const result = await this.authService.syncUser(req.authUser, participantUuids);

        return new CustomResponse<AuthSyncResponseDto>(result, '사용자 동기화가 완료되었습니다.');
    }

    @ApiOperation({
        summary: '약관 동의 API',
        description: '로그인한 사용자의 약관 동의를 기록합니다.',
    })
    @UseGuards(JwtAuthGuard)
    @ApiAuthConsentErrorResponses()
    @ApiCustomResponseDecorator(AuthConsentResponseDto, {
        message: '약관 동의가 완료되었습니다.',
        path: '/auth/consent',
    })
    @HttpCode(HttpStatus.OK)
    @Post('consent')
    async consent(
        @Req() req: AuthenticatedRequest,
    ): Promise<CustomResponse<AuthConsentResponseDto>> {
        const result = await this.authService.recordConsent(req.authUser);

        return new CustomResponse<AuthConsentResponseDto>(result, '약관 동의가 완료되었습니다.');
    }
}
