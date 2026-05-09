import {
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Inject,
    Req,
    UseFilters,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import CustomResponse from '../../common/response/custom-response.js';
import { SuccessResponseInterceptor } from '../../common/interceptor/success-response.interceptor.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { JwtAuthGuard } from './guard/jwt-auth.guard.js';
import { type AuthenticatedRequest } from '../../common/type/auth-request.interface.js';
import {
    ApiAccountWithdrawalErrorResponses,
    ApiAccountWithdrawalSuccessResponse,
} from '../../swagger/auth.swagger.js';

@ApiTags('내 정보(Me)')
@ApiBearerAuth('accessToken')
@Controller('/me')
@UseInterceptors(SuccessResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class MeController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    @ApiOperation({
        summary: '회원 탈퇴 API',
        description: '로그인 사용자가 자신의 계정을 탈퇴합니다.',
    })
    @ApiAccountWithdrawalSuccessResponse()
    @ApiAccountWithdrawalErrorResponses()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Delete()
    async withdraw(@Req() req: AuthenticatedRequest): Promise<CustomResponse<null>> {
        await this.authService.withdrawAccount(req.authUser.id);

        return new CustomResponse<null>(null, '회원 탈퇴가 완료되었습니다.');
    }
}
