import {
    Body,
    Controller,
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
import { type CreateRoomRequestDto } from './dto/req/create-room.request.dto.js';
import { CreateRoomResponseDto } from './dto/res/create-room.response.dto.js';
import CustomResponse from '../../common/response/custom-response.js';
import { SuccessResponseInterceptor } from '../../common/interceptor/success-response.interceptor.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { ApiCustomResponseDecorator } from '../../common/utils/decorators/api-custom-response.decorator.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

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
        @Req() req: any,
        @Body() body: CreateRoomRequestDto,
    ): Promise<CustomResponse<CreateRoomResponseDto>> {
        const hostId = req.user.userId;

        const result = await this.roomService.createRoom(hostId, body);

        return new CustomResponse<CreateRoomResponseDto>(result, '방이 생성되었습니다.');
    }
}
