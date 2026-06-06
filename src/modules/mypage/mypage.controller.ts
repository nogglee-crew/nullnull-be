import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Inject,
    Patch,
    Req,
    UseFilters,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { SuccessResponseInterceptor } from '../../common/interceptor/success-response.interceptor.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { MypageService } from './mypage.service.js';
import CustomResponse from '../../common/response/custom-response.js';
import { UpdateMeResponseDto } from './dto/res/update-me.response.dto.js';
import { UpdateMeRequestDto } from './dto/req/update-me.request.dto.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { User as PrismaUser } from '../../generated/prisma/client.js';
import type { AuthenticatedRequest } from '../../common/type/auth-request.interface.js';
import {
    ApiUpdateMeErrorResponses,
    ApiUpdateMeSuccessResponse,
} from '../../swagger/mypage.swagger.js';

@ApiTags('개인 정보')
@ApiBearerAuth('accessToken')
@Controller('/me')
@UseInterceptors(SuccessResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class MypageController {
    constructor(@Inject(MypageService) private readonly mypageService: MypageService) {}

    @ApiOperation({ summary: '내닉네임 변경 API' })
    @ApiUpdateMeSuccessResponse()
    @ApiUpdateMeErrorResponses()
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Patch()
    async updateMe(
        @Req() req: AuthenticatedRequest,
        @Body() body: UpdateMeRequestDto,
    ): Promise<CustomResponse<UpdateMeResponseDto>> {
        const updatedUser: PrismaUser = await this.mypageService.updateNickname(
            req.authUser.id,
            body.nickname,
        );

        return new CustomResponse(
            {
                user: {
                    id: updatedUser.userId,
                    nickname: updatedUser.nickname,
                },
            },
            '닉네임이 수정되었습니다.',
        );
    }
}
