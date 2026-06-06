import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    Patch,
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
import { JoinParticipantRequestDto } from './dto/req/join-participant.request.dto.js';
import { SubmitParticipationRequestDto } from './dto/req/submit-participation.request.dto.js';
import { JoinParticipantResponseDto } from './dto/res/join-participant.response.dto.js';
import { ParticipantStatusResponseDto } from './dto/res/submit-participation.response.dto.js';
import { ParticipantsService } from './participants.service.js';
import {
    ApiDeclineParticipantErrorResponses,
    ApiJoinParticipantErrorResponses,
    ApiSubmitParticipationErrorResponses,
} from '../../swagger/participant.swagger.js';
import { type OptionalAuthenticatedRequest } from '../../common/type/auth-request.interface.js';
import type { Response } from 'express';

@ApiTags('참여자(Participants)')
@ApiBearerAuth('accessToken')
@Controller()
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
    @Post('/rooms/:roomId/participants')
    async joinRoom(
        @Param('roomId') roomId: string,
        @Req() req: OptionalAuthenticatedRequest,
        @Headers('cookie') cookie: string | undefined,
        @Body() body: JoinParticipantRequestDto,
        @Res({ passthrough: true }) response: Response,
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

    @ApiOperation({
        summary: '참여 정보 저장 API',
        description: '참여자가 자신의 불가능 시간과 출발지를 제출하거나 수정합니다.',
    })
    @ApiHeader({
        name: 'cookie',
        required: false,
        description:
            '선택값. 비회원 참여자인 경우 `participant_uuid_{roomSlug}` 쿠키로 수정 권한을 확인합니다.',
    })
    @ApiCustomResponseDecorator(ParticipantStatusResponseDto, {
        message: '참여 정보가 저장되었습니다.',
        path: '/participants/1/participation',
    })
    @ApiSubmitParticipationErrorResponses()
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Patch('/participants/:participantId/participation')
    async submitParticipation(
        @Param('participantId') participantId: string,
        @Req() req: OptionalAuthenticatedRequest,
        @Headers('cookie') cookie: string | undefined,
        @Body() body: SubmitParticipationRequestDto,
    ): Promise<CustomResponse<ParticipantStatusResponseDto>> {
        const result = await this.participantsService.submitParticipation(
            participantId,
            body,
            req.authUser,
            cookie,
        );

        return new CustomResponse<ParticipantStatusResponseDto>(
            result,
            '참여 정보가 저장되었습니다.',
        );
    }

    @ApiOperation({
        summary: '불참 처리 API',
        description: '참여자가 해당 방에 대해 불참 의사를 표시합니다.',
    })
    @ApiHeader({
        name: 'cookie',
        required: false,
        description:
            '선택값. 비회원 참여자인 경우 `participant_uuid_{roomSlug}` 쿠키로 처리 권한을 확인합니다.',
    })
    @ApiCustomResponseDecorator(ParticipantStatusResponseDto, {
        message: '불참 처리되었습니다.',
        path: '/participants/1/decline',
    })
    @ApiDeclineParticipantErrorResponses()
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Patch('/participants/:participantId/decline')
    async declineParticipant(
        @Param('participantId') participantId: string,
        @Req() req: OptionalAuthenticatedRequest,
        @Headers('cookie') cookie: string | undefined,
    ): Promise<CustomResponse<ParticipantStatusResponseDto>> {
        const result = await this.participantsService.declineParticipant(
            participantId,
            req.authUser,
            cookie,
        );

        return new CustomResponse<ParticipantStatusResponseDto>(result, '불참 처리되었습니다.');
    }
}
