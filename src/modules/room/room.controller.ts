import {
    Body,
    Controller,
    Param,
    Post,
    UseGuards,
    UseInterceptors,
    UseFilters,
    HttpStatus,
    HttpCode,
    Req,
    Inject,
    Get,
    Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoomService } from './room.service.js';
import { ConfirmRoomRequestDto } from './dto/req/confirm-room.request.dto.js';
import { CreateRoomRequestDto } from './dto/req/create-room.request.dto.js';
import { CreateRoomResponseDto } from './dto/res/create-room.response.dto.js';
import { ReadRoomCandidatesResponseDto } from './dto/res/read-room-candidates.response.dto.js';
import CustomResponse from '../../common/response/custom-response.js';
import { SuccessResponseInterceptor } from '../../common/interceptor/success-response.interceptor.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { ApiCustomResponseDecorator } from '../../common/utils/decorators/api-custom-response.decorator.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { RoomDetailResponseDto } from './dto/res/room-detail.response.dto.js';
import { OptionalJwtAuthGuard } from '../auth/guard/optional-jwt-auth.guard.js';
import { type AuthenticatedRequest } from '../../common/type/auth-request.interface.js';
import {
    ApiConfirmRoomErrorResponses,
    ApiReadRoomCandidatesErrorResponses,
    ApiReadyRoomErrorResponses,
    ApiReadyRoomSuccessResponse,
    ApiConfirmRoomSuccessResponse,
} from '../../swagger/room.swagger.js';
import { ParseBigIntPipe } from '../../common/type/parse-bigint.pipe.js';
import { CookieUtil } from '../../common/utils/cookie.util.js';

@ApiTags('방(Room)')
@ApiBearerAuth('accessToken')
@Controller('/rooms')
@UseInterceptors(SuccessResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class RoomController {
    constructor(@Inject(RoomService) private readonly roomService: RoomService) {}

    @ApiOperation({
        summary: '새로운 방 생성 API',
        description: '로그인한 사용자가 새로운 약속 방을 생성하고 HOST 권한을 가집니다.',
    })
    @ApiCustomResponseDecorator(CreateRoomResponseDto)
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Post()
    async createRoom(
        @Req() req: AuthenticatedRequest,
        @Body() body: CreateRoomRequestDto,
    ): Promise<CustomResponse<CreateRoomResponseDto>> {
        const hostId = req.authUser.id;

        const result = await this.roomService.createRoom(hostId, body);

        return new CustomResponse<CreateRoomResponseDto>(result, '방이 생성되었습니다.');
    }

    @ApiOperation({
        summary: '방 상세 정보 조회 API',
        description:
            '공유 링크(slug)를 통해 방의 상세 정보 및 나의 참여 상태를 조회합니다. 로그인 여부 및 쿠키에 따라 역할이 판별됩니다.',
    })
    @ApiCustomResponseDecorator(RoomDetailResponseDto)
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Get('/:slug')
    async getRoomDetail(
        @Param('slug') slug: string,
        @Req() req: AuthenticatedRequest,
        @Headers('cookie') cookieHader: string | undefined,
    ): Promise<CustomResponse<RoomDetailResponseDto>> {
        const participantUuid = CookieUtil.getCookie(
            cookieHader,
            CookieUtil.getParticipantCookieKey(slug),
        );

        const result = await this.roomService.getRoomDetail(slug, req.authUser, participantUuid);

        return new CustomResponse<RoomDetailResponseDto>(result, '방 조회에 성공했습니다.');
    }

    @ApiOperation({
        summary: '방 마감 및 후보 생성 API',
        description: '방장이 참여자 입력 수집을 마감하고 시간/장소 후보를 생성합니다.',
    })
    @ApiReadyRoomSuccessResponse()
    @ApiReadyRoomErrorResponses()
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Post('/:roomId/ready')
    async readyRoom(
        @Param('roomId', ParseBigIntPipe) roomId: bigint,
        @Req() req: AuthenticatedRequest,
    ): Promise<CustomResponse<null>> {
        await this.roomService.readyRoom(roomId, req.authUser.id);

        return new CustomResponse<null>(null, '방이 마감되었습니다.');
    }

    @ApiOperation({
        summary: '확정 후보 조회 API',
        description: '방장이 READY 상태의 방에서 시간/장소 후보를 조회합니다.',
    })
    @ApiCustomResponseDecorator(ReadRoomCandidatesResponseDto, {
        message: '확정 후보 조회에 성공했습니다.',
        path: '/rooms/1/candidates',
    })
    @ApiReadRoomCandidatesErrorResponses()
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Get('/:roomId/candidates')
    async readRoomCandidates(
        @Param('roomId', ParseBigIntPipe) roomId: bigint,
        @Req() req: AuthenticatedRequest,
    ): Promise<CustomResponse<ReadRoomCandidatesResponseDto>> {
        const result = await this.roomService.readRoomCandidates(roomId, req.authUser.id);

        return new CustomResponse<ReadRoomCandidatesResponseDto>(
            result,
            '확정 후보 조회에 성공했습니다.',
        );
    }

    @ApiOperation({
        summary: '방 확정 API',
        description: '방장이 READY 상태의 방에서 시간/장소 후보를 선택해 약속을 확정합니다.',
    })
    @ApiConfirmRoomSuccessResponse()
    @ApiConfirmRoomErrorResponses()
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @Post('/:roomId/confirm')
    async confirmRoom(
        @Param('roomId', ParseBigIntPipe) roomId: bigint,
        @Body() body: ConfirmRoomRequestDto,
        @Req() req: AuthenticatedRequest,
    ): Promise<CustomResponse<null>> {
        await this.roomService.confirmRoom(roomId, req.authUser.id, body);

        return new CustomResponse<null>(null, '약속이 확정되었습니다.');
    }
}
