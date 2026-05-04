import { Injectable, HttpStatus } from '@nestjs/common';
import { nanoid } from 'nanoid';

import { type CreateRoomRequestDto } from './dto/req/create-room.request.dto.js';
import { type CreateRoomResponseDto } from './dto/res/create-room.response.dto.js';
import { AppException } from '../../common/exception/app.exception.js';
import { ErrorCode } from '../../common/exception/error-codes.js';
import { type PrismaService } from '../../database/prisma.service.js';
import { ParticipantRole, ParticipantStatus, RoomStatus } from '../../generated/prisma/enums.js';
import { TimeUtil } from '../../common/utils/time.util.js';

@Injectable()
export class RoomService {
    constructor(private readonly prisma: PrismaService) {}

    // 방 생성 로직
    async createRoom(hostId: string, body: CreateRoomRequestDto): Promise<CreateRoomResponseDto> {
        const { name, dateStart, dateEnd, timeStart, timeEnd, deadlineAt } = body;

        // 1. 시간 데이터 KST 변환 및 기준점 계산
        const nowKst = TimeUtil.nowKst();
        const startKst = TimeUtil.startOfKstDate(dateStart);
        const endKst = TimeUtil.startOfKstDate(dateEnd);
        const deadlineKst = TimeUtil.toDayjsKst(deadlineAt);

        // 2-1. 날짜 범위 검증 (시작일 <= 종료일)
        if (startKst.isAfter(endKst)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '시작일은 종료일보다 빨라야 합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 2-2. 마감 시간 검증 (현재 시간 < 마감 시간)
        if (deadlineKst.isBefore(nowKst)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '마감일은 현재 시간 이후여야 합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 2-3. 마감 시간 검증 (마감 시간 < 방 시작 날짜)
        if (deadlineKst.isAfter(startKst) || deadlineKst.isSame(startKst)) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '마감일은 방 시작 날짜 이전이어야 합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 2-4. 시간대 검증 (30분 단위 인덱싱 규칙 준수 확인)
        if (
            !TimeUtil.isValidThirtyMinuteStep(timeStart) ||
            !TimeUtil.isValidThirtyMinuteStep(timeEnd)
        ) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '시간은 30분 단위(00분 또는 30분)로만 설정 가능합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 2-5. 시간대 선후 검증 (시작 시간 < 종료 시간)
        if (timeStart >= timeEnd) {
            throw new AppException(
                HttpStatus.BAD_REQUEST,
                '시작 시간은 종료 시간보다 빨라야 합니다.',
                ErrorCode.INVALID_ROOM_INPUT,
            );
        }

        // 3. 고유 슬러그 생성
        const slug = nanoid(10);

        try {
            // 4. DB 저장 (트랜잭션: 방 생성 + 호스트 참여자 등록)
            const result = await this.prisma.$transaction(async (tx) => {
                const room = await tx.room.create({
                    data: {
                        hostId,
                        slug,
                        name: name,
                        description: body.description,
                        category: body.category,
                        status: RoomStatus.COLLECTING,
                        dateStart: startKst.toDate(),
                        dateEnd: endKst.toDate(),
                        availableDays: body.availableDays as any, // JSON 타입 대응
                        timeStart: TimeUtil.parseTimeToDate(timeStart), // 30분 단위 시간 객체
                        timeEnd: TimeUtil.parseTimeToDate(timeEnd), // 30분 단위 시간 객체
                        deadlineAt: deadlineKst.toDate(),
                        collectOrigin: body.collectOrigin ?? false,
                    },
                });

                // 생성자를 HOST 역할의 참여자로 자동 등록
                await tx.participant.create({
                    data: {
                        roomId: room.roomId,
                        userId: hostId,
                        role: ParticipantRole.HOST,
                        status: ParticipantStatus.JOINED,
                        nickname: '방장',
                    },
                });

                return room;
            });

            return { slug: result.slug };
        } catch (error) {
            if (error instanceof AppException) throw error;

            console.error('Room Creation Failed:', error);
            throw new AppException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                '방 생성 중 오류가 발생했습니다.',
                ErrorCode.INTERNAL_SERVER_ERROR as any,
            );
        }
    }
}
