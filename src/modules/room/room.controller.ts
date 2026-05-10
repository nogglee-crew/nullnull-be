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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RoomService } from './room.service.js';
import { CreateRoomRequestDto } from './dto/req/create-room.request.dto.js';
import { CreateRoomResponseDto } from './dto/res/create-room.response.dto.js';
import CustomResponse from '../../common/response/custom-response.js';
import { SuccessResponseInterceptor } from '../../common/interceptor/success-response.interceptor.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { ApiCustomResponseDecorator } from '../../common/utils/decorators/api-custom-response.decorator.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { type AuthenticatedRequest } from '../../common/type/auth-request.interface.js';
import {
    ApiReadyRoomErrorResponses,
    ApiReadyRoomSuccessResponse,
} from '../../swagger/room.swagger.js';
import { ParseBigIntPipe } from '../../common/type/parse-bigint.pipe.js';

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
}
