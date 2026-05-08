import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    Post,
    Req,
    Res,
    UseFilters,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/guard/optional-jwt-auth.guard.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { SuccessResponseInterceptor } from '../../common/interceptor/success-response.interceptor.js';
import { ApiCustomResponseDecorator } from '../../common/utils/decorators/api-custom-response.decorator.js';
import CustomResponse from '../../common/response/custom-response.js';
import { type JoinParticipantRequestDto } from './dto/req/join-participant.request.dto.js';
import { JoinParticipantResponseDto } from './dto/res/join-participant.response.dto.js';
import { ParticipantsService } from './participants.service.js';
import { ApiJoinParticipantErrorResponses } from '../../swagger/participant.swagger.js';
import { type OptionalAuthenticatedRequest } from '../../common/type/auth-request.interface.js';

@ApiTags('참여자(Participants)')
@ApiBearerAuth('accessToken')
@Controller('/rooms/:roomId/participants')
@UseInterceptors(SuccessResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class ParticipantsController {
    constructor(
        @Inject(ParticipantsService) private readonly participantsService: ParticipantsService,
    ) {}

    @ApiOperation({
        summary: '방 참여하기 API',
        description: '회원 또는 비회원 사용자를 방의 참여자로 등록합니다.',
    })
    @ApiHeader({
        name: 'cookie',
        required: false,
        description:
            '선택값. 비회원 참여 이력이 있으면 `participant_uuid_{roomSlug}` 쿠키가 자동 전송됩니다.',
    })
    @ApiCustomResponseDecorator(JoinParticipantResponseDto, {
        message: '참여자 등록이 완료되었습니다.',
        path: '/rooms/1/participants',
    })
    @ApiJoinParticipantErrorResponses()
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post()
    async joinRoom(
        @Param('roomId') roomId: string,
        @Req() req: OptionalAuthenticatedRequest,
        @Headers('cookie') cookie: string | undefined,
        @Body() body: JoinParticipantRequestDto,
        @Res({ passthrough: true }) response: any,
    ): Promise<CustomResponse<JoinParticipantResponseDto>> {
        const result = await this.participantsService.joinRoom(roomId, body, req.authUser, cookie);

        if (result.issuedParticipantUuid && result.roomSlug) {
            response.cookie(`participant_uuid_${result.roomSlug}`, result.issuedParticipantUuid, {
                httpOnly: true,
            });
        }

        return new CustomResponse<JoinParticipantResponseDto>(
            result.data,
            '참여자 등록이 완료되었습니다.',
        );
    }
}
